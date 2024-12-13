from typing import Optional

from pydantic import BaseModel


class DeleteMissionDto(BaseModel):
    mission_id: str
    name: str
    sender_id: str
