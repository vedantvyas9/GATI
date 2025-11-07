# LangGraph Visualization - Complete Implementation Summary

This document summarizes all changes made to enable comprehensive LangGraph visualization showing graph structure, nodes, edges, execution sequence, and parallel vs sequential execution.

## Overview

The implementation tracks:
1. **Graph Topology** - Nodes and edges from the LangGraph definition
2. **Execution Sequence** - Actual order nodes executed
3. **Parallel vs Sequential Flow** - Which nodes ran in parallel vs sequence
4. **Sequential Relationships** - Chain of execution via `previous_event_id`
5. **Hierarchical Relationships** - Parent-child via `parent_event_id`

## Architecture

```
SDK (Instrumentation)
    ↓
  Events with graph data
    ↓
Backend API
    ↓
  JSON with structure
    ↓
  Frontend UI
    ↓
Graph Visualization
```

---

## 1. SDK Changes (Instrumentation Layer)

### Modified Files:
- `/sdk/gati/core/event.py`
- `/sdk/gati/instrumentation/langgraph/auto_inject.py`

### Key Features Added:

#### A. Event Model Enhancement
**File:** `sdk/gati/core/event.py`

Added `previous_event_id` field to base Event class:
```python
previous_event_id: Optional[str] = field(default=None)  # Sequential flow tracking
```

This creates a **linked list** of events showing execution order:
```
AgentStart → Node1 → Node2 → Node3 → AgentEnd
```

#### B. Graph Structure Extraction
**Function:** `_extract_graph_structure(pregel)`

Extracts from the compiled LangGraph (Pregel):
- **Nodes**: List of all nodes in the graph
- **Edges**: Connections between nodes (regular and conditional)
- **Entry Point**: Starting node
- **End Nodes**: Terminal nodes
- **Conditional Edges**: Decision points in the graph

**Returns:**
```python
{
    "nodes": ["node1", "node2", "node3"],
    "edges": [
        {"from": "node1", "to": "node2", "type": "regular"},
        {"from": "node2", "to": "node3", "type": "conditional", "condition": "..."}
    ],
    "entry_point": "node1",
    "end_nodes": ["node3"],
    "has_conditional_edges": True
}
```

#### C. Execution Flow Analysis
**Function:** `_analyze_execution_flow(execution_sequence)`

Analyzes the actual execution to determine:
- **Execution Order**: Sequence of node execution
- **Parallel Groups**: Nodes that executed simultaneously (overlapping time ranges)
- **Sequential Pairs**: Nodes that executed one after another

**Algorithm:**
- Detects parallel execution by checking if node time ranges overlap
- Detects sequential execution by checking if one node ended before the next started
- Uses 1ms tolerance for timing precision

**Returns:**
```python
{
    "total_nodes_executed": 3,
    "execution_order": ["node1", "node2", "node3"],
    "parallel_groups": [["node2a", "node2b"]],  # These ran in parallel
    "sequential_pairs": [["node1", "node2"], ["node2", "node3"]]
}
```

#### D. Enhanced Event Tracking

**In `wrapped_stream` and `wrapped_invoke`:**

1. **Track execution timing**:
```python
node_start_times: Dict[str, float] = {}
node_end_times: Dict[str, float] = {}
execution_sequence: list = []
```

2. **Build execution sequence**:
```python
execution_sequence.append({
    "node_name": node_name,
    "start_time": node_start_times[node_name],
    "end_time": node_end_times[node_name],
    "sequence_index": len(execution_sequence)
})
```

3. **Set sequential relationships**:
```python
node_event.previous_event_id = previous_event_id  # Links to previous event
previous_event_id = node_event.event_id  # Update for next node
```

4. **Attach graph structure to AgentStartEvent**:
```python
start_event = AgentStartEvent(
    ...
    metadata={
        "graph_structure": graph_structure,  # Topology
        ...
    }
)
```

5. **Attach execution flow to AgentEndEvent**:
```python
end_event.data.update({
    "execution_flow": execution_flow,  # Analysis
    "execution_sequence": [...]  # Full sequence
})
```

---

## 2. Backend Changes (API Layer)

### Modified Files:
- `/backend/app/models/event.py`
- `/backend/app/schemas/metrics.py`
- `/backend/app/api/runs.py`
- `/backend/alembic/versions/004_add_previous_event_id.py` (NEW)

### Key Changes:

#### A. Database Model
**File:** `backend/app/models/event.py`

Added new column:
```python
previous_event_id = Column(String(36), nullable=True, index=True)
```

#### B. Database Migration
**File:** `backend/alembic/versions/004_add_previous_event_id.py`

Migration to add the new column:
```python
op.add_column('events', sa.Column('previous_event_id', sa.String(36), nullable=True))
op.create_index('idx_event_previous_event_id', 'events', ['previous_event_id'])
```

