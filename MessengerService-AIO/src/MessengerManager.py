import asyncio

from singleton_decorator import singleton

from src.agents.Consumer import Consumer
from src.annotations.init_database import init_database
from src.annotations.init_logger import init_logger
from src.api.database import get_message_from_db
from src.config.Config import Config
from src.config.contants import MESSANGER_DB_MESSAGE_TYPE, MESSANGER_DB_CHAT_INSIGHTS_MESSAGE_TYPE, \
    CALLBACK_QUERY_DB_REQUEST, TABLE_TIME_RANGE
from src.converters.excel_summary import convert_summary_list_to_excel


@singleton
@init_logger()
@init_database()
class MessengerManager:
    """
    A class to manage the Messenger application, including starting and stopping the Kafka consumer.

    Attributes:
    ----------
    config : dict
        The project configuration.
    consumer : Consumer
        The Kafka consumer instance.
    """

    def __init__(self):
        """
        Initializes the MessengerManager with the project configuration and Kafka consumer.
        """
        self.config = Config().project_config
        self.consumer = Consumer(self.config['kafka']['consumer']['topic'])
        self.logger.info("MessengerManager initialized")

    async def start(self):
        """
        Start the MessengerManager by initiating the Kafka consumer.
        """
        self.logger.info("Starting MessengerManager")
        asyncio.create_task(self.consume_messages())
        self.logger.info("MessengerManager started")

    async def consume_messages(self):
        """
        Start consuming messages from Kafka.
        """
        self.logger.info("Starting to consume messages")
        try:
            async for message in self.consumer.consume():
                self.logger.info(f"Consumed message: {message.value.get('message_id')}")
                await self.handle_message(message)
        except Exception as e:
            self.logger.error(f"Error consuming messages: {e}")
        finally:
            self.logger.info("Finished consuming messages")

    async def handle_message(self, message):
        """
        Handle a consumed Kafka message.

        Parameters:
        ----------
        message : Message
            The Kafka message to handle.
        """
        self.logger.info(f"Handling message: {message.value}")
        try:
            asyncio.create_task(self.database.post(MESSANGER_DB_MESSAGE_TYPE, message.value['chat_id'], message.value))
            self.logger.info(f"Handled message: {message.value}")
        except Exception as e:
            self.logger.error(f"Error handling message: {e}")

    async def stop(self):
        """
        Stop the Kafka consumer.
        """
        await self.consumer.stop()

    async def get_chat(self, table_id, page=0, page_size=50):
        if not table_id:
            self.logger.error("Bad request: table_id is required")
            return False

        response = await self.database.get(MESSANGER_DB_MESSAGE_TYPE, f"{table_id},{page},{page_size}")
        self.logger.debug(f"Database get chat response: {response}")

        if response and response['success']:
            return response['data']
        return False

    async def get_chat_timeline_excel(self, table_id, start_time, end_time):
        if not table_id:
            self.logger.error("Bad request: table_id is required")
            return False

        response = await self.database.get(TABLE_TIME_RANGE, f"{table_id},{start_time},{end_time}")

        self.logger.debug(f"Database get chat response: {response}")
        if response and response['success']:
            convert_to_excel = await convert_summary_list_to_excel(response['data'], table_id)
            return convert_to_excel
        return False

    async def get_chat_insights(self, table_id):
        if not table_id:
            self.logger.error("Bad request: table_id is required")
            return False

        response = await self.database.get(MESSANGER_DB_CHAT_INSIGHTS_MESSAGE_TYPE, f"{table_id}")
        self.logger.debug(f"Database get chat insights response: {response}")

        if response and response['success']:
            return response['data']
        return False

    async def get_message(self, table_id, message_id):
        if not table_id:
            self.logger.error("Bad request: table_id is required")
            return False
        return await get_message_from_db(table_id, message_id)

    async def get_callback_query_results(self, table_id, callback_query_message_id):
        if not table_id:
            self.logger.error("From get_callback_query_results, Bad request: table_id is required")
            return False

        response = await self.database.get(CALLBACK_QUERY_DB_REQUEST, f"{table_id},{callback_query_message_id}")
        self.logger.debug(f"From get_callback_query_results, Database callback results response: {response}")

        if response and response['success']:
            return response['data']
        return False
