from aiocache import cached

from src.Database import Database
from src.config.Config import Config
from src.config.contants import MESSANGER_DB_MESSAGE_TYPE
from src.logger.CustomLogger import CustomLogger

database = Database()
logger = CustomLogger()
config = Config().project_config


@cached(ttl=config["cache"]["ttl"]["get_message_from_db"])
async def get_message_from_db(table_id: str, message_id: str):
    response = await database.get(MESSANGER_DB_MESSAGE_TYPE, f"{table_id},0,1,{message_id}")
    logger.debug(f"Database get chat insights response: {response}")

    if response and response['success']:
        return response['data']
    return False
