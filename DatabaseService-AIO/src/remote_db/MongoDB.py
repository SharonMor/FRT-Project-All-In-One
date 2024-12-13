from pymongo import MongoClient
from pymongo.errors import PyMongoError
from pymongo.results import UpdateResult, DeleteResult, InsertOneResult
from pymongo.server_api import ServerApi
from singleton_decorator import singleton

from src.annotations.init_logger import init_logger
from src.config.Config import Config


@singleton
@init_logger()
class MongoDB:
    def __init__(self):
        self.client = None
        self.db = None
        self.init_db()

    def init_db(self):
        """Initialize the MongoDB client and connect to the specified database."""
        try:
            self.client = MongoClient(Config().project_config['mongo_db']['uri'], server_api=ServerApi('1'))
            self.db = self.client['first_response_team']
            self.client.admin.command('ping')
            self.logger.info("Successfully connected to MongoDB!")
        except PyMongoError as e:
            self.logger.error(f"Failed to connect to MongoDB: {e}")
            raise

    async def close_db(self):
        """Close the MongoDB connection."""
        self.client.close()
        self.logger.info("MongoDB connection closed.")

    async def update(self, collection: str, key: str, value: dict) -> int:
        """Update a document in the specified collection."""
        try:
            update_result: UpdateResult = self.db[collection].update_one(
                {"_id": key},
                {"$set": value},
                upsert=True
            )
            return update_result.modified_count
        except PyMongoError as e:
            self.logger.error(f"Failed to update document: {e}")
            raise

    async def post(self, collection: str, document: dict) -> str:
        """Create a new document in the specified collection."""
        try:
            insert_result: InsertOneResult = self.db[collection].insert_one(document)
            return str(insert_result.inserted_id)
        except PyMongoError as e:
            self.logger.error(f"Failed to insert document: {e}")
            raise

    async def get(self, collection: str, document_id: str) -> dict:
        """Retrieve a document based on the _id from the specified collection."""
        try:
            document = self.db[collection].find_one({"_id": document_id})
            if document:
                document['_id'] = str(document['_id'])
            return document
        except PyMongoError as e:
            self.logger.error(f"Failed to retrieve document: {e}")
            raise

    async def delete(self, collection: str, document_id: str) -> int:
        """Delete a document based on the _id from the specified collection."""
        try:
            delete_result: DeleteResult = self.db[collection].delete_one({"_id": document_id})
            return delete_result.deleted_count
        except PyMongoError as e:
            self.logger.error(f"Failed to delete document: {e}")
            raise

    async def get_bulk(self, collection: str, document_ids: list) -> list:
        """Retrieve multiple documents based on their _id from the specified collection."""
        try:
            cursor = self.db[collection].find({"_id": {"$in": document_ids}})
            documents = []
            for document in cursor:
                if document:
                    documents.append(document)
            return documents
        except PyMongoError as e:
            self.logger.error(f"Failed to retrieve documents: {e}")
            raise

    async def get_by_field(self, collection: str, field_name: str, field_data: str) -> dict:
        """Retrieve a document based on the _id from the specified collection."""
        try:
            document = self.db[collection].find_one({field_name: field_data})
            if document:
                document['_id'] = str(document['_id'])
            return document
        except PyMongoError as e:
            self.logger.error(f"Failed to retrieve document: {e}")
            raise
