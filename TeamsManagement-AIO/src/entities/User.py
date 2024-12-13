import logging

from src.annotations.init_logger import init_logger
from src.entities.BaseEntity import BaseEntity


@init_logger(level=logging.INFO)
class User(BaseEntity):
    """
    Represents a user in the system.

    Attributes:
        user_id (str): The unique identifier for the user.
    """

    def __init__(self, user_id: str, team_ids: list):
        self.user_id = user_id
        self.team_ids = team_ids
        self.logger.info(f"User initialized: {self.to_dict()}")

    def __eq__(self, other):
        return self.user_id == other.user_id

    @classmethod
    def from_dict(cls, data: dict):
        return cls(
            user_id=data['_id'],
            team_ids=data.setdefault("team_ids", [])
        )

    def to_dict(self):
        return {
            "_id": self.user_id,
            "team_ids": self.team_ids
        }
