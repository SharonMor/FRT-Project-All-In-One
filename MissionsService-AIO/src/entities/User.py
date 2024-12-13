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

    def __init__(self, user_id: str, created_missions_ids: list, assigned_missions_ids: list):
        self.user_id = user_id
        self.created_missions_ids = created_missions_ids
        self.assigned_missions_ids = assigned_missions_ids
        self.logger.info(f"User initialized: {self.to_dict()}")

    @classmethod
    def from_dict(cls, data: dict):
        return cls(
            user_id=data['_id'],
            created_missions_ids=data.setdefault("created_missions_ids", []),
            assigned_missions_ids=data.setdefault("assigned_missions_ids", [])
        )

    def to_dict(self):
        return {
            "_id": self.user_id,
            "created_missions_ids": self.created_missions_ids,
            "assigned_missions_ids": self.assigned_missions_ids
        }
