import logging
import os
import httpx
from singleton_decorator import singleton

from src.annotations.init_logger import init_logger
from src.config.Config import Config

config = Config().project_config


@singleton
@init_logger(level=logging.INFO)
class Database:
    def __init__(self):
        self.base_url = os.getenv('DATABASE_SERVICE_URL', config['database']['base_url'])
        self.auth = os.getenv('DATABASE_AUTH_KEY', config['database']['auth_key'])

    async def get(self, request_type: int, key: str) -> dict | bool:
        """ Retrieve an entry """
        url = f"{self.base_url}/get/{request_type}/{key}"
        headers = {"api-key": self.auth}
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
            self.logger.info(f"Successfully retrieved value for key: {key}")
            return response.json()
        except Exception as e:
            self.logger.error(f"Failed to retrieve key {key}: {e}")
            return False

    async def post(self, request_type: int, key: str, value: dict) -> dict | bool:
        """ Create a new entry """
        url = f"{self.base_url}/post/{request_type}/{key}"
        headers = {"api-key": self.auth}
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=value, headers=headers)
                response.raise_for_status()
            self.logger.info(f"Successfully posted value for key: {key}")
            return response.json()
        except Exception as e:
            self.logger.error(f"Failed to post value for key {key}: {e}")
            return False

    async def update(self, request_type: int, key: str, value: dict) -> dict | bool:
        """ Update an existing entry """
        url = f"{self.base_url}/update/{request_type}/{key}"
        headers = {"api-key": self.auth}
        try:
            async with httpx.AsyncClient() as client:
                response = await client.put(url, json=value, headers=headers)
                response.raise_for_status()
            self.logger.info(f"Successfully updated value for key: {key}")
            return response.json()
        except Exception as e:
            self.logger.error(f"Failed to update value for key {key}: {e}")
            return False

    async def delete(self, request_type: int, key: str) -> dict | bool:
        """ Delete an entry """
        url = f"{self.base_url}/delete/{request_type}/{key}"
        headers = {"api-key": self.auth}
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(url, headers=headers)
                response.raise_for_status()
            self.logger.info(f"Successfully deleted key: {key}")
            return response.json()
        except Exception as e:
            self.logger.error(f"Failed to delete key {key}: {e}")
            return False
