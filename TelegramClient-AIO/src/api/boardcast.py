import base64
import time

from aiogram import Bot
from aiogram.types import Message, InlineKeyboardButton, InlineKeyboardMarkup, CallbackQuery, ReplyKeyboardMarkup, \
    KeyboardButton

from src.api.rest_requests import get_users, get_teams
from src.assets.users import get_user_by_telegram_id
from src.config.Config import Config
from src.config.contants import MS, SOS_CALLBACK_DATA, SEND_GPS_LOCATION_MESSAGE, \
    SEND_DEFAULT_LOCATION_MESSAGE
from src.database.LocalStorage import LocalStorage
from src.entities.Location import Location
from src.entities.Mark import Mark
from src.enums.MarkType import MarkType
from src.enums.MessageOrigin import MessageOrigin
from src.enums.MessengerMessageType import MessengerMessageType
from src.enums.Size import Size
from src.kafka.factory import get_producer
from src.logger.CustomLogger import CustomLogger
from src.utils.generators import generate_random_id
from src.utils.tools import reverse_geocode_osm

kafka_producer = get_producer()
config = Config().project_config
logger = CustomLogger()
cache = LocalStorage()


async def send_team_message(bot, sender_id, team_id, message: Message, callback_query: CallbackQuery = None):
    if not sender_id:
        logger.warning("from send_team_text_message: no sender_id")
        return False

    if not team_id:
        logger.warning("from send_team_text_message: no team_id")
        inline_keyboard = [[InlineKeyboardButton(text="בחר קבוצת שידור", callback_data=f"teams_menu")]]
        keyboard = InlineKeyboardMarkup(inline_keyboard=inline_keyboard)
        await message.answer(text="לא נמצאה קבוצה שידור", reply_markup=keyboard)
        return False

    message_kafka = {
        'user_id': sender_id,
        'message_id': generate_random_id(),
        'message_type': None,
        'chat_id': team_id,
        'timestamp': time.time() * MS,
        'message': None,
        'message_origin': MessageOrigin.TELEGRAM.value
    }
    if callback_query:
        await handle_incoming_callback_query(message_kafka, callback_query, bot)
        await send_message_kafka(message_kafka, config['kafka']['producer']['send_text_message_topic'])
        return

    if message.text:
        await handle_incoming_text(message_kafka, message)
        await send_message_kafka(message_kafka, config['kafka']['producer']['send_text_message_topic'])

    if message.caption:
        await handle_incoming_caption(message_kafka, message)
        await send_message_kafka(message_kafka, config['kafka']['producer']['send_text_message_topic'])

    if message.photo:
        await handle_incoming_photo(message_kafka, message)
        await send_message_kafka(message_kafka, config['kafka']['producer']['send_text_message_topic'])

    if message.location:
        message_kafka = await handle_incoming_location(message, sender_id, team_id)
        await send_message_kafka(message_kafka, config['kafka']['producer']['map_topic'])


async def handle_incoming_location(message, sender_id, team_id, def_latitude=None, def_longitude=None):
    location = message.location
    latitude = def_latitude if def_latitude else location.latitude
    longitude = def_longitude if def_longitude else location.longitude

    geo = await reverse_geocode_osm(lat=latitude, lon=longitude)
    if geo:
        description = geo.get('display_name')
    else:
        description = None
    status_code, user = await get_users([sender_id])
    user_name = None
    if status_code == 200 and len(user) == 1:
        user_name = user[0].get("displayName")
    mark_json = Mark(user_id=sender_id, mark_type=MarkType.TELEGRAM_USER, map_id=team_id,
                     message_id=generate_random_id(),
                     timestamp=time.time() * MS, active=True, location=Location(longitude=longitude, latitude=latitude),
                     description=description,
                     size=Size.SMALL, title=f"{user_name if user_name else sender_id} Marked Location",
                     publish_to_telegram=True).to_dict()

    return mark_json


async def handle_incoming_photo(message_kafka, message):
    message_kafka['message_type'] = MessengerMessageType.PHOTO.value
    photo = message.photo[-1]
    photo_file = await message.bot.get_file(photo.file_id)
    photo_bytesio = await message.bot.download_file(photo_file.file_path)
    photo_bytes = photo_bytesio.read()
    photo_base64 = base64.b64encode(photo_bytes).decode('utf-8')
    message_kafka['message'] = {
        'file_name': f"{photo.file_id}.jpg",
        'file_data': photo_base64
    }


async def handle_incoming_text(message_kafka, message):
    message_kafka['message_type'] = MessengerMessageType.TEXT.value
    message_kafka['message'] = message.text


def get_location_keyboard():
    gps_location_button = KeyboardButton(text=SEND_GPS_LOCATION_MESSAGE, request_location=True)
    user_def_location_button = KeyboardButton(text=SEND_DEFAULT_LOCATION_MESSAGE)

    keyboard = ReplyKeyboardMarkup(keyboard=[[gps_location_button], [user_def_location_button]],
                                   resize_keyboard=True,
                                   one_time_keyboard=True)
    return keyboard


async def handle_incoming_callback_query(message_kafka, callback_query: CallbackQuery, bot: Bot):
    message_kafka['message_type'] = MessengerMessageType.CALLBACK_DATA.value
    callback_query_data = callback_query.data.split(",")
    query_message_id = callback_query_data[0]
    data = callback_query_data[1]
    message_kafka['message'] = {"query_message_id": query_message_id, "data": data}
    message_kafka['chat_id'] = await cache.get_resource(query_message_id + "$" + str(callback_query.from_user.id))
    if data == SOS_CALLBACK_DATA:
        team_id = message_kafka['chat_id']
        user = await get_user_by_telegram_id(str(callback_query.from_user.id))
        status_code_user, local_user_json = await get_users([user.user_id])
        status_code_teams, teams_json = await get_teams(local_user_json[0]['team_ids'])
        if user.selected_team != team_id:
            await cache.post_resource(f"selected_team${callback_query.from_user.id}", team_id)

            user.selected_team = team_id
            selected_team_name = None
            for team in teams_json:
                if user.selected_team == team['_id']:
                    selected_team_name = team['team_name']

            send_message = await bot.send_message(user.telegram_user_id, " קבוצת שידור 📢 " + selected_team_name)
            await bot.pin_chat_message(callback_query.from_user.id, send_message.message_id)
            await cache.post_resource(f"selected_team_name${user.user_id}", selected_team_name)

        await callback_query.message.answer("📍 שלח מיקום", reply_markup=get_location_keyboard())


async def handle_incoming_caption(message_kafka, message):
    message_kafka['message_type'] = MessengerMessageType.TEXT.value
    message_kafka['message'] = message.caption


async def send_message_kafka(message_kafka, topic):
    result = kafka_producer.send(topic, message_kafka)
    result.get(timeout=config['kafka']['producer']['send_message_timeout'])
    logger.info(f'Sent message: {message_kafka}')
