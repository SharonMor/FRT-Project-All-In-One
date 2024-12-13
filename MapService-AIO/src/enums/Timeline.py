from enum import Enum


class Timeline(Enum):
    DELETE_MARK = 1
    UPDATE_MARK = 2
    ADD_MARK = 3
    UPDATE_MAP = 4

    @classmethod
    def from_value(cls, value):
        for member in cls:
            if member.value == value:
                return member
        raise ValueError(f"{value} is not a valid value for {cls.__name__}")
