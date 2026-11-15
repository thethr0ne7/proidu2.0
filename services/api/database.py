"""Single PostgreSQL connection pool. DB credentials are never sent to a client."""
from contextlib import asynccontextmanager
import os
from collections.abc import Iterator

from fastapi import HTTPException, Request
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool


@asynccontextmanager
async def lifespan(app):
    dsn = os.getenv("DATABASE_URL")
    if not dsn:
        app.state.pool = None
        yield
        return
    pool = ConnectionPool(
        conninfo=dsn,
        min_size=1,
        max_size=int(os.getenv("PG_POOL_MAX", "5")),
        kwargs={"row_factory": dict_row, "autocommit": True},
        open=False,
        timeout=6,
    )
    pool.open(wait=True)
    app.state.pool = pool
    try:
        yield
    finally:
        pool.close()


def get_connection(request: Request) -> Iterator:
    pool = getattr(request.app.state, "pool", None)
    if pool is None:
        raise HTTPException(status_code=503, detail="PostgreSQL not configured")
    with pool.connection() as conn:
        yield conn
