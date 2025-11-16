"""
LangChain Usage Demo with GATI
================================
A real-world example showing how to use GATI with LangChain agents.

This demo shows:
- GATI initialization (2 lines)
- LangChain agent with tools (ReAct pattern)
- Automatic tracking of LLM calls and tool executions
- Real OpenAI API usage
"""

import os
import time
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

# ===== GATI INITIALIZATION (2 LINES) =====
from gati import observe
observe.init(name="langchain_demo")
# ==========================================

# Load environment variables
load_dotenv()

# Check for OpenAI API key
if not os.getenv("OPENAI_API_KEY"):
    print("ERROR: OPENAI_API_KEY not found in environment. Please set it or add to .env file.")
    exit(1)


# Define tools
@tool
def calculate(expression: str) -> str:
    """Calculate a mathematical expression. Use this for math operations.

    Args:
        expression: A valid Python math expression (e.g., "2 + 2", "10 * 5")
    """
    print(f"  [TOOL] Calculating: {expression}")
    try:
        result = eval(expression)
        return f"Result: {result}"
    except Exception as e:
        return f"Error calculating: {str(e)}"


@tool
def search_web(query: str) -> str:
    """Search the web for information. Use this to find current information.

    Args:
        query: The search query
    """
    print(f"  [TOOL] Searching for: {query}")
    time.sleep(0.5)  # Simulate API call

    # Simulated web search
    responses = {
        "weather": "The current weather is sunny with a temperature of 72°F.",
        "python": "Python is a high-level programming language known for its simplicity and readability. Created by Guido van Rossum in 1991.",
        "ai": "Artificial Intelligence (AI) is the simulation of human intelligence by machines. Recent advances in deep learning have revolutionized the field.",
        "gati": "GATI is a local-first observability platform for AI agents. It tracks LLM calls, tool usage, and execution flows.",
        "quantum": "Quantum computing uses quantum mechanics to process information. Companies like IBM and Google are leading quantum research.",
    }

    # Find matching response
    for key, response in responses.items():
        if key in query.lower():
            return response

    return f"Search results for '{query}': Information about {query} from the web. Multiple sources confirm this is an interesting topic."


@tool
def get_user_info(user_id: str) -> str:
    """Get information about a user.

    Args:
        user_id: The user ID to lookup
    """
    print(f"  [TOOL] Looking up user: {user_id}")
    time.sleep(0.3)  # Simulate database lookup

    # Simulated user database
    users = {
        "user123": "Name: John Doe, Plan: Premium, Status: Active, Joined: 2023-01-15",
        "user456": "Name: Jane Smith, Plan: Basic, Status: Active, Joined: 2023-06-20",
        "user789": "Name: Bob Johnson, Plan: Enterprise, Status: Trial, Joined: 2024-01-01",
    }

    return users.get(user_id, f"User {user_id} not found in database")


# Initialize LLM with tool binding
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# Create tools list
tools = [calculate, search_web, get_user_info]

# Bind tools to LLM (this enables tool calling)
llm_with_tools = llm.bind_tools(tools)

print(f"--- System Initialized (Model: {llm.model_name}) ---")
print(f"--- LLM bound with {len(tools)} tools ---")


def process_tool_calls(query: str):
    """Process a query using LLM with tool calling."""
    print(f"\n{'='*60}")
    print(f"Processing Query: {query}")
    print('='*60)

    # Step 1: LLM decides which tool to call
    print("\n[STEP 1: LLM decides tool usage]")
    response = llm_with_tools.invoke(query)

    # Check if tool calls were requested
    if hasattr(response, 'tool_calls') and response.tool_calls:
        tool_calls = response.tool_calls
        print(f"LLM requested {len(tool_calls)} tool call(s)")

        # Execute tool calls
        tool_results = []
        for tool_call in tool_calls:
            tool_name = tool_call['name']
            tool_args = tool_call['args']

            print(f"\n[TOOL CALL]: {tool_name} with args: {tool_args}")

            # Find and execute the tool
            tool_map = {t.name: t for t in tools}
            if tool_name in tool_map:
                tool = tool_map[tool_name]
                result = tool.invoke(tool_args)
                tool_results.append(result)
                print(f"[TOOL RESULT]: {result}")

        # Step 2: Send tool results back to LLM for final answer
        print("\n[STEP 2: LLM generates final answer]")
        final_prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a helpful assistant. Use the tool results to answer the user's question."),
            ("human", "Question: {question}\n\nTool Results: {tool_results}\n\nProvide a clear answer.")
        ])
        chain = final_prompt | llm | StrOutputParser()
        final_answer = chain.invoke({"question": query, "tool_results": "\n".join(str(r) for r in tool_results)})
        return final_answer
    else:
        # No tool calls needed, use LLM directly
        print("LLM answered directly without tools")
        return response.content


def main():
    """Run the LangChain demo."""
    print("\n" + "="*60)
    print("GATI + LangChain Tool Calling Demo")
    print("="*60)

    # Test queries
    test_queries = [
        "What is Python programming?",
        "Calculate 15 * 23",
        "Search for information about artificial intelligence",
        "Get information for user123"
    ]

    # Try different queries to see tool usage
    # test_queries[0] - May not use tools (general knowledge)
    # test_queries[1] - Uses calculate tool
    # test_queries[2] - Uses search_web tool
    # test_queries[3] - Uses get_user_info tool
    query = test_queries[1]  # Calculate example

    result = process_tool_calls(query)

    # Display result
    print("\n" + "="*60)
    print("FINAL RESULT")
    print("="*60)
    print(result)

    print("\n" + "="*60)
    print("GATI Tracking")
    print("="*60)
    print("✓ All LLM calls automatically tracked")
    print("✓ All tool executions automatically tracked")
    print("✓ Full execution trace captured")
    print("\nFlushing events to backend...")
    observe.flush()
    time.sleep(1)
    print("Done! Check dashboard at http://localhost:3000")


if __name__ == "__main__":
    main()
