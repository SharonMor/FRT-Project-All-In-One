import logging

from src.annotations.init_logger import init_logger
from src.entities.BaseEntity import BaseEntity


@init_logger(level=logging.INFO)
class Permissions(BaseEntity):
    """
    Represents a set of permissions for a user in a team.

    Attributes:
        set_permissions (bool): Permission to set permissions for other users.
        add_member (bool): Permission to add members to the team.
        update_team (bool): Permission to update team details.
    """

    def __init__(self, set_permissions=False, add_member=False, delete_member=False, update_team=False):
        self.set_permissions = set_permissions
        self.add_member = add_member
        self.delete_member = delete_member
        self.update_team = update_team
        self.logger.info(f"Permissions initialized: {self.to_dict()}")

    @classmethod
    def from_dict(cls, data: dict):
        return cls(
            set_permissions=data.get('set_permissions', False),
            add_member=data.get('add_member', False),
            delete_member=data.get('delete_member', False),
            update_team=data.get('update_team', False)
        )

    def to_dict(self):
        return {
            "set_permissions": self.set_permissions,
            "add_member": self.add_member,
            "delete_member": self.delete_member,
            "update_team": self.update_team
        }
