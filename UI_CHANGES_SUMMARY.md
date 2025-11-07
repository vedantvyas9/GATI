# UI Changes Summary - LangGraph Visualization

## Overview

The frontend has been updated to display comprehensive LangGraph execution visualization showing:
- **Graph Structure**: Nodes and edges from the LangGraph definition
- **Sequential Flow**: Execution order with animated arrows
- **Parallel Execution**: Visual indicators for nodes that ran in parallel
- **Hierarchical Relationships**: Parent-child event structure
- **Execution Metrics**: Sequence numbers, timing, and cost data

## Files Modified

### 1. `/dashboard/src/types/index.ts`

**Added new TypeScript interfaces:**

```typescript
export interface GraphEdge {
  from: string
  to: string
  type: 'regular' | 'conditional'
  condition?: string
}

export interface GraphStructure {
  nodes: string[]
  edges: GraphEdge[]
  entry_point?: string
  end_nodes: string[]
  has_conditional_edges: boolean
}

export interface ExecutionFlow {
  total_nodes_executed: number
  execution_order: string[]
  parallel_groups: string[][]
  sequential_pairs: string[][]
}
```

**Updated existing interfaces:**

```typescript
export interface ExecutionTreeNodeResponse extends Event {
  parent_event_id?: string
  previous_event_id?: string  // NEW
  latency_ms?: number
  cost?: number
  tokens_in?: number
  tokens_out?: number
  children?: ExecutionTreeNodeResponse[]
}

export interface ExecutionTraceResponseData {
  run_name: string
  agent_name: string
  total_cost: number
  total_duration_ms: number
  total_tokens_in: number
  total_tokens_out: number
  execution_tree: ExecutionTreeNodeResponse[]
  graph_structure?: GraphStructure    // NEW
  execution_flow?: ExecutionFlow      // NEW
}
```

---

### 2. `/dashboard/src/components/FlowGraph.tsx`

**Completely rewritten** to support enhanced graph visualization.

#### Key Features Added:

**A. New Props:**
```typescript
interface FlowGraphProps {
  nodes: ExecutionTreeNodeResponse[]
  graphStructure?: GraphStructure    // NEW
  executionFlow?: ExecutionFlow      // NEW
  onNodeSelect?: (node: ExecutionTreeNodeResponse) => void
  selectedNodeId?: string
}
```

**B. Three Types of Edges:**

1. **Sequential Flow Edges** (Green, Animated)
   - Created from `previous_event_id` chain
   - Shows actual execution order
   - Thick green arrows with animation
   - Label: ▶

2. **Hierarchical Edges** (Gray, Dashed)
   - Created from `parent_event_id` relationships
   - Shows event containment/hierarchy
   - Dashed gray arrows

3. **Graph Structure Edges** (Purple/Gray)
   - Created from `graphStructure.edges`
   - Shows LangGraph definition
   - Conditional edges: purple, dashed
   - Regular edges: gray, solid

**C. Node Enhancements:**

- **Sequence Numbers**: Blue badge showing execution order (1, 2, 3...)
- **Parallel Indicator**: ⚡ badge for nodes in parallel groups
- **Special Border**: Amber border for parallel nodes
- **Node Name**: Extracted from node_execution data
- **Metrics**: Latency and cost displayed

**D. Visual Legend:**

Added floating legend showing:
- Sequential Flow (green line)
- Hierarchy (gray dashed line)
- Conditional (purple dashed line)
- Parallel badge (⚡)

**E. Layout Algorithm:**

- Maps node names to event IDs
- Identifies parallel nodes from `executionFlow.parallel_groups`
- Adds sequence numbers from `executionFlow.execution_order`
- Positions nodes based on event type (agent_start/end)

---

### 3. `/dashboard/src/components/RunDetail.tsx`

**Updated FlowGraph integration:**

```typescript
<FlowGraph
  nodes={timeline.execution_tree}
  graphStructure={timeline.graph_structure}  // NEW
  executionFlow={timeline.execution_flow}    // NEW
  onNodeSelect={handleEventSelect}
  selectedNodeId={selectedEvent?.event_id}
/>
```

---

## Visual Features

### Node Display

**Before:**
```
┌─────────────┐
│ LLM Call    │
│ 2.5s        │
│ $0.0025     │
└─────────────┘
```

**After:**
```
┌───────────────────┐
│ ① analyze         │  ← Sequence number
│ ⚡ Parallel        │  ← Parallel indicator (if applicable)
│ 1.2s              │
│ $0.0015           │
└───────────────────┘
```

### Edge Types

**Sequential Flow (Green):**
```
[Node1] ═══▶ [Node2] ═══▶ [Node3]
       (animated)    (animated)
```

**Hierarchy (Gray Dashed):**
```
[Agent Start]
    ┆
    ┆ (dashed)
    ↓
[Node1]
```

