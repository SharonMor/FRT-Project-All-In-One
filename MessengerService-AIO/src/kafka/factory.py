import json
import os
from kafka import KafkaConsumer, KafkaProducer

from src.config.Config import Config

config = Config().project_config
config = Config().project_config
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)

# Check if we're in production (assuming 'src' directory exists in production)
is_production = os.path.basename(current_dir) == 'src'

# Add 'src/' prefix to config paths if in production
prefix = "src/" if is_production else ""

ssl_cafile = os.path.join(project_root, prefix + config['kafka']['ssl_cafile'])
ssl_certfile = os.path.join(project_root, prefix + config['kafka']['ssl_certfile'])
ssl_keyfile = os.path.join(project_root, prefix + config['kafka']['ssl_keyfile'])

def get_consumer(topic):
    """
    Create a Kafka consumer with the given topic.

    Parameters:
    ----------
    topic : str
        The Kafka topic to consume messages from.

    Returns:
    -------
    KafkaConsumer
        A Kafka consumer instance.
    """

    print('dddddddddddd')
    print(ssl_cafile)
    return KafkaConsumer(
        topic,
        bootstrap_servers=config['kafka']['bootstrap_servers'],
        security_protocol=config['kafka']['security_protocol'],
        ssl_cafile=ssl_cafile,
        ssl_certfile=ssl_certfile,
        ssl_keyfile=ssl_keyfile,
        value_deserializer=lambda v: json.loads(v.decode('utf-8')) if config['kafka']['consumer'][
                                                                          'value_deserializer'] == 'json' else v,
        group_id=config['kafka']['consumer']['group_id'],
        auto_offset_reset=config['kafka']['consumer']['auto_offset_reset'],
        fetch_min_bytes=1,  # Minimum amount of data the server should return for a fetch request
        fetch_max_wait_ms=500,  # Maximum amount of time the server will block before answering the fetch request
        session_timeout_ms=10000  # Timeout for the Kafka consumer session
    )


def get_producer():
    """
    Create a Kafka producer.

    Returns:
    -------
    KafkaProducer
        A Kafka producer instance.
    """
    return KafkaProducer(
        bootstrap_servers=config['kafka']['bootstrap_servers'],
        security_protocol=config['kafka']['security_protocol'],
        ssl_cafile=ssl_cafile,
        ssl_certfile=ssl_certfile,
        ssl_keyfile=ssl_keyfile,
        value_serializer=lambda v: json.dumps(v).encode('utf-8') if config['kafka']['producer'][
                                                                        'value_serializer'] == 'json' else v
    )
