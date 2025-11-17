"""Test query to debug agent sorting."""
import asyncio
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select, func
from app.database.connection import get_async_session
from app.models import Agent, Run

async def test_query():
    """Test the agent sorting query."""
    async for session in get_async_session():
        # Get agents with their latest run timestamp for sorting
        latest_run_subquery = (
            select(
                Run.agent_name,
                func.max(Run.created_at).label("latest_run_at")
            )
            .group_by(Run.agent_name)
            .subquery()
        )

        # Join agents with their latest run time and sort by it
        stmt = (
            select(Agent, latest_run_subquery.c.latest_run_at)
            .outerjoin(
                latest_run_subquery,
                Agent.name == latest_run_subquery.c.agent_name
            )
            .order_by(
                latest_run_subquery.c.latest_run_at.desc().nullslast()
            )
        )

        result = await session.execute(stmt)
        agents_with_timestamps = result.all()

        print(f"\nFound {len(agents_with_timestamps)} agents:")
        print("="*80)
        for i, (agent, latest_run_at) in enumerate(agents_with_timestamps[:10], 1):
            print(f"{i}. {agent.name:20} | Latest Run: {latest_run_at}")
        print("="*80)

        # Also get raw run data to compare
        print("\nLatest runs by agent:")
        print("="*80)
        runs_stmt = (
            select(Run.agent_name, func.max(Run.created_at).label("latest"))
            .group_by(Run.agent_name)
            .order_by(func.max(Run.created_at).desc())
            .limit(10)
        )
        runs_result = await session.execute(runs_stmt)
        runs_data = runs_result.all()
        for i, (agent_name, latest) in enumerate(runs_data, 1):
            print(f"{i}. {agent_name:20} | {latest}")
        print("="*80)

if __name__ == "__main__":
    asyncio.run(test_query())
