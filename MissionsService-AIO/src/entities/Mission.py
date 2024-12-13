import logging
import time

from src.annotations.init_logger import init_logger
from src.entities.BaseEntity import BaseEntity
from src.enums.MissionStatus import MissionStatus


@init_logger(level=logging.INFO)
class Mission(BaseEntity):
    """
    Represents a mission in the system.
    """

    def __init__(self, mission_id: str, creator_id: str, name: str, description: str, team_id: str,
                 deadline: int = None,
                 mark_id: str = None,
                 start_time: int = None, end_time: int = None,
                 mission_status: MissionStatus = MissionStatus.from_value(1), assigned_id: str = None,
                 history_assignee: list = None, created_at: float = None, updated_at: float = None,
                 publish_to_telegram: bool = False, is_attendance: bool = False):
        self.mission_id = mission_id
        self.creator_id = creator_id
        self.assigned_id = assigned_id
        self.name = name
        self.description = description
        self.start_time = start_time
        self.end_time = end_time
        self.deadline = deadline
        self.mark_id = mark_id
        self.mission_status = mission_status
        self.history_assignee = [] if not history_assignee else history_assignee
        self.created_at = created_at
        self.updated_at = updated_at
        self.team_id = team_id
        self.publish_to_telegram = publish_to_telegram
        self.is_attendance = is_attendance

    async def set_status(self, mission_status: MissionStatus):
        self.mission_status = mission_status

        if MissionStatus.ACTIVE == mission_status:
            self.start_time = time.time()

        elif MissionStatus.COMPLETED == mission_status:
            self.end_time = time.time()

    @classmethod
    def from_dict(cls, data: dict):
        return cls(
            mission_id=data['_id'],
            creator_id=data['creator_id'],
            assigned_id=data['assigned_id'],
            name=data['name'],
            description=data['description'],
            start_time=data['start_time'],
            end_time=data['end_time'],
            deadline=data['deadline'],
            mark_id=data['mark_id'],
            history_assignee=data['history_assignee'],
            mission_status=MissionStatus.from_value(data['mission_status']),
            created_at=data['created_at'],
            updated_at=data['updated_at'],
            team_id=data['team_id'],
            publish_to_telegram=data.setdefault('publish_to_telegram', False),
            is_attendance=data.setdefault('is_attendance', False)

        )

    def to_dict(self):
        return {
            "_id": self.mission_id,
            "creator_id": self.creator_id,
            "assigned_id": self.assigned_id,
            "name": self.name,
            "description": self.description,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "deadline": self.deadline,
            "mark_id": self.mark_id,
            "history_assignee": self.history_assignee,
            "mission_status": self.mission_status.value,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "team_id": self.team_id,
            "publish_to_telegram": self.publish_to_telegram,
            "is_attendance": self.is_attendance,
        }
