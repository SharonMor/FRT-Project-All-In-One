from singleton_decorator import singleton

from src.requests.RequestHandler import RequestHandler
from src.requests.RequestType import RequestType


@singleton
class DBManager:
    def __init__(self):
        self.request_handler = RequestHandler()

    async def update(self, request_type: RequestType, key, value):
        if request_type == RequestType.COLLECTION_COMA_ID_VALUE:
            return await self.request_handler.handle_update_collection_coma_id_value(key, value)

    async def post(self, request_type: RequestType, key, value):
        if request_type == RequestType.COLLECTION_COMA_ID_VALUE:
            return await self.request_handler.handle_post_collection_coma_id_value(key, value)

        if request_type == RequestType.MESSANGER:
            return await self.request_handler.handle_post_messanger(key, value)

        if request_type == RequestType.BULK_COLLECTION_DOCS_BY_ID:
            return await self.request_handler.handle_get_bulk_docs_data_by_id(key, value)

    async def get(self, request_type: RequestType, key: str):
        if request_type == RequestType.COLLECTION_COMA_ID_VALUE:
            return await self.request_handler.handle_get_collection_coma_id_value(key)

        if request_type == RequestType.MESSANGER:
            return await self.request_handler.handle_get_messanger(key)

        if request_type == RequestType.TABLE_TIME_RANGE:
            return await self.request_handler.handle_get_messanger_time_filtered(key)

        if request_type == RequestType.TABLE_DATA:
            return await self.request_handler.handle_get_table_data(key)

        if request_type == RequestType.DATA_BY_FIELD:
            return await self.request_handler.handle_get_data_by_field(key)

        if request_type == RequestType.CALLBACK_QUERY:
            return await self.request_handler.handle_get_callback_query(key)

    async def delete(self, request_type: RequestType, key):
        if request_type == RequestType.COLLECTION_COMA_ID_VALUE:
            return await self.request_handler.handle_delete_collection_coma_id_value(key)
