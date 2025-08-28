"""
Database connection pooling for better performance
"""
import os
import logging
from typing import Optional

try:
    import asyncpg
except ImportError:
    asyncpg = None
    logging.warning("asyncpg not installed, some features may not work")

logger = logging.getLogger(__name__)


class DatabasePool:
    """Singleton database connection pool"""
    _instance = None
    _pool: Optional[asyncpg.Pool] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    async def initialize(self, 
                        database_url: Optional[str] = None,
                        min_size: int = 10,
                        max_size: int = 20,
                        max_queries: int = 50000,
                        timeout: float = 60.0) -> None:
        """Initialize the connection pool"""
        if self._pool is not None:
            logger.warning("Database pool already initialized")
            return
        
        db_url = database_url or os.getenv("DATABASE_URL")
        if not db_url:
            raise ValueError("DATABASE_URL is required")
        
        try:
            self._pool = await asyncpg.create_pool(
                db_url,
                min_size=min_size,
                max_size=max_size,
                max_queries=max_queries,
                timeout=timeout,
                command_timeout=timeout
            )
            logger.info(f"Database pool initialized with {min_size}-{max_size} connections")
        except Exception as e:
            logger.error(f"Failed to initialize database pool: {str(e)}")
            raise
    
    async def get_connection(self):
        """Get a connection from the pool"""
        if self._pool is None:
            await self.initialize()
        
        return self._pool.acquire()
    
    async def execute(self, query: str, *args, timeout: float = None):
        """Execute a query using the pool"""
        async with await self.get_connection() as conn:
            return await conn.execute(query, *args, timeout=timeout)
    
    async def fetch(self, query: str, *args, timeout: float = None):
        """Fetch results using the pool"""
        async with await self.get_connection() as conn:
            return await conn.fetch(query, *args, timeout=timeout)
    
    async def fetchrow(self, query: str, *args, timeout: float = None):
        """Fetch a single row using the pool"""
        async with await self.get_connection() as conn:
            return await conn.fetchrow(query, *args, timeout=timeout)
    
    async def fetchval(self, query: str, *args, timeout: float = None):
        """Fetch a single value using the pool"""
        async with await self.get_connection() as conn:
            return await conn.fetchval(query, *args, timeout=timeout)
    
    async def close(self):
        """Close the connection pool"""
        if self._pool:
            await self._pool.close()
            self._pool = None
            logger.info("Database pool closed")


# Global pool instance
db_pool = DatabasePool()