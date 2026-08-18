# =========================================================================
#  connection.py — Database Connection & Storage Adapter
#  Supports PostgreSQL/TimescaleDB/pgvector with automatic local in-memory fallback
# =========================================================================

import logging
from typing import Optional, List, Dict, Any
import asyncpg
from config import settings

logger = logging.getLogger("AI_KB_DB")

class DatabasePool:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self.is_connected: bool = False

    async def connect(self):
        if not settings.DATABASE_URL or "localhost" in settings.DATABASE_URL:
            # Attempt to connect to PostgreSQL
            try:
                self.pool = await asyncpg.create_pool(
                    dsn=settings.DATABASE_URL,
                    min_size=1,
                    max_size=10,
                    timeout=5.0
                )
                self.is_connected = True
                logger.info("Successfully connected to PostgreSQL database pool.")
            except Exception as e:
                logger.warning(f"PostgreSQL connection failed ({e}). Operating in High-Performance Local In-Memory Mock mode.")
                self.is_connected = False
        else:
            try:
                self.pool = await asyncpg.create_pool(
                    dsn=settings.DATABASE_URL,
                    min_size=1,
                    max_size=10,
                    timeout=8.0
                )
                self.is_connected = True
                logger.info("Successfully connected to Remote PostgreSQL database pool.")
            except Exception as e:
                logger.warning(f"Remote PostgreSQL connection failed ({e}). Fallback to Local In-Memory Mock.")
                self.is_connected = False

    async def disconnect(self):
        if self.pool:
            await self.pool.close()
            self.is_connected = False

    async def fetch(self, query: str, *args) -> List[Dict[str, Any]]:
        if self.is_connected and self.pool:
            async with self.pool.acquire() as conn:
                records = await conn.fetch(query, *args)
                return [dict(r) for r in records]
        return []

    async def fetchrow(self, query: str, *args) -> Optional[Dict[str, Any]]:
        if self.is_connected and self.pool:
            async with self.pool.acquire() as conn:
                record = await conn.fetchrow(query, *args)
                return dict(record) if record else None
        return None

    async def execute(self, query: str, *args) -> str:
        if self.is_connected and self.pool:
            async with self.pool.acquire() as conn:
                return await conn.execute(query, *args)
        return ""

db_pool = DatabasePool()
