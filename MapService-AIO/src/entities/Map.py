import logging

from src.annotations.init_logger import init_logger
from src.entities.BaseEntity import BaseEntity
from src.entities.Location import Location
from src.entities.Mark import Mark


@init_logger(level=logging.INFO)
class Map(BaseEntity):
    """
    Represents a map in the system.
    """

    def __init__(self, map_id: str, active_marks: list, scale: float, initial_location: Location):
        self.map_id = map_id
        self.active_marks = active_marks
        self.scale = scale
        self.initial_location = initial_location
        self.logger.info(f"Map initialized: {self.to_dict()}")

    @classmethod
    def from_dict(cls, data: dict):
        marks = [Mark.from_dict(udict) for udict in data.get('active_marks', [])]

        return cls(
            map_id=data['_id'],
            active_marks=marks,
            scale=data['scale'],
            initial_location=Location.from_dict(data['initial_location'])
        )

    def to_dict(self):
        return {
            "_id": self.map_id,
            "active_marks": [mark.to_dict() for mark in self.active_marks],
            "scale": self.scale,
            "initial_location": self.initial_location.to_dict()
        }
