from pydantic import BaseModel


class SetPermissionsRequest(BaseModel):
    user_id: str
    target_user_id: str
    permissions: dict
