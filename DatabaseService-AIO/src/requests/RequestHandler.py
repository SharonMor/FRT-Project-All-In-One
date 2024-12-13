from singleton_decorator import singleton

from src.local_db.LocalStorage import LocalStorage
from src.local_db.TableStorage import TableStorage
from src.remote_db.MongoDB import MongoDB


@singleton
class RequestHandler:
    def __init__(self):
        self.local_db = LocalStorage()
        self.table_db = TableStorage()
        self.remote_db = MongoDB()
        self.heap_db = {}  # {key :str, val :str}
        self.init()

    def init(self):
        self.local_db.init_db()
        self.remote_db.init_db()

    async def handle_get_collection_coma_id_value(self, key):
        keys = key.split(",")
        return await self.remote_db.get(keys[0], keys[1])

    async def handle_post_collection_coma_id_value(self, key, value):
        keys = key.split(",")
        value['_id'] = keys[1]
        return await self.remote_db.post(keys[0], value)

    async def handle_update_collection_coma_id_value(self, key, value):
        keys = key.split(",")
        return await self.remote_db.update(keys[0], keys[1], value)

    async def handle_delete_collection_coma_id_value(self, key):
        keys = key.split(",")
        return await self.remote_db.delete(keys[0], keys[1])

    async def handle_get_messanger(self, key):
        keys = key.split(",")
        if len(keys) == 1:
            return await self.table_db.get(keys[0])
        if len(keys) == 2:
            return await self.table_db.get(keys[0], int(keys[1]))
        if len(keys) == 3:
            return await self.table_db.get(keys[0], int(keys[1]), int(keys[2]))
        return await self.table_db.get(keys[0], int(keys[1]), int(keys[2]), keys[3])

    async def handle_get_messanger_time_filtered(self, key):
        keys = key.split(",")
        team_id = keys[0]
        start_time = keys[1]
        end_time = keys[2]
        return await self.table_db.get_time_range(team_id, float(start_time), float(end_time))

    async def handle_post_messanger(self, key, value):
        return await self.table_db.post(key, value)

    async def handle_get_table_data(self, key):
        return await self.table_db.get_table_data(key)

    async def handle_get_bulk_docs_data_by_id(self, key, value):
        return await self.remote_db.get_bulk(key, value['documents_id'])

    async def handle_get_data_by_field(self, key):
        keys = key.split(",")
        collection = keys[0]
        field_name = keys[1]
        field_data = keys[2]
        return await self.remote_db.get_by_field(collection, field_name, field_data)

    async def handle_get_callback_query(self, key):
        keys = key.split(",")
        table_id = keys[0]
        callback_query_message_id = keys[1]
        return await self.table_db.get_callback_query(table_id, callback_query_message_id)
