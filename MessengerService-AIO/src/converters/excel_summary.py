from datetime import datetime

import pandas as pd
import pytz

from src.api.database import get_message_from_db
from src.api.users_service import get_users
from src.config.contants import SUCCESS_CODE
from src.enums.Timeline import Timeline
from src.logger.CustomLogger import CustomLogger
from src.utils.tools import safe_json_loads

logger = CustomLogger()


def convert_unix_millis_to_israel_time(unix_millis: float) -> str:
    unix_seconds = unix_millis / 1000.0
    utc_time = datetime.utcfromtimestamp(unix_seconds)
    israel_tz = pytz.timezone('Asia/Jerusalem')
    israel_time = utc_time.replace(tzinfo=pytz.utc).astimezone(israel_tz)
    return israel_time.strftime('%Y-%m-%d %H:%M:%S')


async def _get_timeline_name(tid: int):
    return Timeline.from_value(tid).name_format()


async def _get_user_name(uid: str, users):
    for user in users:
        if user.get('_id') == uid:
            return user.get('displayName')
    return None


async def convert_summary_list_to_excel(timeline_data: list[dict], team_id: str):
    flattened_data = []
    unique_uid = list(set(item['user_id'] for item in timeline_data))
    if not unique_uid:
        logger.warning('unique_uid is False')
        return None
    code, users = await get_users(unique_uid)

    if code != SUCCESS_CODE:
        logger.error("From convert_summary_list_to_excel : failed to fetch users from users service")
        return False

    for item in timeline_data:
        try:
            flattened_item = {
                'Timestamp': convert_unix_millis_to_israel_time(item['timestamp']),
                'User Name': await _get_user_name(item['user_id'], users),
                'Message Type': item['message_type'].replace('_', ' ').title(),
                'Data': None
            }
            if item['message_type'] == 'timeline':
                flattened_item['Data'] = await _get_timeline_name(item['message']['timeline'])
            elif item['message_type'] == 'text':
                flattened_item['Data'] = item['message']
            elif item['message_type'] == 'callback_data':
                query_message_id = item['message']['query_message_id']
                user_selection = item['message']['data']
                query_message = await get_message_from_db(team_id, query_message_id)

                if not query_message:
                    logger.warning("From: convert_summary_list_to_excel, failed to get message from db")
                    continue

                query_message_data = query_message[0]

                user_selection_text = None
                callback_query = safe_json_loads(query_message_data['reply_markup'])['inline_keyboard']
                for opt_row in callback_query:
                    for resp_dict in opt_row:
                        if resp_dict['callback_data'] == user_selection:
                            user_selection_text = resp_dict['text']

                if user_selection_text is None:
                    logger.warning("From: convert_summary_list_to_excel, could not get user response")
                    flattened_item['Data'] = None
                    continue

                flattened_item['Data'] = f"Query: {query_message_data['message']}, Response: {user_selection_text}"

            flattened_data.append(flattened_item)

        except Exception as ex:
            logger.error(f"From: convert_summary_list_to_excel, ex: {ex}")

    df = pd.DataFrame(flattened_data)

    return df.to_dict(orient='records')
    # # Creating an Excel file in memory
    # excel_buffer = BytesIO()
    # with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
    #     df.to_excel(writer, index=False)
    # excel_buffer.seek(0)
    #
    # # Return the Excel file as bytes
    # return excel_buffer.getvalue()
