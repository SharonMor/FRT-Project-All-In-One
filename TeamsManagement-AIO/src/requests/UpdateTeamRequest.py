from pydantic import BaseModel


class UpdateTeamRequest(BaseModel):
    user_id: str
    team_name: str
