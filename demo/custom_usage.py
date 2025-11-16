"""
Custom Agent Usage Demo with GATI
===================================
A real-world example showing how to use GATI with custom Python agents.

This demo shows:
- GATI initialization (2 lines)
- Custom agent with decorators (@track_agent, @track_tool)
- Manual tracking of custom logic
- Real OpenAI API usage
"""

import os
import time
from dotenv import load_dotenv
from openai import OpenAI

# ===== GATI INITIALIZATION (2 LINES) =====
from gati import observe
observe.init(name="custom_agent")
# ==========================================

# Additional imports for decorators
from gati.decorators import track_tool

# Load environment variables
load_dotenv()

# Check for OpenAI API key
if not os.getenv("OPENAI_API_KEY"):
    print("ERROR: OPENAI_API_KEY not found in environment. Please set it or add to .env file.")
    exit(1)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# Define tools with @track_tool decorator
@track_tool
def fetch_news(topic: str) -> str:
    """Fetch latest news about a topic (simulated)."""
    print(f"  [TOOL] Fetching news about: {topic}")
    time.sleep(0.5)  # Simulate API call

    # Simulated news data
    news_db = {
        "ai": "AI companies announce breakthrough in natural language processing. New models show 30% improvement in reasoning tasks. Major tech firms invest billions in AI safety research.",
        "climate": "Scientists report significant progress in renewable energy efficiency. Solar panels reach 40% efficiency in laboratory tests. Carbon capture technology shows promise in pilot programs.",
        "technology": "Tech giants invest $50B in quantum computing research. First commercial quantum computer expected by 2026. Breakthrough in room-temperature superconductors reported.",
        "finance": "Stock markets reach all-time high. Tech sector leads growth with 15% gains this quarter. Cryptocurrency markets stabilize after regulatory clarity.",
        "quantum": "Quantum computing advances with new error correction methods. IBM and Google compete for quantum supremacy. Applications in drug discovery show early success.",
    }

    for key, news in news_db.items():
        if key in topic.lower():
            return news

    return f"Latest news about {topic}: Market shows positive trends with steady growth. Industry experts predict continued innovation and development."


@track_tool
def analyze_sentiment(text: str) -> str:
    """Analyze sentiment of text (simulated)."""
    print(f"  [TOOL] Analyzing sentiment...")
    time.sleep(0.3)  # Simulate processing

    # Simple keyword-based sentiment (in real world, use proper NLP)
    positive_words = ["breakthrough", "progress", "growth", "positive", "improvement", "gains", "success", "advance"]
    negative_words = ["decline", "loss", "crisis", "problem", "failure", "concern", "risk", "threat"]

    text_lower = text.lower()
    pos_count = sum(1 for word in positive_words if word in text_lower)
    neg_count = sum(1 for word in negative_words if word in text_lower)

    if pos_count > neg_count:
        sentiment = "Positive"
        confidence = min(95, 60 + (pos_count * 10))
    elif neg_count > pos_count:
        sentiment = "Negative"
        confidence = min(95, 60 + (neg_count * 10))
    else:
        sentiment = "Neutral"
        confidence = 50

    return f"{sentiment} (confidence: {confidence}%, positive keywords: {pos_count}, negative keywords: {neg_count})"


@track_tool
def summarize_with_llm(text: str, max_sentences: int = 2) -> str:
    """Summarize text using OpenAI API."""
    print(f"  [TOOL] Summarizing with LLM...")

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": f"Summarize the following text in {max_sentences} sentences or less. Be concise and focus on key points."},
            {"role": "user", "content": text}
        ],
        temperature=0.3
    )

    return response.choices[0].message.content


# Define the main agent function (no decorator needed - observe.init() handles the run)
def news_analyst_agent(topic: str, include_summary: bool = True) -> dict:
    """
    A custom agent that analyzes news about a topic.

    This agent:
    1. Fetches news about the topic
    2. Analyzes sentiment
    3. Optionally creates a summary
    4. Generates insights using LLM

    Args:
        topic: The topic to analyze
        include_summary: Whether to include AI-generated summary

    Returns:
        Dictionary with analysis results
    """
    print(f"\n[AGENT] Starting analysis for topic: {topic}")

    # Step 1: Fetch news
    print("\n[STEP 1] Fetching news...")
    news = fetch_news(topic)
    print(f"  ✓ News retrieved: {len(news)} characters")

    # Step 2: Analyze sentiment
    print("\n[STEP 2] Analyzing sentiment...")
    sentiment = analyze_sentiment(news)
    print(f"  ✓ Sentiment: {sentiment}")

    # Step 3: Generate summary (if requested)
    summary = None
    if include_summary:
        print("\n[STEP 3] Generating summary...")
        summary = summarize_with_llm(news)
        print(f"  ✓ Summary created: {len(summary)} characters")

    # Step 4: Generate insights using LLM
    print("\n[STEP 4] Generating insights...")
    insight_response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a news analyst. Provide key insights and implications based on the news. Focus on what this means for the industry and stakeholders."},
            {"role": "user", "content": f"News: {news}\n\nSentiment: {sentiment}\n\nWhat are the key insights and implications?"}
        ],
        temperature=0.7
    )
    insights = insight_response.choices[0].message.content
    print(f"  ✓ Insights generated: {len(insights)} characters")

    # Compile results
    results = {
        "topic": topic,
        "news": news,
        "sentiment": sentiment,
        "summary": summary,
        "insights": insights,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }

    print(f"\n[AGENT] Analysis complete!")
    return results


def main():
    """Run the custom agent demo."""
    print("\n" + "="*60)
    print("GATI + Custom Agent Demo")
    print("="*60)

    # Test topics
    test_topics = [
        "artificial intelligence",
        "climate change",
        "quantum computing"
    ]

    # Use first topic
    topic = test_topics[0]
    print(f"\nAnalyzing topic: {topic}")
    print("-" * 60)

    # Run the agent
    results = news_analyst_agent(topic, include_summary=True)

    # Display results
    print("\n" + "="*60)
    print("ANALYSIS RESULTS")
    print("="*60)
    print(f"\nTopic: {results['topic']}")
    print(f"Timestamp: {results['timestamp']}")

    print(f"\n{'='*60}")
    print("NEWS")
    print("="*60)
    print(results['news'])

    print(f"\n{'='*60}")
    print("SENTIMENT")
    print("="*60)
    print(results['sentiment'])

    if results['summary']:
        print(f"\n{'='*60}")
        print("SUMMARY")
        print("="*60)
        print(results['summary'])

    print(f"\n{'='*60}")
    print("INSIGHTS")
    print("="*60)
    print(results['insights'])

    print("\n" + "="*60)
    print("GATI Tracking")
    print("="*60)
    print("✓ Run created automatically via observe.init()")
    print("✓ All 3 tool calls tracked (@track_tool)")
    print("✓ 2 LLM calls tracked (summary + insights)")
    print("✓ Sequential tool calls linked via previous_event_id")
    print("\nFlushing events to backend...")
    observe.flush()
    print("Done! Check dashboard at http://localhost:3000")


if __name__ == "__main__":
    main()
