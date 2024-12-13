from singleton_decorator import singleton

from src.annotations.init_database import init_database
from src.annotations.init_logger import init_logger
from src.config.Config import Config
from src.config.constants import REQUEST_TYPE_COLLECTION_COMA_ID_VALUE
from src.data_structure.TeamsGraph import TeamsGraph
from src.entities.Permissions import Permissions
from src.entities.Team import Team
from src.entities.User import User
from src.enums.Errors import Errors
from src.enums.Timeline import Timeline
from src.kafka.factory import get_producer
from src.kafka.message import get_message_format
from src.utils.generators import generate_random_id


@singleton
@init_logger()
@init_database()
class TeamsManager:
    """
    Manages teams, users, and their hierarchies within the system.

    Attributes:
        _teams (dict): Maps team IDs to Team instances.
        _users (dict): Maps user IDs to User instances.
        _teams_graph (TeamsGraph): Manages the hierarchical relationships between teams.
        _subscribe_team_requests (dict): Tracks pending subscription requests between teams.
    """

    def __init__(self):
        self._teams = {}
        self._users = {}
        self._teams_graph = TeamsGraph()
        self._subscribe_team_requests = {}
        self._kafka_producer = get_producer()
        self._config = Config().project_config

    async def init(self):
        get_subscribe_team_requests_result = await self.database.get(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE,
                                                                     f"teams_manager,subscribe_team_requests")
        if get_subscribe_team_requests_result:
            self._subscribe_team_requests = get_subscribe_team_requests_result['data']
            del self._subscribe_team_requests['_id']

        await self._teams_graph.init()
        self.logger.info("TeamsManager initialized")

    async def get_team(self, team_id):
        """Retrieve a team by its ID, from cache or database."""
        if team_id in self._teams:
            return self._teams[team_id]
        else:
            response = await self.database.get(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, f"teams,{team_id}")
            if response:
                team_data = response['data']
                self._teams[team_id] = Team.from_dict(team_data)
                return self._teams[team_id]
            self.logger.error(f"No team found with ID: {team_id}")
        return None

    async def get_teams(self, team_ids: list):
        """Retrieve a teams by their IDs, from cache or database."""
        return [await self.get_team(team_id) for team_id in team_ids]

    async def get_user(self, user_id) -> User | None:
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

    async def update_team(self, user_id: str, team_id: str, team_name: str):
        """Update the team's name if the requesting user is authorized."""
        team = await self.get_team(team_id)
        user = await self.get_user(user_id)
        if not team or not user:
            self.logger.warning("Update failed: User or team not found")
            return False
        if user.user_id != team.team_owner.user_id:
            self.logger.error("Unauthorized user attempted to update team")
            return False
        team.update_team(user, team_name)
        await self.database.update(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, f"teams,{team_id}", team.to_dict())
        self.logger.info(f"Team {team_id} updated by {user_id}")
        return team

    async def create_team(self, user_id: str, team_name: str):
        """Create a new team and add it to the database."""
        user = await self.get_user(user_id)
        if not user:
            self.logger.error("User not found, cannot create team")
            return False
        team_id = generate_random_id()
        new_team = Team(team_id, team_name, user, [user], {})
        self._teams[team_id] = new_team
        await self.database.post(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, f"teams,{team_id}", new_team.to_dict())
        # Add the new team ID to the user's team list
        if await self.add_team_to_user(user_id, team_id):
            self.logger.info(f"Team {team_id} created by {user_id} and added to the user's team list")
            timeline_message = get_message_format(user_id, team_id, "נוצר צ'אט חדש", Timeline.START_NEW_CHAT,
                                                  generate_random_id())
            self._kafka_producer.send(self._config['kafka']['topics']['messanger_topic'], timeline_message)
        else:
            self.logger.warning(f"Failed to add team {team_id} to user {user_id}'s team list")
        return new_team

    async def delete_team(self, user_id: str, team_id: str):
        """Delete a team if the requesting user is the team owner."""
        team = await self.get_team(team_id)
        user = await self.get_user(user_id)
        if not team or not user:
            self.logger.warning("Deletion failed: User or team not found")
            return False
        if user.user_id != team.team_owner.user_id:
            self.logger.error("Unauthorized user attempted to delete team")
            return False

        # Remove the team from all member's lists
        removal_results = [await self.remove_team_from_user(member.user_id, team_id) for member in team.members]
        if all(removal_results):
            self.logger.info(f"All members were updated successfully after deleting team {team_id}")
        else:
            self.logger.warning("Some members might not have been updated successfully")

        del self._teams[team.team_id]
        await self.database.delete(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, f"teams,{team_id}")
        self.logger.info(f"Team {team_id} deleted by {user_id}")
        return True

    async def get_team_hierarchy(self, team_id: str) -> dict:
        """Retrieve the hierarchical structure of the specified team."""
        team = await self.get_team(team_id)
        if not team:
            self.logger.error(f"Team not found for hierarchy retrieval: {team_id}")
            raise ValueError(f"Could not find Team: {team_id}")
        await self._teams_graph.add_team(team.team_id)
        hierarchy = self._teams_graph.get_team_hierarchy(team_id)
        self.logger.info(f"Retrieved hierarchy for team {team_id}")
        return hierarchy

    async def get_all_hierarchies(self) -> dict:
        """Retrieve all team hierarchies managed by the system."""
        hierarchies = self._teams_graph.get_all_hierarchies()
        self.logger.info("Retrieved all team hierarchies")
        return hierarchies

    async def request_team_subscribe(self, parent_owner_id: str, parent_team_id: str, child_team_id: str):
        """Request a team subscription to link a child team to a parent team."""
        parent_owner = await self.get_user(parent_owner_id)
        parent_team = await self.get_team(parent_team_id)
        child_team = await self.get_team(child_team_id)

        if not parent_owner or not parent_team or not child_team:
            self.logger.error("Entity not found during subscription request")
            return False

        if parent_owner_id != parent_team.team_owner.user_id:
            self.logger.warning("User attempted to subscribe but is not the owner")
            return False

        requests = self._subscribe_team_requests.setdefault(parent_team.team_id, [])
        if child_team.team_id not in requests:
            requests.append(child_team.team_id)
            self.logger.info(f"Subscription request added for {child_team.team_id} to {parent_team.team_id}")
            await self.database.update(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, f"teams_manager,subscribe_team_requests",
                                       self._subscribe_team_requests)
        return True

    async def respond_team_subscribe(self, child_owner_id: str, parent_team_id: str, child_team_id: str, respond: bool):
        """Accept a team subscription request."""
        child_owner = await self.get_user(child_owner_id)
        parent_team = await self.get_team(parent_team_id)
        child_team = await self.get_team(child_team_id)

        if not child_owner or not parent_team or not child_team:
            self.logger.error("Entity not found during subscription responding")
            return False

        if child_owner_id != child_team.team_owner.user_id:
            self.logger.warning("Unauthorized subscription responding attempt")
            return False

        if child_team.team_id in self._subscribe_team_requests.get(parent_team.team_id, []):
            if respond:
                await self._teams_graph.add_team(parent_team.team_id)
                await self._teams_graph.add_team(child_team.team_id)
                await self._teams_graph.add_subteam(parent_team.team_id, child_team.team_id)
                self.logger.info(f"Subscription accepted between {parent_team.team_id} and {child_team.team_id}")
            else:
                self.logger.info(f"Subscription denied between {parent_team.team_id} and {child_team.team_id}")

            self._subscribe_team_requests[parent_team.team_id].remove(child_team.team_id)
            await self.database.update(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, f"teams_manager,subscribe_team_requests",
                                       self._subscribe_team_requests)
            return True

        self.logger.warning("Subscription request not found")
        return False

    async def delete_member_to_team(self, user_id: str, team_id: str, delete_member_id: str):
        """Delete a member from a team."""
        user = await self.get_user(user_id)
        delete_member = await self.get_user(delete_member_id)
        team = await self.get_team(team_id)

        if not user or not delete_member or not team:
            self.logger.error(
                f"Failed to delete member: User or team not found, user_id: {user_id}, team_id: {team_id}")
            return False

        team.delete_member(user, delete_member)
        await self.remove_team_from_user(delete_member_id, team_id)
        await self.database.update(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, f"teams,{team_id}", team.to_dict())
        self.logger.info(f"Deleted member {delete_member_id} from team {team_id} successfully")
        return True

    async def add_member_to_team(self, user_id: str, team_id: str, new_member_id: str):
        """Add a new member to a team"""
        user = await self.get_user(user_id)
        new_member = await self.get_user(new_member_id)
        team = await self.get_team(team_id)

        if not user or not new_member or not team:
            self.logger.error("Failed to add member: User or team not found")
            return False

        team.add_member(user, new_member)
        await self.add_team_to_user(new_member_id, team_id)
        await self.database.update(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, f"teams,{team_id}", team.to_dict())
        self.logger.info(f"Added new member {new_member_id} to team {team_id}")
        return True

    async def set_member_permissions(self, user_id: str, team_id: str, target_user_id: str, permissions_dict: dict):
        """Set permissions for a team member if the requesting user is the team owner."""
        user = await self.get_user(user_id)
        target_user = await self.get_user(target_user_id)
        team = await self.get_team(team_id)

        if not user or not target_user or not team:
            self.logger.error("Failed to set permissions: User or team not found")
            return False

        if user_id != team.team_owner.user_id:
            self.logger.warning("Unauthorized attempt to set permissions")
            return False

        permissions = Permissions(**permissions_dict)
        team.set_permissions(user, target_user_id, permissions)
        await self.database.update(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, f"teams,{team_id}", team.to_dict())
        self.logger.info(f"Set permissions for {target_user_id} in team {team_id}")
        return True

    async def add_team_to_user(self, user_id: str, team_id: str):
        """Adds a team to the user's list of teams."""
        user = await self.get_user(user_id)
        if not user:
            self.logger.error(f"User not found with ID: {user_id}")
            return False

        if team_id not in user.team_ids:
            user.team_ids.append(team_id)
            await self.database.update(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, f"users,{user_id}", user.to_dict())
            self.logger.info(f"Team {team_id} added to user {user_id}")
            return True
        else:
            self.logger.info(f"Team {team_id} is already in user {user_id}'s team list")
            return False

    async def remove_team_from_user(self, user_id: str, team_id: str):
        """Removes a team from the user's list of teams."""
        user = await self.get_user(user_id)
        if not user:
            self.logger.error(f"User not found with ID: {user_id}")
            return False

        if team_id in user.team_ids:
            user.team_ids.remove(team_id)
            await self.database.update(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, f"users,{user_id}", user.to_dict())
            self.logger.info(f"Team {team_id} removed from user {user_id}'s team list")
            return True
        else:
            self.logger.info(f"Team {team_id} was not found in user {user_id}'s team list")
            return False

    async def leave_team(self, user_id: str, team_id: str):
        """Delete a member from a team."""
        user = await self.get_user(user_id)
        team: Team = await self.get_team(team_id)

        if user.user_id == team.team_owner.user_id:
            self.logger.warning(
                f"Failed to leave team: Owner cannot leave the team, user_id: {user_id}, team_id: {team_id}")
            return False, Errors.OWNER_CANNOT_LEAVE_TEAM.value

        if not user or not team:
            self.logger.error(
                f"Failed to delete member: User or team not found, user_id: {user_id}, team_id: {team_id}")
            return False, Errors.INTERNAL_ERROR.value

        team.leave_team(user)
        await self.remove_team_from_user(user_id, team_id)
        await self.database.update(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE, f"teams,{team_id}", team.to_dict())
        self.logger.info(f"Deleted member {user_id} from team {team_id} successfully")
        return True, Errors.SUCCESS
