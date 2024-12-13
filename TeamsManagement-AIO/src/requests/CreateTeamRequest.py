from pydantic import BaseModel


class CreateTeamRequest(BaseModel):
    user_id: str
    team_name: str
