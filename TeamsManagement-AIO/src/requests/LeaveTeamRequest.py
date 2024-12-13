from pydantic import BaseModel


class LeaveTeamRequest(BaseModel):
    user_id: str
    team_id: str
