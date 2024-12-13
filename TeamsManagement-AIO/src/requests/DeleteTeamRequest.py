from pydantic import BaseModel


class DeleteTeamRequest(BaseModel):
    user_id: str
