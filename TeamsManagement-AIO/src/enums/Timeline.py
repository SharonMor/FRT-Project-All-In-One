from enum import Enum


class Timeline(Enum):
    START_NEW_CHAT = 550

    @classmethod
    def from_value(cls, value):
        for member in cls:
            if member.value == value:
                return member
        raise ValueError(f"{value} is not a valid value for {cls.__name__}")
