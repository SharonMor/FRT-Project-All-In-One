from pydantic import BaseModel


class AcceptSubscribeRequest(BaseModel):
    child_owner_id: str
    parent_team_id: str
    child_team_id: str
    respond: bool
