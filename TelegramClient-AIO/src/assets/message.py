import asyncio
import base64
import copy

# message.py
from aiogram import Bot
from aiogram import html
from aiogram.types import BufferedInputFile, InlineKeyboardMarkup, InlineKeyboardButton

from src.Database import Database
from src.api.rest_requests import get_team, get_users, get_message
from src.assets.users import get_user_by_local_id
from src.config.contants import SUCCESS_STATUS_CODE
from src.database.LocalStorage import LocalStorage
from src.entities.User import User
from src.enums.MessageOrigin import MessageOrigin
from src.enums.MessengerMessageType import MessengerMessageType
from src.enums.MissionOperation import MissionOperation
from src.logger.CustomLogger import CustomLogger
from src.utils.StringShortener import StringShortener
from src.utils.tools import format_timestamp

db = Database()
logger = CustomLogger()
ss = StringShortener()
cache = LocalStorage()


async def handle_messenger_message(message: dict, bot: Bot):
    """
    Handle a consumed Kafka message.

    Parameters:
    ----------
    message : Message
        The Kafka message to handle.
    """
    message_type = message.get('message_type')

    if message_type == MessengerMessageType.TEXT.value:
        await handle_message_text(message, bot)
    elif message_type == MessengerMessageType.PHOTO.value:
        await handle_message_photo(message, bot)
    elif message_type == MessengerMessageType.CALLBACK_DATA.value:
        await handle_message_callback_data(message, bot)


async def handle_map_message(message: dict, bot: Bot):
    if message.get("publish_to_telegram"):
        await handle_message_marker(message, bot)


async def handle_mission_message(message: dict, bot: Bot):
    mission = message.get('mission')
    if mission.get("publish_to_telegram"):
        await handle_message_mission(mission, MissionOperation.from_value(message.get('operation')), bot)


async def get_change_team_keyboard(user: User, message_received_from_team_id):
    if user.selected_team == message_received_from_team_id:
        return None

    status_code_team, team_json = await get_team(message_received_from_team_id)
    if status_code_team == 200:
        return InlineKeyboardMarkup(
            inline_keyboard=[[InlineKeyboardButton(text=team_json.get('team_name') + " 📢 ",
                                                   callback_data=f"select_team${ss.shorten(team_json['_id'])}_send")]])
    return None


async def fetch_data_from_message(message: dict, func_name: str):
    sender_local_id = message.get('user_id')
    chat_id = message.get('chat_id')
    status_code_team, team_json = await get_team(chat_id)
    status_code_user, sender = await get_users([sender_local_id])
    if status_code_team != 200 or status_code_user != 200:
        logger.error(f"From: {func_name}, failed to fetch team or user from team-service")
        return False, False, False
    team_members_id = [member_id['_id'] for member_id in team_json['members']]
    return team_json, sender, team_members_id


async def add_message_id_to_callback_data(message_id, markup):
    inline_keyboard = markup.get('inline_keyboard')
    for opt_row in inline_keyboard:
        for resp_dict in opt_row:
            resp_dict['callback_data'] = f"{message_id},{resp_dict['callback_data']}"
    return markup


async def send_successfully_sent_message(bot, tg_user_id):
    msg = await bot.send_message(tg_user_id, "✅ נשלח בהצלחה!")
    await asyncio.sleep(3)
    await bot.delete_message(tg_user_id, msg.message_id)


async def handle_message_text(message: dict, bot: Bot):
    team_json, sender, team_members_id = await fetch_data_from_message(message, "handle_message_text")

    if not team_json:
        return False

    for user_id in team_members_id:
        user: User = await get_user_by_local_id(user_id)
        if user:
            from_user = await get_user_by_local_id(message.get("user_id"))
            message_origin = message.get("message_origin")
            if (message_origin != MessageOrigin.TELEGRAM.value) or (
                    from_user and from_user.telegram_user_id != str(user.telegram_user_id)):
                copy_message = copy.deepcopy(message)
                markup = copy_message.get('reply_markup')
                if markup:
                    markup = await add_message_id_to_callback_data(message.get('message_id'), markup)
                    await cache.post_resource(str(message.get('message_id')) + "$" + str(user.telegram_user_id),
                                              team_json['_id'])

                reply_markup = markup if markup else (await get_change_team_keyboard(user, team_json['_id']))
                await bot.send_message(user.telegram_user_id,
                                       f"📩 {html.bold(sender[0]['displayName'])} {html.italic('(' + team_json['team_name'] + ')')}:\n\n" +
                                       message['message'],
                                       reply_markup=reply_markup)
            else:
                await send_successfully_sent_message(bot, user.telegram_user_id)


async def handle_message_callback_data(message: dict, bot: Bot):
    team_json, sender, team_members_id = await fetch_data_from_message(message, "handle_message_callback_data")
    if not team_json:
        return False
    query_message_id = message['message']['query_message_id']
    status, query_message = await get_message(team_json['_id'], query_message_id)
    if status == SUCCESS_STATUS_CODE:
        query_message_data = query_message[0]
    else:
        return False

    user_selection = message['message']['data']
    user_selection_text = None
    callback_query = query_message_data['reply_markup']['inline_keyboard']
    for opt_row in callback_query:
        for resp_dict in opt_row:
            if resp_dict['callback_data'] == user_selection:
                user_selection_text = resp_dict['text']

    if user_selection_text is None:
        print("Can't fetch the user response text by the id")
        return False

    for user_id in team_members_id:
        user = await get_user_by_local_id(user_id)

        if user:
            from_user = await get_user_by_local_id(message.get("user_id"))
            message_origin = message.get("message_origin")
            if (message_origin != MessageOrigin.TELEGRAM.value) or (
                    from_user and from_user.telegram_user_id != str(user.telegram_user_id)):
                reply_markup = await get_change_team_keyboard(user, team_json['_id'])
                await bot.send_message(user.telegram_user_id,
                                       f"📩 {html.bold(sender[0]['displayName'])} {html.italic('(' + team_json['team_name'] + ')')}:\n\n" +
                                       "📊 " + query_message_data[
                                           'message'] + f"\n\n<b>Response:</b> <i>{user_selection_text}</i>",
                                       reply_markup=reply_markup)
            else:
                await send_successfully_sent_message(bot, user.telegram_user_id)


