from enum import Enum, auto


class MissionOperation(Enum):
    CREATE_MISSION = auto()
    UPDATE_MISSION = auto()
    DELETE_MISSION = auto()

    @classmethod
    def from_value(cls, value):
        for member in cls:
            if member.value == value:
                return member
        raise ValueError(f"{value} is not a valid value for {cls.__name__}")
