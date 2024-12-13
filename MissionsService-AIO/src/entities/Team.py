import logging

import httpx
import os
from src.annotations.init_logger import init_logger
from src.config.Config import Config
from src.entities.BaseEntity import BaseEntity

config = Config().project_config


@init_logger(level=logging.INFO)
class Team(BaseEntity):
    """
    Represents a team in the system.

    Attributes:
        team_id (str): The unique identifier for the team.
    """

    def __init__(self, team_id: str, missions_id: list):
        self.team_id = team_id
        self.missions_id = missions_id
        self.logger.info(f"Team initialized: {self.to_dict()}")

    async def get_team_members(self):
        base_team_url = os.getenv('TEAMS_SERVICE_URL', config['teams_service']['base_url'])
        teams_auth_key = os.getenv('TEAMS_AUTH_KEY', config['teams_service']['auth_key'])

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{base_team_url}/teams/getTeam/{self.team_id}",
                headers={"api-key": teams_auth_key},
            )

            if response and response.status_code == 200:
                return [member['_id'] for member in response.json()['members']]
            return False

    @classmethod
    def from_dict(cls, data: dict):
        return cls(
            team_id=data['_id'],
            missions_id=data.setdefault("missions_id", []),
        )

    def to_dict(self):
        return {
            "_id": self.team_id,
            "missions_id": self.missions_id
        }
