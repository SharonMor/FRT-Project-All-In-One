import asyncio
import time

from src.config.Config import Config
from src.kafka.factory import get_producer
from src.utils.generators import generate_random_id

chat_id = "team-8100dce7-6f8b-4402-957a-5c6db90cb16c"

message = {
    'user_id': '7i0ZJx9M3dNvG7xwEnowByF6pPn1',
    'message_type': 'callback_data',
    'message_id': generate_random_id(),
    'chat_id': chat_id,
    'timestamp': time.time(),
    'message': {"query_message_id": "12", "data": 'opt1'}
}


async def main():
    config = Config().project_config
    kafka_producer = get_producer()

    for i in range(1):
        # message = {
        #     "user_id": "7i0ZJx9M3dNvG7xwEnowByF6pPn1",
        #     "message_type": "callback_data",
        #     "message_id": generate_random_id(),
        #     "chat_id": chat_id,
        #     "timestamp": time.time(),
        #     "message": {"query_message_id": "QPpSovD6Qq", "data": "opt_1"}
        # }
        message = {
            'user_id': 'dgxLBK5XnBPt9oJxMYFOWNkAVsO2',
            'message_id': generate_random_id(),
            'message_type': 'text',
            'chat_id': 'team-8100dce7-6f8b-4402-957a-5c6db90cb16c',
            'timestamp': time.time() * 1000,
            'message': "ירוק בעניים",
            'reply_markup': {"inline_keyboard": [[{"text": 'תקין', "callback_data": 'opt_1'},
                                                  {"text": 'עזרה!', "callback_data": 'sos'}]]},
        }
        kafka_producer.send(config['kafka']['consumer']['topic'], message)
        print(f'Sent: {message}')

    kafka_producer.close()


if __name__ == "__main__":
    asyncio.run(main())
