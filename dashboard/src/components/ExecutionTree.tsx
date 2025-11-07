import { useState, useMemo } from 'react'
import { ExecutionTreeNodeResponse } from '../types'

// Inline detail panel component
function InlineEventDetail({ event, onClose }: { event: ExecutionTreeNodeResponse; onClose: () => void }) {
  const formatJsonValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'null'
    if (typeof value === 'string') return value
    if (typeof value === 'number') return value.toString()
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    return JSON.stringify(value, null, 2)
  }

  return (
    <div className="mt-3 ml-11 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      {/* Event Type & Metadata */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-semibold">
            Event Type
          </p>
          <p className="text-sm font-mono text-navy-600 dark:text-navy-400">
            {event.event_type}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-semibold">
            Timestamp
          </p>
          <p className="text-sm text-navy-600 dark:text-navy-400">
            {new Date(event.timestamp).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {event.latency_ms !== undefined && event.latency_ms !== null && (
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold mb-1">
              Latency
            </p>
            <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
              {event.latency_ms < 1000
                ? `${event.latency_ms.toFixed(0)}ms`
                : `${(event.latency_ms / 1000).toFixed(2)}s`}
            </p>
          </div>
        )}
        {event.cost !== undefined && event.cost !== null && (
          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 border border-green-200 dark:border-green-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold mb-1">
              Cost
            </p>
            <p className="text-sm font-bold text-green-700 dark:text-green-300">
              ${event.cost.toFixed(4)}
            </p>
          </div>
        )}
        {event.tokens_in !== undefined && event.tokens_in !== null && (
          <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold mb-1">
              Tokens In
            </p>
            <p className="text-sm font-bold text-purple-700 dark:text-purple-300">
              {Math.round(event.tokens_in)}
            </p>
          </div>
        )}
        {event.tokens_out !== undefined && event.tokens_out !== null && (
          <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-3 border border-orange-200 dark:border-orange-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold mb-1">
              Tokens Out
            </p>
            <p className="text-sm font-bold text-orange-700 dark:text-orange-300">
              {Math.round(event.tokens_out)}
            </p>
          </div>
        )}
      </div>

      {/* Event Data */}
      <div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 font-semibold">
          Event Data
        </p>
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
            {JSON.stringify(event.data, null, 2)}
          </pre>
        </div>
      </div>

      {/* Request/Response Details */}
      {event.data?.prompt && (
        <div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-semibold">
            Prompt
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words font-mono text-xs">
              {formatJsonValue(event.data.prompt)}
            </p>
          </div>
        </div>
      )}

      {event.data?.completion && (
        <div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-semibold">
            Completion
          </p>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words font-mono text-xs">
              {formatJsonValue(event.data.completion)}
            </p>
          </div>
        </div>
      )}

      {event.data?.error && (
        <div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-semibold">
            Error
          </p>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-700">
            <p className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap break-words font-mono text-xs">
              {formatJsonValue(event.data.error)}
            </p>
          </div>
        </div>
      )}

      {/* Metadata Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 font-semibold">
          Metadata
        </p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {event.parent_event_id && (
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                Parent Event
              </p>
              <p className="font-mono text-gray-700 dark:text-gray-300 text-xs break-all">
                {event.parent_event_id}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
              Event ID
            </p>
            <p className="font-mono text-gray-700 dark:text-gray-300 text-xs break-all">
              {event.event_id}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
              Agent Name
            </p>
            <p className="font-mono text-gray-700 dark:text-gray-300 text-xs">
              {event.agent_name}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
              Run ID
            </p>
            <p className="font-mono text-gray-700 dark:text-gray-300 text-xs break-all">
              {event.run_id}
            </p>
          </div>
        </div>
      </div>

      {/* Close button at the end */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-navy-600 hover:bg-navy-700 dark:bg-navy-700 dark:hover:bg-navy-600 text-white rounded-lg font-medium transition-colors text-sm"
        >
          Close Details
        </button>
      </div>
    </div>
  )
}

interface ExecutionTreeProps {
  nodes: ExecutionTreeNodeResponse[]
  onNodeSelect?: (node: ExecutionTreeNodeResponse) => void
  selectedNodeId?: string
}

// Icon components matching design specifications
function LLMIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="9" x2="15" y2="9" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  )
}

function ToolIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

function SuccessIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="currentColor">
      <circle cx="6" cy="6" r="6" />
    </svg>
  )
}

function SlowWarningIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 2v4M6 8v1" />
    </svg>
  )
}

function ClockIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

function ChevronIcon({ className = "w-4 h-4", isExpanded = true }: { className?: string; isExpanded?: boolean }) {
  return (
    <svg
      className={`${className} transition-transform ${isExpanded ? '' : '-rotate-90'}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

// Color mapping for event types - professional, minimal design
const EVENT_TYPE_COLORS: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
  llm_call: {
    bg: 'bg-white dark:bg-gray-800',
    text: 'text-gray-900 dark:text-gray-100',
    border: 'border-gray-200 dark:border-gray-700',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  },
  tool_call: {
    bg: 'bg-white dark:bg-gray-800',
    text: 'text-gray-900 dark:text-gray-100',
    border: 'border-gray-200 dark:border-gray-700',
    iconBg: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  },
  agent_start: {
    bg: 'bg-white dark:bg-gray-800',
    text: 'text-gray-900 dark:text-gray-100',
    border: 'border-gray-200 dark:border-gray-700',
    iconBg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  },
  agent_end: {
    bg: 'bg-white dark:bg-gray-800',
    text: 'text-gray-900 dark:text-gray-100',
    border: 'border-gray-200 dark:border-gray-700',
    iconBg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  },
  error: {
    bg: 'bg-white dark:bg-gray-800',
    text: 'text-gray-900 dark:text-gray-100',
    border: 'border-red-200 dark:border-red-800',
    iconBg: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  },
}

function getEventTypeStyle(eventType: string) {
  return EVENT_TYPE_COLORS[eventType] || {
    bg: 'bg-white dark:bg-gray-800',
    text: 'text-gray-900 dark:text-gray-100',
    border: 'border-gray-200 dark:border-gray-700',
    iconBg: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  }
}

function getEventTypeLabel(eventType: string): string {
  const labels: Record<string, string> = {
    llm_call: 'LLM Call',
    tool_call: 'Tool Call',
    agent_start: 'Agent Start',
    agent_end: 'Agent End',
    chain_start: 'Chain Start',
    chain_end: 'Chain End',
  }
  return labels[eventType] || eventType.replace(/_/g, ' ')
}

function getNodeDisplayName(node: ExecutionTreeNodeResponse): string {
  const data = node.data as any

  // Debug log to see what data is available (can be removed after debugging)
  if (node.event_type === 'node_execution' || node.event_type === 'tool_call') {
    console.log('Node data for', node.event_type, ':', {
      event_id: node.event_id,
      event_type: node.event_type,
      data: data,
      keys: data ? Object.keys(data) : []
    })
  }

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

  return getEventTypeLabel(node.event_type)
}

function getEventIcon(eventType: string) {
  switch (eventType) {
    case 'llm_call':
      return <LLMIcon />
    case 'tool_call':
      return <ToolIcon />
    default:
      return <LLMIcon />
  }
}

interface TreeNodeProps {
  node: ExecutionTreeNodeResponse
  onSelect: (node: ExecutionTreeNodeResponse) => void
  isSelected: boolean
  depth: number
  selectedNodeId?: string
  isLast?: boolean
  parentLines?: boolean[]
  index: number
}

function TreeNode({
  node,
  onSelect,
  isSelected,
  depth,
  selectedNodeId,
  isLast = false,
  parentLines = [],
  index
}: TreeNodeProps) {
  const [isChildrenExpanded, setIsChildrenExpanded] = useState(true)
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false)
  const style = getEventTypeStyle(node.event_type)
  const hasChildren = node.children && node.children.length > 0

  const latencyMs = node.latency_ms ?? 0
  const latencyLabel =
    latencyMs < 1000
      ? `${latencyMs.toFixed(0)}ms`
      : `${(latencyMs / 1000).toFixed(2)}s`

  // Determine if this is a slow operation (> 200ms)
  const isSlow = latencyMs > 200

  const handleCardClick = () => {
    setIsDetailsExpanded(!isDetailsExpanded)
    onSelect(node)
  }

  return (
    <div className="relative">
      {/* Horizontal node layout: [Number Badge (32px)] [Icon (32px)] [Content Card (flex-1)] */}
      <div className="flex items-center gap-3 group">
        {/* Numbered circle badge - 32px × 32px */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
          {index + 1}
        </div>

        {/* Icon container - 32px × 32px */}
        <div className={`flex-shrink-0 w-8 h-8 rounded flex items-center justify-center ${style.iconBg}`}>
          {getEventIcon(node.event_type)}
        </div>

        {/* Content card with 16px horizontal, 12px vertical padding */}
        <div
          onClick={handleCardClick}
          className={`flex-1 min-w-0 px-4 py-3 rounded-lg border cursor-pointer transition-all ${
            isDetailsExpanded
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-sm'
              : isSelected
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-sm'
              : `${style.bg} ${style.border} hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm`
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            {/* Event name + Model name section */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Event name - 14px, font-medium */}
              <span className={`text-sm font-medium ${style.text} truncate`}>
                {getNodeDisplayName(node)}
              </span>

              {/* Event type label - 12px, lighter text - only show if we're displaying a specific name (not the fallback) */}
              {getNodeDisplayName(node) !== getEventTypeLabel(node.event_type) && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {getEventTypeLabel(node.event_type)}
                </span>
              )}
            </div>

            {/* Status badges, latency, and expand button */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Success status badge - 8px horizontal, 4px vertical padding */}
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                <SuccessIcon />
                success
              </span>

              {/* Slow warning badge - conditional display for > 200ms */}
              {isSlow && (
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                  <SlowWarningIcon />
                  Slow
                </span>
              )}

              {/* Latency display with clock icon - 12px text */}
              {node.latency_ms !== undefined && node.latency_ms !== null && (
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                  <ClockIcon />
                  {latencyLabel}
                </span>
              )}

              {/* Cost display */}
              {node.cost !== undefined && node.cost !== null && (
                <span className="inline-flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                  <span>💰</span>
                  ${node.cost.toFixed(4)}
                </span>
              )}

              {/* Expand/collapse children button - 4px padding */}
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsChildrenExpanded(!isChildrenExpanded)
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all"
                  aria-label={isChildrenExpanded ? 'Collapse children' : 'Expand children'}
                >
                  <ChevronIcon className="text-gray-600 dark:text-gray-400" isExpanded={isChildrenExpanded} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Inline detail panel - shown when card is expanded */}
      {isDetailsExpanded && (
        <InlineEventDetail event={node} onClose={() => setIsDetailsExpanded(false)} />
      )}

      {/* Children indentation - 44px left margin, 32px left padding, 8px top margin, 2px left border */}
      {isChildrenExpanded && hasChildren && (
        <div className="ml-11 mt-2 space-y-2 pl-8 border-l-2 border-gray-200 dark:border-gray-700">
          {node.children!.map((child, childIndex) => (
            <TreeNode
              key={child.event_id}
              node={child}
              onSelect={onSelect}
              isSelected={selectedNodeId === child.event_id}
              depth={depth + 1}
              selectedNodeId={selectedNodeId}
              isLast={childIndex === node.children!.length - 1}
              parentLines={[...parentLines, depth > 0, !isLast]}
              index={childIndex}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ExecutionTree({
  nodes,
  onNodeSelect,
  selectedNodeId,
}: ExecutionTreeProps) {
  const handleNodeSelect = (node: ExecutionTreeNodeResponse) => {
    onNodeSelect?.(node)
  }

  const treeContent = useMemo(() => {
    return nodes.map((node, index) => (
      <TreeNode
        key={node.event_id}
        node={node}
        onSelect={handleNodeSelect}
        isSelected={selectedNodeId === node.event_id}
        depth={0}
        selectedNodeId={selectedNodeId}
        isLast={index === nodes.length - 1}
        index={index}
      />
    ))
  }, [nodes, selectedNodeId])

  if (!nodes || nodes.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-600 dark:text-gray-400">
        No events in execution tree
      </div>
    )
  }

  return (
    <div className="p-4 space-y-2">
      {treeContent}
    </div>
  )
}
