from enum import Enum


class MarkType(Enum):
    NONE = 0
    BARRIER = 1
    FIRE = 2
    DANGER = 3
    QUESTION = 4
    CAR_CRASH = 5
    ROCKET = 6
    TELEGRAM_USER = 7
    S0S = 8

    @classmethod
    def from_value(cls, value):
        if value is None:
            return cls.NONE
        try:
            return cls(value)
        except ValueError:
            raise ValueError(f"{value} is not a valid MarkType")
