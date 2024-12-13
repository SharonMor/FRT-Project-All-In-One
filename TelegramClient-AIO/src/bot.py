import asyncio
import logging
import sys

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import CommandStart
from aiogram.types import Message, CallbackQuery

from config.Config import Config
from src.agents.Consumer import Consumer
from src.assets.menu_handlers import start_handler, select_team_handler, send_message_handler, teams_menu, \
    send_query_handler, default_location_handler, set_default_location_handler, set_default_location_handler_request
from src.assets.message import handle_messenger_message, handle_map_message, handle_mission_message
from src.config.contants import SEND_DEFAULT_LOCATION_MESSAGE, SET_DEFAULT_LOCATION_REQUEST_MESSAGE
from src.logger.CustomLogger import CustomLogger
from src.utils.StringShortener import StringShortener

# Initializing bot and dispatcher
config = Config().project_config
logger = CustomLogger()
TOKEN = config['bot_api_key']
bot = Bot(token=TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
kafka_consumer = Consumer(config['kafka']['consumer']['topic_messenger'],
                          config['kafka']['consumer']['topic_map'],
                          config['kafka']['consumer']['topic_mission'])
dp = Dispatcher()
ss = StringShortener()


async def consume_messages(consumer: Consumer):
    """
    Start consuming messages from Kafka.
    """
    logger.info("Starting to consume messages")

    async for message in consumer.consume():
        try:
            logger.info(f"Consumed message: {message.value}")
            if message.topic == config['kafka']['consumer']['topic_messenger']:
                await handle_messenger_message(message.value, bot)
            elif message.topic == config['kafka']['consumer']['topic_map']:
                await handle_map_message(message.value, bot)
            elif message.topic == config['kafka']['consumer']['topic_mission']:
                await handle_mission_message(message.value, bot)
            else:
                logger.error("Unknown topic")

        except Exception as e:
            logger.error(f"Error consuming messages: {e}")


async def stop(self):
    """
    Stop the Kafka consumer.
    """
    await self.consumer.stop()


@dp.callback_query(lambda callback_query: callback_query.data.startswith("select_team$"))
async def handle_select_team(callback_query: CallbackQuery):
    await select_team_handler(callback_query, bot)


@dp.callback_query(lambda callback_query: callback_query.data.startswith("teams_menu"))
async def handle_teams_menu(callback_query: CallbackQuery):
    await teams_menu(callback_query)


@dp.callback_query(lambda callback_query: callback_query.data.startswith("back_menu"))
async def handle_back_menu(callback_query: CallbackQuery):
    await start_handler(callback_query=callback_query)


@dp.callback_query(lambda callback_query: callback_query.data.startswith("set_default_location_handler"))
async def handle_set_default_location_handler(callback_query: CallbackQuery):
    await set_default_location_handler_request(callback_query=callback_query)


@dp.callback_query()
async def query_response_handler_request(callback_query: CallbackQuery) -> None:
    await send_query_handler(bot, callback_query)


@dp.message(lambda message: message.from_user.id == bot.id)
async def ignore_bot(message: Message) -> None:
    print("Ignore bot message")


@dp.message(CommandStart())
async def command_start_handler(message: Message) -> None:
    await start_handler(message=message)


@dp.message(lambda message: message.text == SEND_DEFAULT_LOCATION_MESSAGE)
async def command_send_predefined_location(message: Message) -> None:
    await default_location_handler(message=message)


@dp.message(
    lambda message: message.location is not None and message.reply_to_message and
                    message.reply_to_message.text == SET_DEFAULT_LOCATION_REQUEST_MESSAGE)
async def command_define_default_location(message: Message) -> None:
    await set_default_location_handler(message)


@dp.message()
async def command_send_message_handler(message: Message) -> None:
    await send_message_handler(bot, message)


async def main() -> None:
    asyncio.create_task(consume_messages(kafka_consumer))
    await dp.start_polling(bot)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, stream=sys.stdout)
    asyncio.run(main())
