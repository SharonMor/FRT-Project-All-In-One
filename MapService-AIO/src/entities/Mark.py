import logging

from src.annotations.init_logger import init_logger
from src.entities.BaseEntity import BaseEntity
from src.entities.Location import Location
from src.enums.MarkType import MarkType
from src.enums.Size import Size
from src.utils.generators import generate_random_id


@init_logger(level=logging.INFO)
class Mark(BaseEntity):
    """
    Represents a map in the system.
    """

    def __init__(self, user_id: str, mark_type: MarkType, map_id: str, message_id: str, timestamp: int, active: bool,
                 location: Location, description: str, size: Size, title: str, publish_to_telegram: bool):
        self.user_id = user_id
        self.mark_type = mark_type
        self.map_id = map_id
        self.message_id = message_id
        self.timestamp = timestamp
        self.active = active
        self.location = location
        self.description = description
        self.size = size
        self.title = title
        self.publish_to_telegram = publish_to_telegram

        self.logger.info(f"Mark initialized: {self.to_dict()}")

    @classmethod
    def from_dict(cls, data: dict):
        return cls(
            map_id=data['map_id'],
            mark_type=MarkType.from_value(data['mark_type']),
            user_id=data['user_id'],
            message_id=data.setdefault("message_id", generate_random_id()),
            timestamp=data['timestamp'],
            active=data['active'],
            location=Location(**data['location']),
            description=data['description'],
            size=Size.from_value(data['size']),
            title=data['title'],
            publish_to_telegram=data.setdefault("publish_to_telegram", False)
        )

    def to_dict(self):
        return {
            "map_id": self.map_id,
            "mark_type": self.mark_type.value,
            "user_id": self.user_id,
            "message_id": self.message_id,
            "timestamp": self.timestamp,
            "active": self.active,
            "location": self.location.to_dict(),
            "description": self.description,
            "size": self.size.value,
            "title": self.title,
            "publish_to_telegram": self.publish_to_telegram

        }
