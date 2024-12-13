from aiogram import types
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

from src.Database import Database
from src.config.contants import REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, TELEGRAM_USERS_COLLECTION, USERS_COLLECTION
from src.entities.User import User

db = Database()
users = []


async def authenticate(tg_user_id: str, message: types.Message) -> User | bool:
    user = await get_user_by_telegram_id(tg_user_id)
    if user:
        return user
    inline_keyboard = [
        [InlineKeyboardButton(text="כניסה לאתר", web_app=WebAppInfo(url="https://frtproject.com/telegram-login"))]]

    keyboard = InlineKeyboardMarkup(inline_keyboard=inline_keyboard)

    await message.answer("בבקשה התחבר דרך האתר", reply_markup=keyboard)
    return False


async def get_user_by_telegram_id(tg_user_id: str) -> User | bool:
    try:
        for user in users:
            if user.telegram_user_id == tg_user_id:
                return user

        result = await db.get(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, TELEGRAM_USERS_COLLECTION + f",{tg_user_id}")
        if result:
            user = await User.create(result['data']['user_id'], tg_user_id)
            users.append(user)
            return user
        return False
    except Exception as ex:
        print(f"Error from get_user: {ex}")
        return False


async def get_user_by_local_id(local_user_id: str) -> User | bool:
    try:
        for user in users:
            if user.user_id == local_user_id:
                return user

        result = await db.get(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, USERS_COLLECTION + f",{local_user_id}")
        if result['success'] and 'telegram_user_id' in result['data']:
            user = await User.create(local_user_id, result['data']['telegram_user_id'])
            users.append(user)
            return user
        return False
    except Exception as ex:
        print(f"Error from get_user: {ex}")
        return False
