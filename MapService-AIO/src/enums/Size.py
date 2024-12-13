from enum import Enum, auto


class Size(Enum):
    SMALL = auto()
    MEDIUM = auto()
    LARGE = auto()

    @classmethod
    def from_value(cls, value):
        for member in cls:
            if member.value == value:
                return member
        raise ValueError(f"{value} is not a valid value for {cls.__name__}")
