# LLMCallEvent Creation and Tracking Analysis

## Overview
This document maps all event creation points in the LangChain callback system for the GATI SDK.

---

## LLMCallEvent Creation Points

### 1. on_llm_end (Success Case)
**File:** `/Users/vedantvyas/Desktop/GATI/gati-sdk/sdk/gati/instrumentation/langchain/callback.py`
**Lines:** 196-327
**Method Signature:** `def on_llm_end(self, response: Any, **kwargs: Any) -> None:`

**Event Creation Location:** Line 293-321
```python
event = LLMCallEvent(
    run_id=gati_run_name or "",
    run_name=gati_run_name or "",
    model=model_name,
    prompt=user_prompt,
    system_prompt=system_prompt,
    completion=completion_text,
    tokens_in=tokens_in,
    tokens_out=tokens_out,
    latency_ms=latency_ms,
    cost=cost,
    data={...}
)
```

**Tracking:** Line 327: `observe.track_event(event)`

**Key Processing Steps:**
- Lines 203-213: Extract cached metadata from on_llm_start
- Lines 227-240: Extract model name with fallback strategies
- Lines 243-256: Extract completion text
- Lines 258-276: Extract token usage with multiple strategies
- Line 278: Compute latency_ms
- Line 279: Calculate cost

---

### 2. on_llm_error (Error Case)
**File:** `/Users/vedantvyas/Desktop/GATI/gati-sdk/sdk/gati/instrumentation/langchain/callback.py`
**Lines:** 339-367
**Method Signature:** `def on_llm_error(self, error: BaseException, **kwargs: Any) -> None:`

**Event Creation Location:** Line 348-359
```python
event = LLMCallEvent(
    run_id=run_id,
    data={
        "status": "error",
        "error_type": type(error).__name__,
        "error_message": self._safe_str(error),
        "latency_ms": latency_ms,
        "parent_run_id": parent_run_id,
        "tags": tags or [],
        "metadata": metadata or {},
    },
)
```

**Tracking:** Line 360: `observe.track_event(event)`

---

## ToolCallEvent Creation Points

### 1. on_tool_end (Success Case)
**File:** `/Users/vedantvyas/Desktop/GATI/gati-sdk/sdk/gati/instrumentation/langchain/callback.py`
**Lines:** 578-643
**Method Signature:** `def on_tool_end(self, output: Any, **kwargs: Any) -> None:`

**Event Creation Location:** Line 614-628
```python
event = ToolCallEvent(
    run_id=gati_run_name or "",
    run_name=gati_run_name or "",
    tool_name=tool_name,
    input=tool_input,
    output={"output": self._safe_jsonable(output)},
    latency_ms=latency_ms,
    data={
        "status": "completed",
        "parent_run_id": cached_metadata.get("parent_run_id", lc_parent_run_id),
        "tags": tags,
        "metadata": metadata,
        "tool_metadata": cached_metadata.get("tool_metadata", {}),
    },
)
```

**Tracking:** Line 634: `observe.track_event(event)`

**Key Processing Steps:**
- Lines 581-606: Extract cached metadata from on_tool_start
- Line 605: Get tool_name from cache
- Line 606: Compute latency_ms

---

### 2. on_tool_error (Error Case)
**File:** `/Users/vedantvyas/Desktop/GATI/gati-sdk/sdk/gati/instrumentation/langchain/callback.py`
**Lines:** 644-674
**Method Signature:** `def on_tool_error(self, error: BaseException, **kwargs: Any) -> None:`

**Event Creation Location:** Line 654-666
```python
event = ToolCallEvent(
    run_id=run_id,
    tool_name=tool_name,
    latency_ms=latency_ms,
    data={
        "status": "error",
        "error_type": type(error).__name__,
        "error_message": self._safe_str(error),
        "parent_run_id": parent_run_id,
        "tags": tags or [],
        "metadata": metadata or {},
    },
)
```

**Tracking:** Line 667: `observe.track_event(event)`

---

## AgentStartEvent and AgentEndEvent Creation Points

### 1. on_chain_start (Agent Start)
**File:** `/Users/vedantvyas/Desktop/GATI/gati-sdk/sdk/gati/instrumentation/langchain/callback.py`
**Lines:** 415-449
**Method Signature:** `def on_chain_start(self, serialized: Dict[str, Any], inputs: Dict[str, Any], **kwargs: Any) -> None:`

**Event Creation Location:** Line 433-443
```python
event = AgentStartEvent(
    run_id=run_id,
    input=self._safe_dict(inputs),
    metadata={
        "chain_name": chain_name,
        "serialized": self._safe_dict(serialized),
        "parent_run_id": parent_run_id,
        "tags": tags or [],
        "metadata": metadata or {},
    },
)
```

**Tracking:** Line 444: `observe.track_event(event)`

