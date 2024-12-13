import time

from singleton_decorator import singleton

from src.annotations.init_database import init_database
from src.annotations.init_logger import init_logger
from src.config.Config import Config
from src.config.contants import REQUEST_TYPE_COLLECTION_COMA_ID_VALUE
from src.db.db_methods import update_db_mission
from src.entities.Mission import Mission
from src.entities.Team import Team
from src.entities.User import User
from src.enums.MissionStatus import MissionStatus
from src.enums.Timeline import Timeline
from src.kafka.factory import get_producer
from src.kafka.message import get_message_format
from src.kafka.message import get_attendance_message_format
from src.utils.generators import generate_random_id
from src.utils.validation import is_team


@singleton
@init_logger()
@init_database()
class MissionsManager:
    """
    A class to manage the Missions application, handling mission creation, assignment,
    and updates using MongoDB.
    """

    def __init__(self):
        """
        Initializes the MissionsManager with the project configuration and sets up
        internal cache for missions.
        """
        self.config = Config().project_config
        self._missions = {}
        self._users = {}
        self._teams = {}
        self.kafka_producer = get_producer()
        self.logger.info("Missions Manager initialized")

    async def start(self):
        """Starts the Missions Manager, preparing it for operation."""
        self.logger.info("Starting MissionsManager")

    async def stop(self):
        """Shuts down the Missions Manager, ensuring all resources are cleanly released."""
        self.logger.info("Stopping MissionsManager")

    async def get_mission(self, mission_id) -> Mission | None:
        """Retrieve a mission by its ID, from cache or database."""

        if mission_id in self._missions:
            return self._missions[mission_id]

        else:
            response = await self.database.get(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, f"missions,{mission_id}")
            if response:
                mission_data = response['data']
                self._missions[mission_id] = Mission.from_dict(mission_data)
                return self._missions[mission_id]
            self.logger.error(f"No mission found with ID: {mission_id}")
        return None

    async def _get_user(self, user_id):
        """Retrieve a user by their ID, from cache or database."""
        if user_id in self._users:
            return self._users[user_id]
        else:
            response = await self.database.get(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, f"users,{user_id}")
            if response:
                user_data = response['data']
                self._users[user_id] = User.from_dict(user_data)
                return self._users[user_id]
            self.logger.error(f"No user found with ID: {user_id}")
        return None

    async def _get_team(self, team_id):
        """Retrieve a team by their ID, from cache or database."""
        if team_id in self._teams:
            return self._teams[team_id]
        else:
            response = await self.database.get(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, f"teams,{team_id}")
            if response:
                team_data = response['data']
                self._teams[team_id] = Team.from_dict(team_data)
                return self._teams[team_id]
            self.logger.error(f"No user found with ID: {team_id}")
        return None

    async def create_mission(self, team_id: str, creator_id: str, name: str, description: str, mark_id: str = None,
                             deadline: int = None, publish_to_telegram: bool = False, is_attendance: bool = False) -> dict | bool:
        """
        Creates a new mission and stores it in the database.
        """
        mission_id = generate_random_id()
        new_mission = Mission(mission_id, team_id=team_id, creator_id=creator_id,
                              name=name, description=description, mark_id=mark_id,
                              deadline=deadline, created_at=time.time()*1000, publish_to_telegram=publish_to_telegram,
                              is_attendance=is_attendance)
        result = await self.database.post(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE,
                                          f"missions,{mission_id}",
                                          new_mission.to_dict())
        if result:
            user = await self._get_user(creator_id)
            user.created_missions_ids.append(mission_id)
            team = await self._get_team(team_id)
            team.missions_id.append(mission_id)

            self._missions[mission_id] = new_mission
            await self.database.update(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, f"teams,{team_id}", team.to_dict())
            await self.database.update(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, f"users,{creator_id}", user.to_dict())
            timeline_message = get_message_format(creator_id, team_id, {"mission_id": mission_id, "name": name},
                                                  Timeline.CREATE_MISSION)
            await self._send_timeline(timeline_message)
            if is_attendance:
                await self._send_attendance(creator_id, team_id,"ירוק בעיניים", mission_id)
            return new_mission.to_dict()
        return False

    async def get_user_missions(self, team_user_id: str) -> list | dict:
        """
        :return: list of participated missions
        """
        if is_team(team_user_id):
            result = await self._get_team_missions(team_user_id)
        else:
            result = await self._get_user_missions(team_user_id)
        return result

    async def update_mission(self, mission_id: str, name: str = None, description: str = None,
                             assigned_id: str = None, deadline: int = None, sender_id: str = None,
                             mark_id: str = None, mission_status: MissionStatus = None,
                             publish_to_telegram: bool = None):
        """
        update missions data.
        """
        self.logger.info(f"Updating mission: {mission_id}")
        self.logger.debug(f"Update parameters: name={name}, description={description}, "
                          f"assigned_id={assigned_id}, deadline={deadline}, "
                          f"mark_id={mark_id}, mission_status={mission_status}, publish_to_telegram={publish_to_telegram}")

        mission = await self.get_mission(mission_id)
        if not mission:
            self.logger.error(f"Mission not found: {mission_id}")
            return None

        mission.updated_at = time.time()

        if mission_status is not None:
            self.logger.info(f"Updating mission status to: {mission_status}")
            await mission.set_status(mission_status)
        if mark_id is not None:
            mission.mark_id = mark_id
        if deadline is not None:
            mission.deadline = deadline
        if assigned_id is not None:
            await self._assign_mission(mission_id, assigned_id)
        if name is not None:
            mission.name = name
        if description is not None:
            mission.description = description
        if publish_to_telegram is not None:
            mission.publish_to_telegram = publish_to_telegram

        self.logger.info(f"Saving updated mission to database: {mission_id}")
        result = await update_db_mission(mission)

        if result:
            self.logger.info(f"Mission updated successfully in the database: {mission_id}")
            try:
                timeline_message = get_message_format(sender_id, mission.team_id,
                                                      {"mission_id": mission_id, "name": name},
                                                      Timeline.UPDATE_MISSION)
                await self._send_timeline(timeline_message)
            except Exception as e:
                self.logger.error(f"Error sending timeline message: {str(e)}")
        else:
            self.logger.error(f"Failed to update mission in the database: {mission_id}")

        return mission.to_dict() if result else None

    async def _assign_mission(self, mission_id: str, assigned_id: str):
        """
        Assigns a mission to a specific member.
        """
        mission = await self.get_mission(mission_id)
        current_assigned_id = mission.assigned_id
        mission.assigned_id = assigned_id
        result = await update_db_mission(mission)

        if result:
            if current_assigned_id:
                mission.history_assignee.append(current_assigned_id)
            await self._update_assignee_mission(assigned_id, mission_id)

            self.logger.info(f"Mission assignment updated in the database: {mission_id}")
        else:
            self.logger.error(f"Failed to update mission assignment in the database: {mission_id}")

        return result

    async def _update_assignee_mission(self, assigned_id, mission_id):
        """
        Save mission to a specific member.
        """
        is_assigned_id_team = is_team(assigned_id)
        if is_assigned_id_team:
            team = await self._get_team(assigned_id)
            team.missions_id.append(mission_id)
            await self.database.update(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, f"teams,{assigned_id}",
                                       team.to_dict())

        else:
            user = await self._get_user(assigned_id)
            user.assigned_missions_ids.append(mission_id)
            await self.database.update(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, f"users,{assigned_id}",
                                       user.to_dict())

    async def _get_team_missions(self, team_id: str):
        team = await self._get_team(team_id)
        return [(await self.get_mission(mission_id)).to_dict() for mission_id in team.missions_id]

    async def _get_user_missions(self, user_id: str):
        user = await self._get_user(user_id)
        assigned_missions = [(await self.get_mission(mission_id)).to_dict() for mission_id in
                             user.assigned_missions_ids]
        created_missions = [(await self.get_mission(mission_id)).to_dict() for mission_id in user.created_missions_ids]
        return {"assigned_missions": assigned_missions, "created_missions": created_missions}

    async def _send_timeline(self, timeline_message):
        self.logger.info(f"Sending Timeline: {timeline_message}")
        if self.kafka_producer:
            self.kafka_producer.send(self.config['kafka']['producer']['messanger_topic'], timeline_message)
        else:
            self.logger.warning("producer_messenger is not initialized. Timeline message not sent.")

    async def _send_attendance(self, creator_id:str, team_id: str, message: str, mission_id: str):
        """
        Sends an attendance message to the message stream topic.
        """
        self.logger.info(f"Sending attendance message for team: {team_id}")

        attendance_message = get_attendance_message_format(creator_id, team_id, message, mission_id)

        if self.kafka_producer:
            self.kafka_producer.send(self.config['kafka']['producer']['messanger_topic'], attendance_message)
            self.logger.info(f"Attendance message sent successfully for team: {team_id}")
        else:
            self.logger.warning("producer_messenger is not initialized. Attendance message not sent.")

    async def delete_mission(self, mission_id: str, sender_id: str, name: str):
        """
        Deletes a mission from the database and updates related user and team data.
        """
        mission = await self.get_mission(mission_id)
        if not mission:
            self.logger.error(f"No mission found with ID: {mission_id}")
            return False

        # Remove mission from database
        result = await self.database.delete(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, f"missions,{mission_id}")
        if not result:
            self.logger.error(f"Failed to delete mission from database: {mission_id}")
            return False

        # Remove mission from creator's created_missions_ids
        creator = await self._get_user(mission.creator_id)
        if creator:
            creator.created_missions_ids.remove(mission_id)
            await self.database.update(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, f"users,{mission.creator_id}",
                                       creator.to_dict())

        # Remove mission from team's missions_id
        team = await self._get_team(mission.team_id)
        if team:
            team.missions_id.remove(mission_id)
            await self.database.update(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, f"teams,{mission.team_id}",
                                       team.to_dict())

        # Remove mission from assigned user's assigned_missions_ids (if assigned)
        if mission.assigned_id:
            assigned_user = await self._get_user(mission.assigned_id)
            if assigned_user:
                assigned_user.assigned_missions_ids.remove(mission_id)
                await self.database.update(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, f"users,{mission.assigned_id}",
                                           assigned_user.to_dict())
        try:
            timeline_message = get_message_format(sender_id, mission.team_id,
                                                  {"mission_id": mission_id, "name": name},
                                                  Timeline.DELETE_MISSION)
            await self._send_timeline(timeline_message)
        except Exception as e:
            self.logger.error(f"Error sending timeline message for mission deletion: {str(e)}")

        self.logger.info(f"Mission deleted successfully: {mission_id}")
        return True
