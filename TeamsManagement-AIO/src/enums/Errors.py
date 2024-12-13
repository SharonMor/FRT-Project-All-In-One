from enum import Enum


class Errors(Enum):
    SUCCESS = 0
    INTERNAL_ERROR = 500
    OWNER_CANNOT_LEAVE_TEAM = 403


    @classmethod
    def from_value(cls, value):
        try:
            return cls(value)
        except ValueError:
            raise ValueError(f"{value} is not a valid MarkType")
