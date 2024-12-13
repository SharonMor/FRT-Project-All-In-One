from enum import Enum


class MessengerMessageType(Enum):
    TEXT = 'text'
    PHOTO = 'photo'
    CALLBACK_DATA = 'callback_data'
