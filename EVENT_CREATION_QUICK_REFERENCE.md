# Quick Reference: Event Creation Points

## LLMCallEvent Creation

| Location | File | Lines | Method | Event Created | Condition |
|----------|------|-------|--------|----------------|-----------|
| on_llm_end (success) | callback.py | 293-321 | on_llm_end | LLMCallEvent | Always (line 327: track_event) |
| on_llm_error (error) | callback.py | 348-359 | on_llm_error | LLMCallEvent | Always (line 360: track_event) |

## ToolCallEvent Creation

| Location | File | Lines | Method | Event Created | Condition |
|----------|------|-------|--------|----------------|-----------|
| on_tool_end (success) | callback.py | 614-628 | on_tool_end | ToolCallEvent | Always (line 634: track_event) |
| on_tool_error (error) | callback.py | 654-666 | on_tool_error | ToolCallEvent | Always (line 667: track_event) |

## AgentStartEvent / AgentEndEvent Creation

| Location | File | Lines | Method/Function | Event Created | Condition |
|----------|------|-------|-----------------|----------------|-----------|
| on_chain_start | callback.py | 433-443 | on_chain_start | AgentStartEvent | if _is_agent_chain (line 432, track line 444) |
| on_chain_end | callback.py | 466-470 | on_chain_end | AgentEndEvent | if _is_agent_chain (line 465, track line 471) |
| auto_inject sync | auto_inject.py | 642-650 | _invoke_with_callbacks | AgentStartEvent | if is_agent_call (line 637, track line 656) |
| auto_inject sync end | auto_inject.py | 694-699 | _invoke_with_callbacks | AgentEndEvent | if is_agent_call (line 675, track line 701) |
| auto_inject async | auto_inject.py | 787-795 | _ainvoke_with_callbacks | AgentStartEvent | if is_agent_call (line 782, track line 801) |
| auto_inject async end | auto_inject.py | 839-844 | _ainvoke_with_callbacks | AgentEndEvent | if is_agent_call (line 820, track line 846) |

## Callback Methods by Type

### LLM Callbacks (GatiLangChainCallback)
- **Line 121**: on_llm_start - Caches metadata, no event
- **Line 196**: on_llm_end - Creates LLMCallEvent
- **Line 339**: on_llm_error - Creates LLMCallEvent (error)
- **Line 369**: on_llm_new_token - Accumulates tokens, no event

### Tool Callbacks (GatiLangChainCallback)
- **Line 529**: on_tool_start - Caches metadata, no event
- **Line 578**: on_tool_end - Creates ToolCallEvent
- **Line 644**: on_tool_error - Creates ToolCallEvent (error)

### Chain Callbacks (GatiLangChainCallback)
- **Line 415**: on_chain_start - Creates AgentStartEvent (conditional)
- **Line 451**: on_chain_end - Creates AgentEndEvent (conditional)
- **Line 489**: on_chain_error - Creates StepEvent

## Files to Review

1. `/Users/vedantvyas/Desktop/GATI/gati-sdk/sdk/gati/core/event.py` - Event class definitions
2. `/Users/vedantvyas/Desktop/GATI/gati-sdk/sdk/gati/instrumentation/langchain/callback.py` - Callback handler
3. `/Users/vedantvyas/Desktop/GATI/gati-sdk/sdk/gati/instrumentation/langchain/auto_inject.py` - Auto-injection logic

## Event Flow Diagram

```
LLM Execution Flow:
┌─ on_llm_start (line 121)
│  └─ Cache metadata, prompts, setup streaming
├─ on_llm_new_token (line 369) [optional, for streaming]
│  └─ Accumulate tokens
└─ on_llm_end (line 196) OR on_llm_error (line 339)
   └─ Create LLMCallEvent (line 293 or 348)
      └─ Track event (line 327 or 360)

Tool Execution Flow:
┌─ on_tool_start (line 529)
│  └─ Cache input, metadata
└─ on_tool_end (line 578) OR on_tool_error (line 644)
   └─ Create ToolCallEvent (line 614 or 654)
      └─ Track event (line 634 or 667)

Agent Execution Flow (Callback-based):
┌─ on_chain_start (line 415, if agent detected at line 432)
│  └─ Create AgentStartEvent (line 433)
│     └─ Track event (line 444)
├─ [Multiple LLM and Tool events]
└─ on_chain_end (line 451, if agent detected at line 465)
   └─ Create AgentEndEvent (line 466)
      └─ Track event (line 471)

Agent Execution Flow (Auto-Injection - Sync):
┌─ _invoke_with_callbacks (if agent detected at line 615)
│  ├─ Create run context
│  ├─ Create AgentStartEvent (line 642, if agent at line 637)
│  │  └─ Track event (line 656)
│  ├─ Inject callbacks
│  ├─ Execute method
│  └─ finally: Create AgentEndEvent (line 694, if agent at line 675)
│     └─ Track event (line 701)

Agent Execution Flow (Auto-Injection - Async):
┌─ _ainvoke_with_callbacks (if agent detected at line 759)
│  ├─ Create async run context
│  ├─ Create AgentStartEvent (line 787, if agent at line 782)
│  │  └─ Track event (line 801)
│  ├─ Inject callbacks
│  ├─ Await method
│  └─ finally: Create AgentEndEvent (line 839, if agent at line 820)
│     └─ Track event (line 846)
```

## Key Facts

1. **Lazy Event Creation**: on_llm_start and on_tool_start do NOT create events, only cache data
2. **Event Creation Happens**: In on_llm_end/on_llm_error and on_tool_end/on_tool_error
3. **Agent Detection**: Uses _is_agent_chain() or _is_agent_runnable() to determine if AgentEvents are needed
4. **Streaming Support**: Tokens accumulated in on_llm_new_token, finalized in on_llm_end
5. **Error Handling**: All methods wrapped in try-except, creates minimal event on error
6. **Parent-Child Tracking**: Parent event IDs propagated through context
7. **Timing**: Uses monotonic clock for latency_ms calculation
8. **Cost Calculation**: Based on model name and token counts