async def handle_message_photo(message: dict, bot: Bot):
    team_json, sender, team_members_id = await fetch_data_from_message(message, "handle_message_photo")
    if not team_json:
        return False

    for user_id in team_members_id:
        user = await get_user_by_local_id(user_id)
        if user:
            from_user = await get_user_by_local_id(message.get("user_id"))
            message_origin = message.get("message_origin")
            if (message_origin != MessageOrigin.TELEGRAM.value) or (
                    from_user and from_user.telegram_user_id != str(user.telegram_user_id)):
                photo_data = message['message']
                photo_name = photo_data['file_name']
                photo_data_base64 = photo_data['file_data']
                photo_bytes = base64.b64decode(photo_data_base64)

                photo_file = BufferedInputFile(photo_bytes, filename=photo_name)
                await bot.send_photo(user.telegram_user_id,
                                     caption=f"📩 {html.bold(sender[0]['displayName'])} {html.italic('(' + team_json['team_name'] + ')')}",
                                     photo=photo_file,
                                     reply_markup=(await get_change_team_keyboard(user, team_json['_id'])))
            else:
                await send_successfully_sent_message(bot, user.telegram_user_id)


async def handle_message_marker(message: dict, bot: Bot):
    sender_local_id = message.get('user_id')
    map_id = message.get('map_id')
    status_code_team, team_json = await get_team(map_id)
    status_code_user, sender = await get_users([sender_local_id])
    if status_code_team != 200 or status_code_user != 200:
        logger.error("From: handle_message_marker, failed to fetch team or user from team-service")
        return False

    team_members_id = [member_id['_id'] for member_id in team_json['members']]

    for user_id in team_members_id:
        user = await get_user_by_local_id(user_id)

        if user:
            from_user = await get_user_by_local_id(message.get("user_id"))
            message_origin = message.get("message_origin")
            if (message_origin != MessageOrigin.TELEGRAM.value) or (
                    from_user and from_user.telegram_user_id != str(user.telegram_user_id)):
                latitude = message['location']['latitude']
                longitude = message['location']['longitude']
                title = message['title']
                description = message['description']
                mark_type = message['mark_type']

                await bot.send_location(user.telegram_user_id, latitude=latitude, longitude=longitude)
                marker_info = f"""
    🗺 {html.bold(sender[0]['displayName'])} marked location
     
    📍 {html.bold(title)}  
    
    {'📝 ' + description if description else ''}         
    """
                await bot.send_message(user.telegram_user_id, marker_info,
                                       reply_markup=(await get_change_team_keyboard(user, team_json['_id'])))

            else:
                await send_successfully_sent_message(bot, user.telegram_user_id)


async def handle_message_mission(mission: dict, mission_op: MissionOperation, bot: Bot):
    creator_local_id = mission.get('creator_id')
    team_id = mission.get('team_id')

    # Fetch team and user data
    status_code_team, team_json = await get_team(team_id)
    status_code_user, sender = await get_users([creator_local_id])

    if status_code_team != 200 or status_code_user != 200:
        logger.error("Failed to fetch team or user data in handle_message_mission")
        return False

    team_members_id = [member['_id'] for member in team_json['members']]

    # Prepare mission details
    mission_name = mission.get('name', 'Unnamed Mission')
    mission_description = mission.get('description', 'No description available')
    mission_status = mission.get('mission_status', 0)
    start_time = mission.get('start_time', 'N/A')
    end_time = mission.get('end_time', 'N/A')
    deadline = mission.get('deadline', 'N/A')
    mission_id = mission.get('_id', 'N/A')

    start_time_formatted = format_timestamp(start_time)
    end_time_formatted = format_timestamp(end_time)
    deadline_formatted = format_timestamp(deadline)

    # Human-readable status mapping
    status_map = {
        1: "Open",
        2: "Active",
        3: "Completed",
        4: "Resolved",
        5: "Cancelled"
    }
    status_text = status_map.get(mission_status, "Unknown Status")

    # Determine the action (created or updated)
    action = "created" if mission_op == MissionOperation.CREATE_MISSION else "updated"

    # Construct the mission info message using HTML formatting
    mission_info = f"""
📢 Mission {html.bold(action)} by {html.bold(sender[0]['displayName'])}

💼 <b>Team:</b> {html.italic(team_json['team_name'])}
🔖 <b>Mission Name:</b> {html.quote(mission_name)}
📝 <b>Description:</b> {html.quote(mission_description)}
📊 <b>Status:</b> {html.quote(status_text)}
"""

    # Send the message to all team members
    for user_id in team_members_id:
        user = await get_user_by_local_id(user_id)
        if user:
            await bot.send_message(
                user.telegram_user_id,
                mission_info
            )
