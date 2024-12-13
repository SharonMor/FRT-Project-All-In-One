import asyncio

from src.config.Config import Config
from src.kafka.factory import get_producer


async def main():
    config = Config().project_config
    kafka_producer = get_producer()
    for i in range(5):
        message = {
            'user_id': f'ZOOOOOOOOOOM',
            'mark_type': 1,
            'map_id': '123123123',
            'message_id': str(i),
            'timestamp': "CALL" * i,
            'description': "ZOOM" * i,
            'active': True,
            'size': 1,
            'title':"title",
            'location': {"longitude": i, "latitude": i}
        }

        kafka_producer.send(config['kafka']['consumer']['topic'], message)
        print(f'Sent: {message}')

    kafka_producer.close()


if __name__ == "__main__":
    asyncio.run(main())