**Graph Structure (Purple/Gray):**
```
[Node1] ──→ [Node2]  (regular)
[Node1] ···→ [Node2]  (conditional, purple)
```

### Parallel Execution

Parallel nodes are:
1. Highlighted with **amber border** (instead of default)
2. Labeled with **⚡ Parallel** badge
3. Grouped visually (same sequence numbers)

Example:
```
        [Node1] (sequence 1)
           ↓
    ┌──────┴──────┐
    ↓             ↓
[Node2A] ⚡   [Node2B] ⚡  (both sequence 2, parallel)
    └──────┬──────┘
           ↓
        [Node3] (sequence 3)
```

---

## Data Flow

### API Response Structure

```json
{
  "execution_tree": [
    {
      "event_id": "abc",
      "event_type": "agent_start",
      "previous_event_id": null,
      "children": [...]
    },
    ...
  ],
  "graph_structure": {
    "nodes": ["analyze", "process", "respond"],
    "edges": [
      {"from": "analyze", "to": "process", "type": "regular"},
      {"from": "process", "to": "respond", "type": "regular"}
    ],
    "entry_point": "analyze",
    "end_nodes": ["respond"]
  },
  "execution_flow": {
    "total_nodes_executed": 3,
    "execution_order": ["analyze", "process", "respond"],
    "parallel_groups": [],
    "sequential_pairs": [
      ["analyze", "process"],
      ["process", "respond"]
    ]
  }
}
```

### Component Processing

```
RunDetail fetches trace data
        ↓
Passes to FlowGraph with graph_structure & execution_flow
        ↓
buildEnhancedGraph() processes:
  1. Maps node names to event IDs
  2. Identifies parallel nodes
  3. Adds sequence numbers
  4. Creates 3 types of edges
        ↓
ReactFlow renders with:
  - Colored nodes with badges
  - Multiple edge types
  - Interactive controls
  - Legend
```

---

## User Benefits

### Before:
- ❌ Only saw hierarchical tree
- ❌ No execution order
- ❌ No parallel indicators
- ❌ No graph structure
- ❌ Hard to understand flow

### After:
- ✅ **Three views in one**: Hierarchy, sequence, and graph structure
- ✅ **Execution Order**: Numbered badges (1, 2, 3...)
- ✅ **Parallel Detection**: ⚡ badges and amber borders
- ✅ **Graph Topology**: See planned vs actual execution
- ✅ **Sequential Flow**: Animated green arrows showing order
- ✅ **Complete Picture**: Understand entire execution at a glance

---

## Testing

### Run Example:

1. **Start Backend:**
```bash
cd backend
alembic upgrade head  # Apply database migration
python -m uvicorn app.main:app --reload
```

2. **Start Frontend:**
```bash
cd dashboard
npm run dev
```

3. **Run LangGraph Example:**
```bash
cd sdk
python examples/langgraph_example.py
```

4. **View in UI:**
- Navigate to agent in dashboard
- Click on the run
- Enable "Graph View" toggle
- Observe:
  - ✅ Sequence numbers on nodes
  - ✅ Green animated arrows (sequential flow)
  - ✅ Gray dashed lines (hierarchy)
  - ✅ Parallel badges (if applicable)
  - ✅ Legend in top-right corner

---

## Legend Reference

| Element | Color | Style | Meaning |
|---------|-------|-------|---------|
| Sequential arrow | Green | Solid, animated | Execution order |
| Hierarchy arrow | Gray | Dashed | Parent-child relationship |
| Graph edge | Gray | Solid | LangGraph definition |
| Conditional edge | Purple | Dashed | Conditional routing |
| ⚡ Badge | Amber | - | Parallel execution |
| Number badge | Blue | Circular | Sequence order |

---

## Future Enhancements (Optional)

1. **Toggle Edge Types**: Show/hide each edge type individually
2. **Timeline Scrubber**: Animate execution replay
3. **Zoom to Node**: Auto-focus on selected node
4. **Export Graph**: Save as PNG/SVG
5. **Performance View**: Highlight slowest nodes
6. **Cost Analysis**: Highlight most expensive nodes

---

## Summary

The UI now provides **complete observability** into LangGraph execution:

| Aspect | Visualization |
|--------|---------------|
| Graph Definition | Nodes + edges from LangGraph |
| Execution Order | Numbered sequence badges |
| Hierarchical Structure | Dashed gray arrows |
| Sequential Flow | Animated green arrows |
| Parallel Execution | ⚡ badges + amber borders |
| Timing | Latency labels on nodes |
| Cost | $ labels on nodes |

Users can now:
- **Understand** their graph topology
- **Debug** execution flow issues
- **Optimize** parallel execution
- **Visualize** complete agent behavior
- **Compare** planned vs actual execution