**Condition:** Only created if `self._is_agent_chain(chain_name)` is True (line 432)

---

### 2. on_chain_end (Agent End)
**File:** `/Users/vedantvyas/Desktop/GATI/gati-sdk/sdk/gati/instrumentation/langchain/callback.py`
**Lines:** 451-487
**Method Signature:** `def on_chain_end(self, outputs: Dict[str, Any], **kwargs: Any) -> None:`

**Event Creation Location:** Line 466-470
```python
event = AgentEndEvent(
    run_id=run_id,
    output=self._safe_dict(outputs),
    total_duration_ms=duration_ms,
)
```

**Tracking:** Line 471: `observe.track_event(event)`

**Condition:** Only created if `self._is_agent_chain(chain_name)` is True (line 465)

---

## Auto-Injection Event Creation Points

### AgentStartEvent (Auto-Injection Sync)
**File:** `/Users/vedantvyas/Desktop/GATI/gati-sdk/sdk/gati/instrumentation/langchain/auto_inject.py`
**Lines:** 637-656
**Location:** Inside `_invoke_with_callbacks` function

**Event Creation:** Line 642-650
```python
start_event = AgentStartEvent(
    run_id=new_run_id,
    agent_name=agent_name,
    input=serialize(input_data),
    metadata={
        "auto_tracked": True,
        "runnable_type": type(runnable_self).__name__,
    }
)
```

**Tracking:** Line 656: `observe.track_event(start_event)`

**Condition:** Only if `is_agent_call` is True (line 637)

---

### AgentEndEvent (Auto-Injection Sync)
**File:** `/Users/vedantvyas/Desktop/GATI/gati-sdk/sdk/gati/instrumentation/langchain/auto_inject.py`
**Lines:** 672-704
**Location:** Inside `_invoke_with_callbacks` function finally block

**Event Creation:** Line 694-699
```python
end_event = AgentEndEvent(
    run_id=new_run_id,
    output=serialize(output) if output is not None else {},
    total_duration_ms=duration_ms,
    metadata=end_event_data
)
```

**Tracking:** Line 701: `observe.track_event(end_event)`

**Condition:** Only if `is_agent_call` is True (line 675)

---

### AgentStartEvent (Auto-Injection Async)
**File:** `/Users/vedantvyas/Desktop/GATI/gati-sdk/sdk/gati/instrumentation/langchain/auto_inject.py`
**Lines:** 779-801
**Location:** Inside `_ainvoke_with_callbacks` function

**Event Creation:** Line 787-795
```python
start_event = AgentStartEvent(
    run_id=new_run_id,
    agent_name=agent_name,
    input=serialize(input_data),
    metadata={
        "auto_tracked": True,
        "runnable_type": type(runnable_self).__name__,
    }
)
```

**Tracking:** Line 801: `observe.track_event(start_event)`

**Condition:** Only if `is_agent_call` is True (line 782)

---

### AgentEndEvent (Auto-Injection Async)
**File:** `/Users/vedantvyas/Desktop/GATI/gati-sdk/sdk/gati/instrumentation/langchain/auto_inject.py`
**Lines:** 817-849
**Location:** Inside `_ainvoke_with_callbacks` function finally block

**Event Creation:** Line 839-844
```python
end_event = AgentEndEvent(
    run_id=new_run_id,
    output=serialize(output) if output is not None else {},
    total_duration_ms=duration_ms,
    metadata=end_event_data
)
```

**Tracking:** Line 846: `observe.track_event(end_event)`

**Condition:** Only if `is_agent_call` is True (line 820)

---

## Callback Handler Methods Summary

### LangChain Callback Handler Class: GatiLangChainCallback

**File:** `/Users/vedantvyas/Desktop/GATI/gati-sdk/sdk/gati/instrumentation/langchain/callback.py`
**Base Class:** `BaseCallbackHandler`

#### LLM Callbacks
1. **on_llm_start** (Line 121)
   - Caches metadata for later use in on_llm_end
   - Stores system/user prompts
   - Sets up streaming token accumulation
   - Does NOT create event (avoids duplicates)

2. **on_llm_end** (Line 196)
   - Creates LLMCallEvent with full details
   - Extracts tokens, latency, cost, completion text
   - Tracks parent-child relationships
   - Tracks the event

3. **on_llm_error** (Line 339)
   - Creates LLMCallEvent with error status
   - Tracks error type and message
   - Tracks the event

4. **on_llm_new_token** (Line 369)
   - Accumulates streaming tokens
   - No event created

#### Tool Callbacks
1. **on_tool_start** (Line 529)
   - Caches tool input and metadata
   - Does NOT create event (avoids duplicates)

2. **on_tool_end** (Line 578)
   - Creates ToolCallEvent with full details
   - Tracks parent-child relationships
   - Tracks the event

