import { useCallback, useMemo, useState, useEffect } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MiniMap,
  ReactFlowProvider,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { ExecutionTreeNodeResponse, GraphStructure, ExecutionFlow } from '../types'

// Legend component
function Legend() {
  const [position, setPosition] = useState({ x: 20, y: 20 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div
      className="absolute bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50 select-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        onMouseDown={handleMouseDown}
        className="font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-300 dark:border-gray-700"
      >
        Edge Types
      </div>
      <div className="space-y-3">
        {/* Graph Structure Edge */}
        <div className="flex items-center gap-3">
          <svg width="40" height="12" className="flex-shrink-0">
            <line
              x1="0"
              y1="6"
              x2="32"
              y2="6"
              stroke="#3B82F6"
              strokeWidth="2.2"
            />
            <polygon points="32,6 27,4 27,8" fill="#3B82F6" />
          </svg>
          <span className="text-sm text-gray-700 dark:text-gray-300">Graph Edge</span>
        </div>

        {/* Conditional Edge */}
        <div className="flex items-center gap-3">
          <svg width="40" height="12" className="flex-shrink-0">
            <line
              x1="0"
              y1="6"
              x2="32"
              y2="6"
              stroke="#F59E0B"
              strokeWidth="2.5"
              strokeDasharray="5,5"
            />
            <polygon points="32,6 27,4 27,8" fill="#F59E0B" />
          </svg>
          <span className="text-sm text-gray-700 dark:text-gray-300">Conditional</span>
        </div>

        {/* Hierarchical Edge */}
        <div className="flex items-center gap-3">
          <svg width="40" height="12" className="flex-shrink-0">
            <line
              x1="0"
              y1="6"
              x2="32"
              y2="6"
              stroke="#A0A0A0"
              strokeWidth="1.2"
              strokeDasharray="4,4"
              opacity="0.6"
            />
            <polygon points="32,6 27,4 27,8" fill="#A0A0A0" opacity="0.6" />
          </svg>
          <span className="text-sm text-gray-700 dark:text-gray-300">Hierarchical</span>
        </div>

        {/* Sequential Edge */}
        <div className="flex items-center gap-3">
          <svg width="40" height="12" className="flex-shrink-0">
            <line
              x1="0"
              y1="6"
              x2="32"
              y2="6"
              stroke="#16A34A"
              strokeWidth="2"
            />
            <polygon points="32,6 27,4 27,8" fill="#16A34A" />
          </svg>
          <span className="text-sm text-gray-700 dark:text-gray-300">Sequential</span>
        </div>
      </div>
    </div>
  )
}

interface FlowGraphProps {
  nodes: ExecutionTreeNodeResponse[]
  graphStructure?: GraphStructure | null
  executionFlow?: ExecutionFlow | null
  onNodeSelect?: (node: ExecutionTreeNodeResponse) => void
  selectedNodeId?: string
}

// Color mapping for event types
const EVENT_TYPE_COLORS: Record<string, { bg: string; border: string }> = {
  llm_call: {
    bg: '#DBEAFE',
    border: '#3B82F6',
  },
  tool_call: {
    bg: '#DCFCE7',
    border: '#16A34A',
  },
  agent_start: {
    bg: '#FED7AA',
    border: '#EA580C',
  },
  agent_end: {
    bg: '#FED7AA',
    border: '#EA580C',
  },
  chain_start: {
    bg: '#FED7AA',
    border: '#EA580C',
  },
  chain_end: {
    bg: '#FED7AA',
    border: '#EA580C',
  },
  error: {
    bg: '#FEE2E2',
    border: '#DC2626',
  },
  node_execution: {
    bg: '#E0E7FF',
    border: '#6366F1',
  },
}

function getEventTypeColor(eventType: string) {
  return EVENT_TYPE_COLORS[eventType] || {
    bg: '#F3F4F6',
    border: '#9CA3AF',
  }
}

// Shared function to get node display name - matches ExecutionTree logic
function getNodeDisplayName(node: ExecutionTreeNodeResponse): string {
  const data = node.data as any

  // Priority order for specific event types
  // For tool_call: prioritize tool_name
  if (node.event_type === 'tool_call') {
    if (data?.tool_name && typeof data.tool_name === 'string' && data.tool_name.trim()) {
      return String(data.tool_name)
    }
    if (data?.tool && typeof data.tool === 'string' && data.tool.trim()) {
      return String(data.tool)
    }
  }

  // For node_execution: prioritize node_name
  if (node.event_type === 'node_execution') {
    if (data?.node_name && typeof data.node_name === 'string' && data.node_name.trim()) {
      return String(data.node_name)
    }
  }

  // General priority order: name > tool_name > tool > function_name > function > node_name > model
  if (data?.name && typeof data.name === 'string' && data.name.trim()) {
    return String(data.name)
  }

  if (data?.tool_name && typeof data.tool_name === 'string' && data.tool_name.trim()) {
    return String(data.tool_name)
  }

  if (data?.tool && typeof data.tool === 'string' && data.tool.trim()) {
    return String(data.tool)
  }

  if (data?.function_name && typeof data.function_name === 'string' && data.function_name.trim()) {
    return String(data.function_name)
  }

  if (data?.function && typeof data.function === 'string' && data.function.trim()) {
    return String(data.function)
  }

  if (data?.node_name && typeof data.node_name === 'string' && data.node_name.trim()) {
    return String(data.node_name)
  }

  if (data?.model && typeof data.model === 'string' && data.model.trim()) {
    return String(data.model)
  }

  // Fallback: try to extract from relevant fields, excluding metadata, status, and ID fields
  if (node.event_type === 'node_execution' || node.event_type === 'tool_call') {
    const keys = Object.keys(data || {}).filter(k =>
      !['timestamp', 'event_id', 'run_id', 'agent_name', 'created_at', 'updated_at',
        'status', 'completed', 'success', 'error', 'result', 'output', 'input',
        'parent_event_id', 'latency_ms', 'duration_ms', 'cost', 'tokens_in', 'tokens_out'].includes(k)
    )

    // Look for string values that look like names
    for (const key of keys) {
      const value = data[key]
      if (typeof value === 'string' &&
          value.trim() &&
          value.length < 100 &&
          value.length > 0 &&
          !value.startsWith('{') &&
          !value.startsWith('[') &&
          !value.includes('uuid') &&
          !/^[a-f0-9-]{36}$/.test(value)) { // Exclude UUIDs
        return String(value)
      }
    }
  }

  // Fallback to event type
  const labels: Record<string, string> = {
    llm_call: 'LLM Call',
    tool_call: 'Tool Call',
    agent_start: 'Agent Start',
    agent_end: 'Agent End',
    chain_start: 'Chain Start',
    chain_end: 'Chain End',
    node_execution: 'Node Execution',
  }
  return labels[node.event_type] || node.event_type.replace(/_/g, ' ')
}

function buildGraphFromTree(
  treeNodes: ExecutionTreeNodeResponse[],
  executionFlow?: ExecutionFlow | null,
  graphStructure?: GraphStructure | null
): { nodes: Node[]; edges: Edge[]; nodeMap: Map<string, ExecutionTreeNodeResponse> } {
  const nodes: Node[] = []
  const edges: Edge[] = []
  const nodeMap = new Map<string, ExecutionTreeNodeResponse>()

  // Helper function to get node name for sequence matching
  function getNodeNameForSequence(node: ExecutionTreeNodeResponse): string {
    const data = node.data as any
    if (node.event_type === 'node_execution' && data?.node_name) {
      return String(data.node_name)
    }
    if (node.event_type === 'tool_call' && data?.tool_name) {
      return String(data.tool_name)
    }
    return getNodeDisplayName(node)
  }

  // Create sequence map from execution_flow.execution_order
  const sequenceMap = new Map<string, number>()
  let maxSequenceIndex = -1
  
  if (executionFlow?.execution_order) {
    executionFlow.execution_order.forEach((nodeName, index) => {
      sequenceMap.set(nodeName, index)
      maxSequenceIndex = Math.max(maxSequenceIndex, index)
    })
  }
  
  // Build sequence map from previous_event_id chain as fallback
  const previousEventMap = new Map<string, string>() // event_id -> previous_event_id
  const eventToNameMap = new Map<string, string>() // event_id -> node_name
  function collectNodeInfo(node: ExecutionTreeNodeResponse) {
    if (node.previous_event_id) {
      previousEventMap.set(node.event_id, node.previous_event_id)
    }
    const nodeName = getNodeNameForSequence(node)
    eventToNameMap.set(node.event_id, nodeName)
    if (node.children) {
      node.children.forEach(collectNodeInfo)
    }
  }
  treeNodes.forEach(collectNodeInfo)
  
  // Build sequence index from previous_event_id chain if execution_flow is not available
  if (maxSequenceIndex === -1 && previousEventMap.size > 0) {
    // Find root nodes (nodes without previous_event_id or whose previous_event_id is not in the tree)
    const rootNodeIds = new Set<string>()
    treeNodes.forEach(node => {
      const isRoot = !node.previous_event_id || !previousEventMap.has(node.previous_event_id)
      if (isRoot) {
        rootNodeIds.add(node.event_id)
      }
    })
    
    // Build sequence from root nodes following previous_event_id chain
    let sequenceIndex = 0
    for (const rootId of rootNodeIds) {
      let currentId = rootId
      while (currentId) {
        const nodeName = eventToNameMap.get(currentId)
        if (nodeName && !sequenceMap.has(nodeName)) {
          sequenceMap.set(nodeName, sequenceIndex)
          maxSequenceIndex = Math.max(maxSequenceIndex, sequenceIndex)
          sequenceIndex++
        }
        // Find next node in chain
        let nextId: string | undefined
        for (const [eventId, prevId] of previousEventMap.entries()) {
          if (prevId === currentId) {
            nextId = eventId
            break
          }
        }
        currentId = nextId || ''
      }
    }
  }

  // Helper function to get Y position based on sequence
  function getNodeYPosition(
    node: ExecutionTreeNodeResponse,
    eventType: string,
    sequenceMap: Map<string, number>,
    maxSequenceIndex: number
  ): number {
    // Dynamic vertical spacing based on graph size
    // For small graphs (< 5 nodes): 120px spacing
    // For medium graphs (5-20 nodes): 100px spacing
    // For large graphs (> 20 nodes): 80px spacing
    let VERTICAL_SPACING = 120
    if (maxSequenceIndex > 20) {
      VERTICAL_SPACING = 80
    } else if (maxSequenceIndex > 5) {
      VERTICAL_SPACING = 100
    }

    if (eventType === 'agent_start') {
      return 0  // Start at the top
    }
    if (eventType === 'agent_end') {
      return (maxSequenceIndex + 1) * VERTICAL_SPACING  // Proportional spacing
    }

    // Try to find sequence index by node name
    const nodeName = getNodeNameForSequence(node)
    const sequenceIndex = sequenceMap.get(nodeName) ?? -1

    if (sequenceIndex >= 0) {
      return sequenceIndex * VERTICAL_SPACING
    }

    // Fallback: use timestamp-based ordering for root nodes
    return VERTICAL_SPACING
  }

  function processNode(
    node: ExecutionTreeNodeResponse,
    xPos: number,
    yPos: number,
    parentId: string | null,
    depth: number
  ): number {
    const colors = getEventTypeColor(node.event_type || 'unknown')

    // Use the same naming logic as ExecutionTree
    const displayLabel = getNodeDisplayName(node)

    nodes.push({
      id: node.event_id,
      data: {
        label: (
          <div className="text-xs font-mono max-w-xs">
            <div className="font-bold mb-1 text-gray-900">{displayLabel as unknown as React.ReactNode}</div>
            <div className="text-gray-600">
              {node.latency_ms !== undefined && node.latency_ms !== null
                ? `${(node.latency_ms / 1000).toFixed(2)}s`
                : '—'}
            </div>
            {node.cost !== undefined && node.cost !== null ? (
              <div className="text-green-700 font-semibold">
                ${node.cost.toFixed(4)}
              </div>
            ) : null}
          </div>
        ) as unknown as React.ReactNode,
      },
      position: { x: xPos, y: yPos },
      style: {
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        padding: '12px 14px',
        minWidth: '140px',
        minHeight: '75px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        fontFamily: 'inherit',
      },
    })

    nodeMap.set(node.event_id, node)

    // Create hierarchical edge from parent (gray, dashed)
    if (parentId) {
      edges.push({
        id: `hier-${parentId}-${node.event_id}`,
        source: parentId,
        target: node.event_id,
        style: {
          stroke: '#A0A0A0',
          strokeWidth: 1.2,
          strokeDasharray: '4,4',
          opacity: 0.6,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#A0A0A0' },
      })
    }

    // Process children - horizontal layout with dynamic spacing
    if (node.children && node.children.length > 0) {
      const numChildren = node.children.length
      // Dynamic horizontal spacing based on number of children
      // Fewer children = wider spacing, more children = tighter spacing
      const childSpacing = numChildren > 5 ? 150 : 200
      const totalWidth = (numChildren - 1) * childSpacing
      const startX = xPos - totalWidth / 2

      node.children.forEach((child, index) => {
        const childX = startX + index * childSpacing
        const childY = yPos + 150
        processNode(child, childX, childY, node.event_id, depth + 1)
      })
    }

    return depth
  }

  // Process root nodes with sequence-based positioning
  treeNodes.forEach((node, index) => {
    const yPos = getNodeYPosition(node, node.event_type || 'unknown', sequenceMap, maxSequenceIndex)
    const xPos = index * 300
    processNode(node, xPos, yPos, null, 0)
  })

  // Create sequential edges from previous_event_id (green, animated) after all nodes are processed
  // This ensures we can check if the previous event exists in the graph
  const allTreeNodes: ExecutionTreeNodeResponse[] = []
  function collectAllNodes(node: ExecutionTreeNodeResponse) {
    allTreeNodes.push(node)
    if (node.children) {
      node.children.forEach(collectAllNodes)
    }
  }
  treeNodes.forEach(collectAllNodes)

  allTreeNodes.forEach((node) => {
    if (node.previous_event_id && nodeMap.has(node.previous_event_id)) {
      edges.push({
        id: `seq-${node.previous_event_id}-${node.event_id}`,
        source: node.previous_event_id,
        target: node.event_id,
        animated: true,
        style: {
          stroke: '#16A34A',
          strokeWidth: 2,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#16A34A' },
      })
    }
  })

  // Add edges from graph_structure if available
  // This creates the actual LangGraph topology edges
  if (graphStructure && graphStructure.edges) {
    // Create a map of node names to event IDs
    const nodeNameToEventId = new Map<string, string>()
    allTreeNodes.forEach((node) => {
      const data = node.data as any

      // For agent_start and agent_end, use special handling
      if (node.event_type === 'agent_start') {
        nodeNameToEventId.set('__start__', node.event_id)
        if (graphStructure.entry_point) {
          nodeNameToEventId.set(graphStructure.entry_point, node.event_id)
        }
      } else if (node.event_type === 'agent_end') {
        nodeNameToEventId.set('__end__', node.event_id)
        nodeNameToEventId.set('END', node.event_id)
      } else if (node.event_type === 'node_execution') {
        // For node_execution events, use the actual node_name from data
        const nodeName = data?.node_name
        if (nodeName) {
          nodeNameToEventId.set(nodeName, node.event_id)
        }
        // Also map the display name as fallback
        const displayName = getNodeNameForSequence(node)
        if (displayName && displayName !== nodeName) {
          nodeNameToEventId.set(displayName, node.event_id)
        }
      } else {
        // For other event types (llm_call, tool_call, etc.), use display name
        const displayName = getNodeNameForSequence(node)
        if (displayName) {
          nodeNameToEventId.set(displayName, node.event_id)
        }
      }
    })

    // Debug: Log the mapping
    console.log('Node name to event ID mapping:', Object.fromEntries(nodeNameToEventId))
    console.log('Graph structure edges:', graphStructure.edges)

    // Create edges from graph structure
    graphStructure.edges.forEach((edge, index) => {
      const sourceEventId = nodeNameToEventId.get(edge.from)
      const targetEventId = nodeNameToEventId.get(edge.to)

      // If target is __end__ or END, use the agent_end node
      const finalTargetId = targetEventId ||
        (edge.to === '__end__' || edge.to === 'END' ? nodeNameToEventId.get('__end__') : null)

      // Debug: Log edge processing
      if (!sourceEventId) {
        console.warn(`Could not find source event ID for node: ${edge.from}`)
      }
      if (!finalTargetId && edge.to !== '__end__' && edge.to !== 'END') {
        console.warn(`Could not find target event ID for node: ${edge.to}`)
      }

      if (sourceEventId && finalTargetId) {
        const edgeId = `graph-${edge.from}-${edge.to}-${index}`

        // Don't duplicate edges that already exist from previous_event_id
        const isDuplicate = edges.some(
          (e) => e.source === sourceEventId && e.target === finalTargetId
        )

        if (!isDuplicate) {
          const isConditional = edge.type === 'conditional'
          edges.push({
            id: edgeId,
            source: sourceEventId,
            target: finalTargetId,
            label: isConditional ? edge.condition_func || 'conditional' : undefined,
            animated: isConditional,
            style: {
              stroke: isConditional ? '#F59E0B' : '#3B82F6',
              strokeWidth: isConditional ? 2.5 : 2.2,
              strokeDasharray: isConditional ? '5,5' : undefined,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isConditional ? '#F59E0B' : '#3B82F6',
              width: 30,
              height: 30,
            },
          })
        }
      }
    })
  }

  return { nodes, edges, nodeMap }
}

function FlowGraphInner({
  nodes: treeNodes,
  graphStructure,
  executionFlow,
  onNodeSelect,
  selectedNodeId,
}: FlowGraphProps) {
  const { nodes: graphNodes, edges: graphEdges, nodeMap } = useMemo(
    () => buildGraphFromTree(treeNodes, executionFlow, graphStructure),
    [treeNodes, executionFlow, graphStructure]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(graphNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(graphEdges)

  // Track theme changes to update node borders
  const [isDarkMode, setIsDarkMode] = useState(() => 
    document.documentElement.classList.contains('dark')
  )

  useEffect(() => {
    // Watch for theme changes
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [])

  // Highlight selected node
  const selectedNodes = useMemo(() => {
    // Use a bright blue that works in both light and dark modes
    // In light mode: bright blue (#3B82F6) stands out
    // In dark mode: slightly lighter blue (#60A5FA) for better visibility
    const selectedBorderColor = isDarkMode ? '#60A5FA' : '#3B82F6'
    const selectedShadowColor = isDarkMode ? 'rgba(96, 165, 250, 0.4)' : 'rgba(59, 130, 246, 0.3)'
    
    return nodes.map((node) => ({
      ...node,
      style: {
        ...node.style,
        border:
          node.id === selectedNodeId
            ? `3px solid ${selectedBorderColor}`
            : (node.style as any)?.border,
        boxShadow:
          node.id === selectedNodeId 
            ? `0 0 0 4px ${selectedShadowColor}` 
            : (node.style as any)?.boxShadow || '0 1px 3px rgba(0, 0, 0, 0.08)',
      },
    }))
  }, [nodes, selectedNodeId, isDarkMode])

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      const treeNode = nodeMap.get(node.id)
      if (treeNode) {
        onNodeSelect?.(treeNode)
      }
    },
    [nodeMap, onNodeSelect]
  )

  if (!treeNodes || treeNodes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
        <p className="text-gray-600 dark:text-gray-400">
          No execution events to display
        </p>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={selectedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        defaultEdgeOptions={{ type: 'straight' }}
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap />
      </ReactFlow>
      <Legend />
    </div>
  )
}

export default function FlowGraph(props: FlowGraphProps) {
  return (
    <ReactFlowProvider>
      <FlowGraphInner {...props} />
    </ReactFlowProvider>
  )
}
