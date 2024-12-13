import time
from datetime import datetime

from src.enums.Timeline import Timeline


def get_message_format(user_id, chat_id, message, timeline: Timeline, message_id):
    return {
        'user_id': user_id,
        'message_type': 'timeline',
        'chat_id': chat_id,
        'timestamp': time.time()*1000,
        'message': {"timeline": timeline.value, "data": message},
        'message_id': message_id
    }