3. **on_tool_error** (Line 644)
   - Creates ToolCallEvent with error status
   - Tracks error type and message
   - Tracks the event

#### Chain Callbacks
1. **on_chain_start** (Line 415)
   - Creates AgentStartEvent if chain is an agent
   - Otherwise no event

2. **on_chain_end** (Line 451)
   - Creates AgentEndEvent if chain is an agent
   - Cleans up internal mappings
   - Tracks the event

3. **on_chain_error** (Line 489)
   - Creates StepEvent for error tracking

---

## Event Definition Location

**File:** `/Users/vedantvyas/Desktop/GATI/gati-sdk/sdk/gati/core/event.py`

### LLMCallEvent Class Definition (Lines 67-92)
```python
@dataclass
class LLMCallEvent(Event):
    """Event for tracking LLM calls."""
    model: str = field(default="")
    prompt: str = field(default="")
    completion: str = field(default="")
    tokens_in: int = field(default=0)
    tokens_out: int = field(default=0)
    latency_ms: float = field(default=0.0)
    cost: float = field(default=0.0)
    system_prompt: str = field(default="")
```

### ToolCallEvent Class Definition (Lines 96-113)
```python
@dataclass
class ToolCallEvent(Event):
    """Event for tracking tool calls."""
    tool_name: str = field(default="")
    input: Dict[str, Any] = field(default_factory=dict)
    output: Dict[str, Any] = field(default_factory=dict)
    latency_ms: float = field(default=0.0)
```

### AgentStartEvent Class Definition (Lines 117-130)
```python
@dataclass
class AgentStartEvent(Event):
    """Event for tracking agent start."""
    input: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
```

### AgentEndEvent Class Definition (Lines 134-149)
```python
@dataclass
class AgentEndEvent(Event):
    """Event for tracking agent end."""
    output: Dict[str, Any] = field(default_factory=dict)
    total_duration_ms: float = field(default=0.0)
    total_cost: float = field(default=0.0)
```

---

## Flow Summary

### LLM Call Flow (Success Path)
1. `on_llm_start` → Caches metadata, extracts prompts, no event
2. `on_llm_new_token` → Accumulates tokens (for streaming)
3. `on_llm_end` → Creates and tracks LLMCallEvent

### Tool Execution Flow (Success Path)
1. `on_tool_start` → Caches input and metadata, no event
2. `on_tool_end` → Creates and tracks ToolCallEvent

### Agent Execution Flow (Success Path)
1. `on_chain_start` → Creates and tracks AgentStartEvent (if agent)
2. Multiple LLM and Tool events
3. `on_chain_end` → Creates and tracks AgentEndEvent (if agent)

### Auto-Injected Flow (Sync)
1. `_invoke_with_callbacks` detects agent
2. Creates run context
3. Creates and tracks AgentStartEvent
4. Injects callbacks
5. Executes original method
6. Creates and tracks AgentEndEvent (in finally)

### Auto-Injected Flow (Async)
1. `_ainvoke_with_callbacks` detects agent
2. Creates async run context
3. Creates and tracks AgentStartEvent
4. Injects callbacks
5. Awaits original method
6. Creates and tracks AgentEndEvent (in finally)

---

## Key Design Patterns

### Lazy Event Creation
- `on_llm_start` and `on_tool_start` don't create events; they cache data
- Events are created in `on_llm_end` and `on_tool_end` to avoid duplicates
- Ensures single event per operation

### Parent-Child Relationships
- Events track parent_event_id for hierarchical relationships
- Events track parent_run_id for context relationships
- Context variables store current parent for all child events

### Error Handling
- All callback methods wrapped in try-except
- Errors create simplified event versions
- Never raises exceptions to ensure reliability

### Streaming Support
- on_llm_new_token accumulates tokens
- Final token count used in on_llm_end
- Completion text built from streamed tokens

### Timing and Cost
- Monotonic clocks for accurate latency measurement
- Cost calculated based on model and token counts
- All timing cleaned up in finally blocks

---

## Files Involved

1. **Core Event Definitions:**
   - `/Users/vedantvyas/Desktop/GATI/gati-sdk/sdk/gati/core/event.py`

2. **LangChain Callback Handler:**
   - `/Users/vedantvyas/Desktop/GATI/gati-sdk/sdk/gati/instrumentation/langchain/callback.py`

3. **Auto-Injection System:**
   - `/Users/vedantvyas/Desktop/GATI/gati-sdk/sdk/gati/instrumentation/langchain/auto_inject.py`

4. **Event Observation/Tracking:**
   - `/Users/vedantvyas/Desktop/GATI/gati-sdk/sdk/gati/observe.py` (uses observe.track_event)

5. **Context Management:**
   - `/Users/vedantvyas/Desktop/GATI/gati-sdk/sdk/gati/core/context.py` (run context and parent tracking)

