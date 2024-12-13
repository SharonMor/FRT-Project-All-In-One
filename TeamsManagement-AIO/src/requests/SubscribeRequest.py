from pydantic import BaseModel


class SubscribeRequest(BaseModel):
    parent_owner_id: str
    parent_team_id: str
    child_team_id: str
