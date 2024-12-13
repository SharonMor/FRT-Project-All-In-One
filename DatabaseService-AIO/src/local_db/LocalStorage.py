import asyncio

import diskcache as dc
from singleton_decorator import singleton

from src.Database import Database
from src.annotations.init_logger import init_logger


@singleton
@init_logger()
class LocalStorage(Database):
    def __init__(self, cache_dir='/LocalMemory/my_cache', expiration_time=604800):
        """
        Initialize the LocalStorage singleton instance.

        Args:
            cache_dir (str): The directory where the cache is stored.
            expiration_time (int): The expiration time for cache entries in seconds.
        """
        self._expiration_time = expiration_time  # 1 week
        self._cache_dir = cache_dir
        self.init_db()
        self.logger.info("LocalStorage initialized")

    def init_db(self):
        """
        Initialize the cache storage.
        """
        try:
            self._cache = dc.Cache(self._cache_dir)
            self._lock = asyncio.Semaphore(1)  # Initialize semaphore for async lock
            self.logger.info("Cache storage initialized successfully.")
        except Exception as e:
            self.logger.error(f"Failed to initialize cache storage: {e}")

    def close_db(self):
        """
        Close the cache storage.
        """
        self.close_cache()

    async def update(self, key: str, partial_value: dict) -> bool:
        """
        Update a resource in the cache.

        Args:
            key (str): The key of the resource to update.
            partial_value (dict): The partial values to update the resource with.

        Returns:
            bool: True if the resource was updated, False otherwise.
        """
        async with self._lock:
            try:
                if key not in self._cache:
                    self.logger.warning(f"Key does not exist: {key}")
                    return False
                current_value = self._cache[key]
                updated_value = {**current_value, **partial_value}
                self._cache.set(key, updated_value, expire=self._expiration_time)
                self.logger.info(f"Resource updated: {key}")
                return True
            except Exception as e:
                self.logger.error(f"Failed to update resource: {e}")
                return False

    async def post(self, key: str, value: dict) -> bool:
        """
        Post a new resource to the cache.

        Args:
            key (str): The key of the resource to post.
            value (dict): The value of the resource to post.

        Returns:
            bool: True if the resource was posted, False otherwise.
        """
        async with self._lock:
            try:
                if key in self._cache:
                    self.logger.warning(f"Resource already exists: {key}")
                    return False
                self._cache.set(key, value, expire=self._expiration_time)
                self.logger.info(f"Resource posted: {key}")
                return True
            except Exception as e:
                self.logger.error(f"Failed to post resource: {e}")
                return False

    async def get(self, key: str):
        """
        Get a resource from the cache.

        Args:
            key (str): The key of the resource to get.

        Returns:
            The value of the resource if found, None otherwise.
        """
        async with self._lock:
            try:
                value = self._cache.get(key, default=None)
                if value is None:
                    self.logger.warning(f"Resource not found: {key}")
                else:
                    self.logger.info(f"Resource retrieved: {key}")
                return value
            except Exception as e:
                self.logger.error(f"Failed to get resource: {e}")
                return None

    async def delete(self, key: str) -> bool:
        """
        Delete a resource from the cache.

        Args:
            key (str): The key of the resource to delete.

        Returns:
            bool: True if the resource was deleted, False otherwise.
        """
        async with self._lock:
            try:
                if key not in self._cache:
                    self.logger.warning(f"Resource not found: {key}")
                    return False
                del self._cache[key]
                self.logger.info(f"Resource deleted: {key}")
                return True
            except Exception as e:
                self.logger.error(f"Failed to delete resource: {e}")
                return False

    def close_cache(self):
        """
        Properly close the cache when done.
        """
        try:
            self._cache.close()
            self.logger.info("Cache closed successfully.")
        except Exception as e:
            self.logger.error(f"Failed to close cache: {e}")
