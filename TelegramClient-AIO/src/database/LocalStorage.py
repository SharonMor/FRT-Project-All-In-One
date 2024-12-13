import asyncio
import logging

import diskcache as dc
from singleton_decorator import singleton

from src.annotations.init_logger import init_logger
from src.config.contants import CACHE_PATH


@singleton
@init_logger(level=logging.INFO)
class LocalStorage:
    def __init__(self):
        self._cache = dc.Cache(CACHE_PATH)
        self._lock = asyncio.Semaphore(1)

    async def get_resource(self, key: str):
        async with self._lock:
            if key not in self._cache:
                self.logger.info("Trying to get a non-existing resource")
                return False
            return self._cache[key]

    async def post_resource(self, key: str, value: dict):
        async with self._lock:
            self._cache.set(key, value)
            return True

    async def delete_resource(self, key: str):
        async with self._lock:
            if key not in self._cache:
                self.logger.warning("Trying to delete a non-existing resource")
                return False
            del self._cache[key]
            return True

    async def put_resource(self, key: str, partial_value: dict):
        async with self._lock:
            if key not in self._cache:
                self.logger.warning("Key does not exist. Use post_resource to create a new resource.")
                return False
            current_value = self._cache[key]
            updated_value = {**current_value, **partial_value}
            self._cache.set(key, updated_value)
            return True

    def close_cache(self):
        self._cache.close()
