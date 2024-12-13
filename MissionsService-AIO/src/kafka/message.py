import time
from datetime import datetime

from src.enums.Timeline import Timeline
from src.utils.generators import generate_random_id


def get_message_format(user_id, chat_id, message, timeline: Timeline):
    return {
        'user_id': user_id,
        'message_type': 'timeline',
        'chat_id': chat_id,
        'timestamp': time.time()*1000,
        'message': {"timeline": timeline.value, "data": message},
        'message_id': generate_random_id(),
    }


def get_attendance_message_format(user_id, chat_id, message, mission_id: str):
    return {
        'user_id': user_id,
        'message_id': mission_id,
        'message_type': 'text',
        'chat_id': chat_id,
        'timestamp': int(time.time() * 1000),
        'message': message,
        'reply_markup': {
            "inline_keyboard": [[
                {"text": 'תקין', "callback_data": 'ok'},
                {"text": 'עזרה', "callback_data": 'sos'}
            ]]
        },
    }