from aiogram import html, types, Bot
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, CallbackQuery

from src.Database import Database
from src.api.boardcast import send_team_message, handle_incoming_location, send_message_kafka
from src.api.rest_requests import get_users, get_teams
from src.assets.users import authenticate, get_user_by_telegram_id
from src.config.Config import Config
from src.config.contants import SET_DEFAULT_LOCATION_REQUEST_MESSAGE, REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, \
    USERS_COLLECTION
from src.database.LocalStorage import LocalStorage
from src.entities.User import User
from src.logger.CustomLogger import CustomLogger
from src.utils.StringShortener import StringShortener
from src.utils.tools import extract_callback_data

logger = CustomLogger()
ss = StringShortener()
local_db = LocalStorage()
config = Config().project_config


async def build_start_keyboard(user_name, user: User):
    if not user:
        logger.error("from build_start_keyboard failed to get_user_by_telegram_id")
        return False

    inline_keyboard = [[InlineKeyboardButton(text="בחר קבוצת שידור", callback_data=f"teams_menu")], [
        InlineKeyboardButton(text="הגדר מיקום ברירת מחדל", callback_data=f"set_default_location_handler")]]

    selected_team_name = await local_db.get_resource(f"selected_team_name${user.user_id}")

    keyboard = InlineKeyboardMarkup(inline_keyboard=inline_keyboard)
    text = f"""
שלום, {html.bold(user_name)} 

📢 קבוצת שידור נוכחית:
{html.bold(selected_team_name)} 
"""
    return keyboard, text


async def build_teams_menu_keyboard(user: User):
    if not user:
        logger.error("from build_start_keyboard failed to get_user_by_telegram_id")
        return False, False, False

    status_code_user, local_user_json = await get_users([user.user_id])
    if status_code_user != 200:
        logger.error("from build_start_keyboard Unable to fetch user")
        return False, False, False

    status_code_teams, teams_json = await get_teams(local_user_json[0]['team_ids'])
    inline_keyboard = []
    selected_team_name = None
    for team in teams_json:
        if user.selected_team == team['_id']:
            text = "📢 " + team['team_name'] + " 📢"
            selected_team_name = team['team_name']
        else:
            text = team['team_name']

        inline_keyboard.append(
            [InlineKeyboardButton(text=text, callback_data=f"select_team${ss.shorten(team['_id'])}_edit")])

    inline_keyboard.append(
        [InlineKeyboardButton(text="חזור ⬅️", callback_data=f"back_menu")])

    keyboard = InlineKeyboardMarkup(inline_keyboard=inline_keyboard)
    text = "בחר קבוצה שידור"
    return keyboard, text, selected_team_name


async def teams_menu(callback_query: CallbackQuery):
    user = await authenticate(str(callback_query.from_user.id), callback_query.message)
    if user:
        reply_markup, text, _ = await build_teams_menu_keyboard(user)
        if reply_markup and text:
            await callback_query.message.answer(text, reply_markup=reply_markup)


async def default_location_handler(message: Message):
    user = await authenticate(str(message.from_user.id), message)
    status_code, user = await get_users([user.user_id])
    default_location = None
    if status_code == 200 and len(user) == 1:
        default_location = user[0].get("defaultLocation")
    if not default_location:
        await message.answer("לא הוגדר מיקום ברירת מחדל")
        return

    user = await get_user_by_telegram_id(str(message.from_user.id))
    message_kafka = await handle_incoming_location(message, user.user_id, user.selected_team,
                                                   def_latitude=default_location.get('latitude'),
                                                   def_longitude=default_location.get('longitude'))
    await send_message_kafka(message_kafka, config['kafka']['producer']['map_topic'])


async def set_default_location_handler(message: Message):
    db = Database()
    user = await get_user_by_telegram_id(str(message.from_user.id))
    location = message.location
    result = await db.update(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, USERS_COLLECTION + f",{user.user_id}",
                             {"defaultLocation": {"latitude": location.latitude, "longitude": location.longitude}})

    if result.get('success'):
        await message.answer("מיקום הוגדר בהצלחה")

    else:
        await message.answer("פעולה נכשלה אנא נסה בשנית מאוחר יותר")


async def set_default_location_handler_request(callback_query: CallbackQuery):
    await callback_query.message.answer(SET_DEFAULT_LOCATION_REQUEST_MESSAGE,
                                        reply_markup=types.ForceReply(selective=True))


async def start_handler(message: Message = None, callback_query: CallbackQuery = None):
    if callback_query:
        user = await authenticate(str(callback_query.from_user.id), callback_query.message)
    else:
        user = await authenticate(str(message.from_user.id), message)

    if user:
        if callback_query:
            reply_markup, text = await build_start_keyboard(callback_query.from_user.full_name, user)
            await callback_query.message.edit_text(text, reply_markup=reply_markup)
        else:
            reply_markup, text = await build_start_keyboard(message.from_user.full_name, user)
            await message.answer(text, reply_markup=reply_markup)


async def select_team_handler(callback_query: CallbackQuery, bot: Bot):
    params = extract_callback_data(callback_query.data)
    team_id = ss.retrieve_original(params[0])
    send_or_edit = params[1]
    user = await get_user_by_telegram_id(str(callback_query.from_user.id))
    if user.selected_team == team_id and send_or_edit == 'edit':
        team_id = None

    await local_db.post_resource(f"selected_team${callback_query.from_user.id}", team_id)

    user.selected_team = team_id
    reply_markup, text, selected_team_name = await build_teams_menu_keyboard(user)
    if reply_markup and text:
        if send_or_edit == 'edit':
            await callback_query.message.edit_text(text, reply_markup=reply_markup)
        send_message = await callback_query.message.answer(" קבוצת שידור 📢 " + selected_team_name)
        await bot.pin_chat_message(callback_query.from_user.id, send_message.message_id)
        await local_db.post_resource(f"selected_team_name${user.user_id}", selected_team_name)


async def send_message_handler(bot, message: Message):
    user = await authenticate(str(message.from_user.id), message)
    if user:
        await send_team_message(bot, user.user_id, user.selected_team, message)


async def send_query_handler(bot, callback_query: CallbackQuery):
    user = await authenticate(str(callback_query.from_user.id), callback_query.message)
    if user:
        await send_team_message(bot, user.user_id, user.selected_team, callback_query.message, callback_query)
