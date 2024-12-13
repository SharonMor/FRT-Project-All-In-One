import logging
import uuid

from src.annotations.init_logger import init_logger


@init_logger(level=logging.INFO)
def generate_random_id():
    """
    Generates a random UUID.

    Returns:
        str: A string representation of a random UUID.
    """
    random_id = "team-" + str(uuid.uuid4())
    logging.info(f"Generated random ID: {random_id}")
    return random_id
