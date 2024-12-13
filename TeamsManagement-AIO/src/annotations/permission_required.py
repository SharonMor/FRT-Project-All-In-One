from functools import wraps

from src.entities.User import User


def permission_required(func):
    @wraps(func)
    def wrapper(self, *args, **kwargs):
        # Assuming the first argument is always the user calling the method
        user = args[0]
        if not isinstance(user, User):
            raise ValueError("First argument must be a User instance")

        user_permissions = self._permissions.get(user.user_id, None)
        required_permission = func.__name__

        if self.team_owner.user_id == user.user_id:
            return func(self, *args, **kwargs)

        elif user_permissions and getattr(user_permissions, required_permission, False):
            return func(self, *args, **kwargs)

        else:
            raise PermissionError(
                f"User {user.user_id} does not have the required permissions to execute {required_permission}")

    return wrapper
