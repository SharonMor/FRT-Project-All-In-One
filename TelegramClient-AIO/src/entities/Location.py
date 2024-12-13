import logging

from src.annotations.init_logger import init_logger
from src.entities.BaseEntity import BaseEntity


@init_logger(level=logging.INFO)
class Location(BaseEntity):
    """
    Represents a location in the system.
    """

    def __init__(self, longitude: float, latitude: float):
        self.longitude = longitude
        self.latitude = latitude
        self.logger.info(f"Location initialized: {self.to_dict()}")

    @classmethod
    def from_dict(cls, data: dict):
        return cls(
            longitude=data['longitude'],
            latitude=data['latitude']
        )

    def to_dict(self):
        return {
            "longitude": self.longitude,
            "latitude": self.latitude
        }
