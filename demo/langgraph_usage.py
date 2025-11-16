"""
LangGraph Usage Demo with GATI
================================
A real-world example showing how to use GATI with LangGraph workflows.

This demo shows:
- GATI initialization (2 lines)
- LangGraph state machine with multiple nodes
- Automatic tracking of state changes and LLM calls
- Real OpenAI API usage
"""

import os
from typing import TypedDict
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# ===== GATI INITIALIZATION (2 LINES) =====
from gati import observe
observe.init(name="langgraph_demo")
# ==========================================

# Load environment variables
load_dotenv()

# Check for OpenAI API key
if not os.getenv("OPENAI_API_KEY"):
    print("ERROR: OPENAI_API_KEY not found in environment. Please set it or add to .env file.")
    exit(1)


# Define the state
class ResearchState(TypedDict):
    """State for the research workflow."""
    topic: str
    research_notes: str
    analysis: str
    summary: str
    final_report: str


# Initialize LLM
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)

print(f"--- System Initialized (Model: {llm.model_name}) ---")


# Define workflow nodes
def research_node(state: ResearchState) -> ResearchState:
    """Research the topic and gather information."""
    print("\n[STEP 1: RESEARCH NODE] Gathering information...")

    topic = state["topic"]

    # Create a prompt for research
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a research assistant. Provide 3-4 key facts about the given topic."),
        ("user", "Research topic: {topic}")
    ])

    chain = prompt | llm | StrOutputParser()
    research_result = chain.invoke({"topic": topic})

    print(f"  ✓ Research completed ({len(research_result)} characters)")

    # Update state
    return {"research_notes": research_result}


def analyze_node(state: ResearchState) -> ResearchState:
    """Analyze the research findings."""
    print("\n[STEP 2: ANALYZE NODE] Analyzing findings...")

    research_notes = state["research_notes"]

    # Create analysis prompt
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an analyst. Identify the main themes and important patterns in the research."),
        ("user", "Research findings:\n{research_notes}\n\nProvide your analysis.")
    ])

    chain = prompt | llm | StrOutputParser()
    analysis_result = chain.invoke({"research_notes": research_notes})

    print(f"  ✓ Analysis completed")

    # Update state
    return {"analysis": analysis_result}


def summarize_node(state: ResearchState) -> ResearchState:
    """Create a summary of the research."""
    print("\n[STEP 3: SUMMARIZE NODE] Creating summary...")

    research_notes = state["research_notes"]
    analysis = state["analysis"]

    # Create summary prompt
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a summarizer. Create a concise 2-3 sentence summary."),
        ("user", "Research:\n{research_notes}\n\nAnalysis:\n{analysis}\n\nProvide a brief summary.")
    ])

    chain = prompt | llm | StrOutputParser()
    summary_result = chain.invoke({
        "research_notes": research_notes,
        "analysis": analysis
    })

    print(f"  ✓ Summary created")

    # Update state
    return {"summary": summary_result}


def report_node(state: ResearchState) -> ResearchState:
    """Generate final report."""
    print("\n[STEP 4: REPORT NODE] Generating final report...")

    topic = state["topic"]
    summary = state["summary"]
    research_notes = state["research_notes"]
    analysis = state["analysis"]

    # Create report prompt
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a report writer. Create a well-structured professional report."),
        ("user", """Create a research report about '{topic}'.

Summary: {summary}

Research Findings:
{research_notes}

Analysis:
{analysis}

Format the report with:
1. Title
2. Executive Summary
3. Key Findings
4. Analysis
5. Conclusion""")
    ])

    chain = prompt | llm | StrOutputParser()
    report_result = chain.invoke({
        "topic": topic,
        "summary": summary,
        "research_notes": research_notes,
        "analysis": analysis
    })

    print(f"  ✓ Report generated ({len(report_result)} characters)")

    # Update state
    return {"final_report": report_result}


def build_research_graph():
    """Build the LangGraph workflow."""

    # Create graph
    workflow = StateGraph(ResearchState)

    # Add nodes
    workflow.add_node("research", research_node)
    workflow.add_node("analyze", analyze_node)
    workflow.add_node("summarize", summarize_node)
    workflow.add_node("report", report_node)

    # Define edges (workflow)
    workflow.set_entry_point("research")
    workflow.add_edge("research", "analyze")
    workflow.add_edge("analyze", "summarize")
    workflow.add_edge("summarize", "report")
    workflow.add_edge("report", END)

    return workflow.compile()


def main():
    """Run the LangGraph workflow demo."""
    print("\n" + "="*60)
    print("GATI + LangGraph Demo")
    print("="*60)

    # Test topics
    test_topics = [
        "Quantum Computing",
        "Climate Change Impact on Ocean Ecosystems",
        "The Future of Artificial Intelligence"
    ]

    # Use first topic
    topic = test_topics[0]
    print(f"\nResearch Topic: {topic}")
    print("-" * 60)

    # Build graph
    graph = build_research_graph()

    # Create initial state
    initial_state: ResearchState = {
        "topic": topic,
        "research_notes": "",
        "analysis": "",
        "summary": "",
        "final_report": ""
    }

    # Run workflow
    print("\nExecuting research workflow...")
    final_state = graph.invoke(initial_state)

    # Display results
    print("\n" + "="*60)
    print("WORKFLOW RESULTS")
    print("="*60)
    print(f"\nTopic: {final_state['topic']}")

    print(f"\n{'='*60}")
    print("SUMMARY")
    print("="*60)
    print(final_state['summary'])

    print(f"\n{'='*60}")
    print("FINAL REPORT")
    print("="*60)
    print(final_state['final_report'])

    print("\n" + "="*60)
    print("GATI Tracking")
    print("="*60)
    print("✓ All 4 node executions automatically tracked")
    print("✓ All 4 LLM calls automatically tracked")
    print("✓ All state changes automatically tracked")
    print("✓ Full execution graph captured")
    print("\nFlushing events to backend...")
    observe.flush()
    print("Done! Check dashboard at http://localhost:3000")


if __name__ == "__main__":
    main()
