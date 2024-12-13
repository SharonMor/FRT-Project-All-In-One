import logging
import random
import string
import uuid

from src.annotations.init_logger import init_logger


@init_logger(level=logging.INFO)
def generate_random_id(length=10):
    """
    Generates a random alphanumeric ID of a specified length.

    Args:
        length (int): The length of the random ID to generate. Default is 10.

    Returns:
        str: A string representation of a random alphanumeric ID.
    """
    random_id = ''.join(random.choices(string.ascii_letters + string.digits, k=length))
    logging.debug(f"Generated random ID: {random_id}")
    return random_id
