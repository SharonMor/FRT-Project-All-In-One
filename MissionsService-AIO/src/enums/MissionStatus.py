from enum import Enum, auto


class MissionStatus(Enum):
    OPEN = auto()
    ACTIVE = auto()
    COMPLETED = auto()
    RESOLVED = auto()
    CANCELLED = auto()
    DELETED = auto()

    @classmethod
    def from_value(cls, value):
        for member in cls:
            if member.value == value:
                return member
        raise ValueError(f"{value} is not a valid value for {cls.__name__}")
