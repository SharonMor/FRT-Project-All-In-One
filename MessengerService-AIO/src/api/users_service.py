import httpx
import os
from src.config.Config import Config

config = Config().project_config

users_base_url = os.getenv('USERS_SERVICE_URL', config['users_service']['base_url'])
users_auth_key = os.getenv('USERS_AUTH_KEY', config['users_service']['auth_key'])


async def get_users(user_ids: list[str]):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{users_base_url}/users/getUsersByIds",
            headers={"api-key": users_auth_key},
            json={"userIds": user_ids}
        )
        return response.status_code, response.json()