**To apply:** Run `alembic upgrade head` in the backend directory

#### C. API Schemas
**File:** `backend/app/schemas/metrics.py`

**ExecutionTreeNodeResponse:**
```python
previous_event_id: Optional[str] = None  # NEW: Sequential flow
```

**ExecutionTraceResponse:**
```python
graph_structure: Optional[Dict[str, Any]] = None  # NEW: Graph topology
execution_flow: Optional[Dict[str, Any]] = None   # NEW: Execution analysis
```

#### D. API Endpoint Enhancement
**File:** `backend/app/api/runs.py`
**Endpoint:** `GET /runs/{agent_name}/{run_name}/trace`

Enhanced to extract and return:

1. **previous_event_id** from each event:
```python
node = ExecutionTreeNodeResponse(
    ...
    previous_event_id=event.previous_event_id,
    ...
)
```

2. **graph_structure** from agent_start event:
```python
for event in events:
    if event.event_type == "agent_start":
        metadata = event.data.get("metadata", {})
        graph_structure = metadata.get("graph_structure")
        break
```

3. **execution_flow** from agent_end event:
```python
for event in events:
    if event.event_type == "agent_end":
        execution_flow = event.data.get("execution_flow")
        break
```

**Response includes:**
```json
{
    "execution_tree": [...],
    "graph_structure": {
        "nodes": ["node1", "node2"],
        "edges": [{"from": "node1", "to": "node2"}],
        ...
    },
    "execution_flow": {
        "execution_order": ["node1", "node2"],
        "parallel_groups": [],
        "sequential_pairs": [["node1", "node2"]]
    }
}
```

---

## 3. Frontend Changes (UI Layer)

### Files to Update:
- `/dashboard/src/types/index.ts` - TypeScript types
- `/dashboard/src/components/FlowGraph.tsx` - Graph visualization
- `/dashboard/src/components/ExecutionTree.tsx` - Tree visualization

### Required Changes:

#### A. Update TypeScript Types
**File:** `dashboard/src/types/index.ts`

```typescript
interface ExecutionTreeNodeResponse {
    // ... existing fields
    previous_event_id?: string;  // ADD THIS
}

interface ExecutionTraceResponseData {
    // ... existing fields
    graph_structure?: {  // ADD THIS
        nodes: string[];
        edges: Array<{
            from: string;
            to: string;
            type: string;
            condition?: string;
        }>;
        entry_point?: string;
        end_nodes: string[];
        has_conditional_edges: boolean;
    };
    execution_flow?: {  // ADD THIS
        total_nodes_executed: number;
        execution_order: string[];
        parallel_groups: string[][];
        sequential_pairs: string[][];
    };
}
```

#### B. Update FlowGraph Component
**File:** `dashboard/src/components/FlowGraph.tsx`

**Current State:** Creates nodes from events, but edges are based on parent_event_id only

**Enhancement Needed:**
1. Use `graph_structure.edges` to draw actual graph edges
2. Use `previous_event_id` to show execution sequence
3. Add visual indicators for parallel vs sequential nodes
4. Color-code or badge nodes that ran in parallel

**Proposed Changes:**
```typescript
const FlowGraph = ({ nodes, graphStructure, executionFlow }: Props) => {
    // Create edges from graph_structure
    const graphEdges = graphStructure?.edges.map(edge => ({
        id: `${edge.from}-${edge.to}`,
        source: edge.from,
        target: edge.to,
        type: edge.type === 'conditional' ? 'conditional' : 'default',
        label: edge.condition,
        style: { stroke: '#888' }  // Graph structure edges
    }));

    // Create execution flow edges from previous_event_id
    const executionEdges = nodes
        .filter(n => n.previous_event_id)
        .map(n => ({
            id: `exec-${n.event_id}`,
            source: n.previous_event_id,
            target: n.event_id,
            animated: true,  // Show execution flow
            style: { stroke: '#22c55e', strokeWidth: 2 }
        }));

    // Mark parallel nodes
    const parallelNodeIds = new Set(
        executionFlow?.parallel_groups?.flat() || []
    );

    const reactFlowNodes = nodes.map(node => ({
        ...node,
        data: {
            ...node.data,
            isParallel: parallelNodeIds.has(node.event_id),
            sequenceIndex: executionFlow?.execution_order.indexOf(node.event_id)
        }
    }));

    return (
        <ReactFlow
            nodes={reactFlowNodes}
            edges={[...graphEdges, ...executionEdges]}
            ...
        />
    );
};
```

#### C. Update ExecutionTree Component
**File:** `dashboard/src/components/ExecutionTree.tsx`

**Enhancement:** Show sequential order alongside hierarchical tree

