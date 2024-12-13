import json
import os

from kafka import KafkaProducer

from src.config.Config import Config

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
