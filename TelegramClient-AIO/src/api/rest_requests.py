import httpx
import os
from src.config.Config import Config

config = Config().project_config
teams_base_url = os.getenv('TEAMS_SERVICE_URL', config['teams_service']['base_url'])
teams_auth_key = os.getenv('TEAMS_AUTH_KEY', config['teams_service']['auth_key'])
users_base_url = os.getenv('USERS_SERVICE_URL', config['users_service']['base_url'])
users_auth_key = os.getenv('USERS_AUTH_KEY', config['users_service']['auth_key'])
messenger_base_url = os.getenv('MESSENGER_SERVICE_URL', config['messenger_service']['base_url'])
messenger_auth_key = os.getenv('MESSENGER_AUTH_KEY', config['messenger_service']['auth_key'])


async def get_team(team_id: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{teams_base_url}/teams/getTeam/{team_id}",
            headers={"api-key": teams_auth_key},
        )
        return response.status_code, response.json()


async def get_teams(team_ids: list):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{teams_base_url}/teams/getTeams",
            headers={"api-key": teams_auth_key},
            json={"team_ids": team_ids}
        )
        return response.status_code, response.json()


async def get_users(user_ids: list[str]):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{users_base_url}/users/getUsersByIds",
            headers={"api-key": users_auth_key},
            json={"userIds": user_ids}
        )
        return response.status_code, response.json()


async def get_message(chat_id, message_id):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{messenger_base_url}/messenger/getMessage/{chat_id}/{message_id}",
            headers={"api-key": messenger_auth_key},
        )
        return response.status_code, response.json()
