from enum import Enum


class RequestType(Enum):
    COLLECTION_COMA_ID_VALUE = 1
    MESSANGER = 2
    TABLE_DATA = 3
    BULK_COLLECTION_DOCS_BY_ID = 4
    DATA_BY_FIELD = 5
    CALLBACK_QUERY = 6
    TABLE_TIME_RANGE = 7

    @classmethod
    def from_value(cls, value):
        for state in cls:
            if state.value == value:
                return state
        raise ValueError(f"No matching enum member for value '{value}'")
