import logging

from src.annotations.init_logger import init_logger
from src.annotations.permission_required import permission_required
from src.entities.BaseEntity import BaseEntity
from src.entities.Permissions import Permissions
from src.entities.User import User


@init_logger(level=logging.INFO)
class Team(BaseEntity):
    """
    Represents a team in the system.

    Attributes:
        team_id (str): The unique identifier for the team.
        team_name (str): The name of the team.
        team_owner (User): The owner of the team.
        _members (list): A list of User instances representing team members.
        _permissions (dict): A dictionary mapping user IDs to Permissions instances.
    """

    def __init__(self, team_id: str, team_name: str, team_owner: User, members: list, permissions: dict):
        self.team_id = team_id
        self.team_name = team_name
        self.team_owner = team_owner
        self._members = members  # [User(), User(), ...]
        self._permissions = permissions  # {user_id: Permissions()}
        self.logger.info(f"Team initialized: {self.to_dict()}")

    @permission_required
    def add_member(self, user: User, new_member: User):
        """
        Adds a new member to the team.

        Args:
            user (User): The user performing the action.
            new_member (User): The new member to be added.
        """
        self._members.append(new_member)
        self.logger.info(f"Added member {new_member.user_id} to team {self.team_id}.")

    @permission_required
    def delete_member(self, user: User, delete_member: User):
        """
        Delete member From the team.

        Args:
            user (User): The user performing the action.
            delete_member (User):  member to be deleted.
        """
        self._members.remove(delete_member)
        self.logger.info(f"Delete member {delete_member.user_id} to team {self.team_id}.")

    def leave_team(self, user):
        self._members.remove(user)
        self.logger.info(f"{user.user_id} left team {self.team_id}.")

    @permission_required
    def set_permissions(self, user: User, user_id: str, permissions: Permissions):
        """
        Sets the permissions for a member in the team.

        Args:
            user (User): The user performing the action.
            user_id (str): The ID of the user whose permissions are being set.
            permissions (Permissions): The permissions to be set.
        """
        self._permissions[user_id] = permissions
        self.logger.info(f"Set permissions for user {user_id} in team {self.team_id}: {permissions.to_dict()}.")

    @permission_required
    def change_owner(self, user: User, new_owner: User):
        """
        Changes the owner of the team.

        Args:
            user (User): The user performing the action.
            new_owner (User): The new owner of the team.
        """
        self.team_owner = new_owner
        self.logger.info(f"Changed owner of team {self.team_id} to {new_owner.user_id}.")

    @permission_required
    def update_team(self, user: User, team_name: str):
        """
        Updates the name of the team.

        Args:
            user (User): The user performing the action.
            team_name (str): The new name of the team.
        """
        self.team_name = team_name
        self.logger.info(f"Updated team {self.team_id} name to {team_name}.")

    @classmethod
    def from_dict(cls, data: dict):
        team_owner = User.from_dict(data['team_owner']) if 'team_owner' in data else None
        members = [User.from_dict(udict) for udict in data.get('members', [])]
        permissions = {uid: Permissions.from_dict(pdict) for uid, pdict in data.get('permissions', {}).items()}
        return cls(
            team_id=data['_id'],
            team_name=data['team_name'],
            team_owner=team_owner,
            members=members,
            permissions=permissions
        )

    def to_dict(self):
        return {
            "_id": self.team_id,
            "team_name": self.team_name,
            "team_owner": self.team_owner.to_dict(),
            "members": [member.to_dict() for member in self._members],
            "permissions": {user_id: permission.to_dict() for user_id, permission in self._permissions.items()}
        }