```typescript
const ExecutionTreeNode = ({ node, sequenceIndex }: Props) => {
    return (
        <div>
            <span className="sequence-badge">#{sequenceIndex}</span>
            {node.data.isParallel && (
                <span className="parallel-badge">⚡ Parallel</span>
            )}
            {/* ... existing node display */}
        </div>
    );
};
```

---

## 4. Data Flow Example

### Input Graph:
```python
workflow = StateGraph(MyState)
workflow.add_node("analyze", analyze_func)
workflow.add_node("process", process_func)
workflow.add_node("respond", respond_func)
workflow.set_entry_point("analyze")
workflow.add_edge("analyze", "process")
workflow.add_edge("process", "respond")
workflow.add_edge("respond", END)
app = workflow.compile()
```

### Tracked Data:

**1. Graph Structure (from agent_start):**
```json
{
    "nodes": ["analyze", "process", "respond"],
    "edges": [
        {"from": "analyze", "to": "process", "type": "regular"},
        {"from": "process", "to": "respond", "type": "regular"},
        {"from": "respond", "to": "__end__", "type": "regular"}
    ],
    "entry_point": "analyze",
    "end_nodes": ["respond"]
}
```

**2. Execution Sequence (from tracking):**
```json
[
    {"node_name": "analyze", "sequence_index": 0, "duration_ms": 120},
    {"node_name": "process", "sequence_index": 1, "duration_ms": 85},
    {"node_name": "respond", "sequence_index": 2, "duration_ms": 95}
]
```

**3. Execution Flow (from agent_end):**
```json
{
    "total_nodes_executed": 3,
    "execution_order": ["analyze", "process", "respond"],
    "parallel_groups": [],
    "sequential_pairs": [
        ["analyze", "process"],
        ["process", "respond"]
    ]
}
```

**4. Sequential Links (via previous_event_id):**
```
AgentStart (id: abc)
    ↓ previous_event_id: abc
NodeExecution:analyze (id: def)
    ↓ previous_event_id: def
NodeExecution:process (id: ghi)
    ↓ previous_event_id: ghi
NodeExecution:respond (id: jkl)
    ↓ previous_event_id: jkl
AgentEnd (id: mno)
```

---

## 5. Visualization Benefits

### Before (Old System):
- ❌ Only showed parent-child hierarchy
- ❌ Couldn't see graph structure
- ❌ No indication of execution order
- ❌ Couldn't distinguish parallel vs sequential

### After (New System):
- ✅ **Hierarchical View**: Parent-child relationships (parent_event_id)
- ✅ **Sequential View**: Execution order (previous_event_id)
- ✅ **Graph Topology**: Actual nodes and edges from LangGraph definition
- ✅ **Execution Flow**: Which nodes ran in parallel vs sequence
- ✅ **Timing Data**: Precise start/end times for each node
- ✅ **Complete Picture**: See both the planned graph and actual execution

---

## 6. Testing

### Run Example:
```bash
cd sdk
python examples/langgraph_example.py
```

### Check Output:
1. **Events should include**:
   - `previous_event_id` in each event
   - `graph_structure` in agent_start metadata
   - `execution_flow` in agent_end data

2. **API Response** (`/runs/{agent}/{run}/trace`):
   - Should return `graph_structure` and `execution_flow`
   - Each node should have `previous_event_id`

3. **Database**:
   - Run migration: `cd backend && alembic upgrade head`
   - Verify `previous_event_id` column exists in `events` table

---

## 7. Next Steps for Full UI Integration

1. **Update TypeScript types** with new fields
2. **Enhance FlowGraph** to use graph_structure for edges
3. **Add execution flow visualization** (parallel indicators)
4. **Update ExecutionTree** to show sequence numbers
5. **Add toggle** between "Graph View" and "Execution View"
6. **Style parallel nodes** differently (e.g., grouped boxes)
7. **Add timeline scrubber** to show execution progress

---

## 8. Summary

This implementation provides **complete observability** into LangGraph execution:

| Aspect | Tracked Via | Visualized As |
|--------|-------------|---------------|
| Graph Definition | `graph_structure` | Node-edge diagram |
| Execution Order | `previous_event_id` | Numbered sequence |
| Hierarchy | `parent_event_id` | Tree view |
| Parallel Execution | `execution_flow.parallel_groups` | Grouped/badged nodes |
| Sequential Flow | `execution_flow.sequential_pairs` | Sequential arrows |
| Timing | `node_start_times`, `node_end_times` | Duration labels |

The UI can now render:
- The **planned graph** (from graph_structure)
- The **actual execution** (from execution_flow)
- Both **hierarchical** and **sequential** relationships
- **Parallel** vs **sequential** execution patterns

This enables users to:
- Understand their LangGraph topology
- Debug execution flow issues
- Optimize parallel execution
- Visualize the complete agent behavior
