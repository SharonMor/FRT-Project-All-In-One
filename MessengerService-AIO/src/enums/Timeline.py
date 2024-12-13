from enum import Enum


class Timeline(Enum):
    DELETE_MARK = 1
    UPDATE_MARK = 2
    ADD_MARK = 3
    UPDATE_MAP = 4
    CREATE_MISSION = 5
    UPDATE_MISSION = 6
    DELETE_MISSION = 7

    @classmethod
    def from_value(cls, value):
        for member in cls:
            if member.value == value:
                return member
        raise ValueError(f"{value} is not a valid value for {cls.__name__}")

    def name_format(self):
        return self.name.replace('_', ' ').title()
