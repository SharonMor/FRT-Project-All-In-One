import asyncio
from typing import Any

from singleton_decorator import singleton

from src.agents.Consumer import Consumer
from src.annotations.init_database import init_database
from src.annotations.init_logger import init_logger
from src.config.Config import Config
from src.config.contants import DB_TABLES_MESSAGE_TYPE, REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, DEFAULT_LOCATION
from src.entities.Location import Location
from src.entities.Map import Map
from src.entities.Mark import Mark
from src.enums.Timeline import Timeline
from src.kafka.factory import get_producer
from src.kafka.message import get_message_format
from src.utils.generators import generate_random_id


@singleton
@init_logger()
@init_database()
class MapManager:
    """
    A class to manage the Map application, including starting and stopping the Kafka consumer.
    """

    def __init__(self):
        """
        Initializes the MapManager with the project configuration and Kafka consumer.
        """
        self.config = Config().project_config
        self.consumer = Consumer(self.config['kafka']['consumer']['topic'])
        self.producer_messenger = get_producer()
        self._maps = {}
        self.logger.info("Map Manager initialized")

    async def start(self):
        """
        Start the MessengerManager by initiating the Kafka consumer.
        """
        self.logger.info("Starting MapManager")
        asyncio.create_task(self.consume_messages())
        self.logger.info("MapManager started")

    async def get_map(self, map_id) -> Map | None:
        """Retrieve a map by its ID, from cache or database."""

        if map_id in self._maps:
            return self._maps[map_id]

        else:
            response = await self.database.get(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, f"maps,{map_id}")
            if response:
                map_data = response['data']
                self._maps[map_id] = Map.from_dict(map_data)
                return self._maps[map_id]
            self.logger.warning(f"No map found with ID: {map_id}, creating new map")
            _, map_ = await self.create_map(map_id=map_id)
            if map_:
                return map_
        self.logger.error(f"Fail to return map from get_map, ID: {map_id}")
        return None

    async def consume_messages(self):
        """
        Start consuming messages from Kafka.
        """
        self.logger.info("Starting to consume messages")
        try:
            async for message in self.consumer.consume():
                self.logger.info(f"Consumed message: {message.value}")
                await self.handle_message(message)
        except Exception as e:
            self.logger.error(f"Error consuming messages: {e}")
        finally:
            self.logger.info("Finished consuming messages")

    async def handle_message(self, message):
        """
        Handle a consumed Kafka message.
        """
        self.logger.info(f"Handling message: {message.value}")
        try:
            mark = Mark.from_dict(message.value)
            map_ = await self.get_map(mark.map_id)

            if not map_:
                self.logger.error("Bad Request: map_id not found")
                return False

            timeline_message = None
            if mark.message_id in list(
                    mark.message_id for mark in map_.active_marks) and not mark.active:  # delete mark
                map_.active_marks = [current_mark for current_mark in map_.active_marks if
                                     current_mark.message_id != mark.message_id]  # filtered list
                timeline_message = get_message_format(mark.user_id, mark.map_id, mark.message_id, Timeline.DELETE_MARK,
                                                      f"{mark.message_id}-delete")

            elif mark.message_id in list(mark.message_id for mark in map_.active_marks) and mark.active:  # update mark
                map_.active_marks = [current_mark for current_mark in map_.active_marks if
                                     current_mark.message_id != mark.message_id]  # filtered list
                map_.active_marks.append(mark)  # add the updated mark
                timeline_message = get_message_format(mark.user_id, mark.map_id, mark.message_id, Timeline.UPDATE_MARK,
                                                      f"{mark.message_id}-update")

            elif mark.message_id not in list(mark.message_id for mark in map_.active_marks) and mark.active:  # add mark
                map_.active_marks.append(mark)
                timeline_message = get_message_format(mark.user_id, mark.map_id, mark.message_id, Timeline.ADD_MARK,
                                                      f"{mark.message_id}-add")

            if timeline_message:
                await self._send_timeline(timeline_message)

            asyncio.create_task(
                self.database.update(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, f"maps,{mark.map_id}", map_.to_dict()))
            asyncio.create_task(self.database.post(DB_TABLES_MESSAGE_TYPE, "maps_" + mark.map_id, message.value))

            self.logger.info(f"Handled message: {message.value}")
        except Exception as e:
            self.logger.error(f"Error handling message: {e}")

    async def stop(self):
        """
        Stop the Kafka consumer.
        """
        await self.consumer.stop()

    async def create_map(self, scale: float = 15, initial_location: dict = DEFAULT_LOCATION,
                         map_id: str = generate_random_id()) -> tuple[Any, Map] | bool:
        """Create a new map and add it to the database."""
        new_map = Map(map_id, [], scale, Location(**initial_location))
        result = await self.database.post(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, f"maps,{map_id}", new_map.to_dict())
        if result:
            self._maps[map_id] = new_map
            return result, new_map
        return False

    # Todo add abort in case of db request fails, we might be difference between db and ram.
    async def update_map(self, scale: float, initial_location: dict, map_id: str):
        """Updates map and save in the database."""
        map_ = await self.get_map(map_id)
        map_.scale = scale
        map_.initial_location = Location(**initial_location)
        timeline_message = get_message_format(None, map_id, {"scale": scale, "initial_location": initial_location},
                                              Timeline.UPDATE_MAP, generate_random_id())
        await self._send_timeline(timeline_message)
        return await self.database.update(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, f"maps,maps_{map_id}", map_.to_dict())

    async def _send_timeline(self, timeline_message):
        self.logger.info(f"Sending Timeline: {timeline_message}")
        self.producer_messenger.send(self.config['kafka']['producer_messanger_topic'], timeline_message)
