from typing import Optional

from pydantic import BaseModel


class CreateMissionRequest(BaseModel):
    team_id: str
    creator_id: str
    name: str
    description: str
    is_attendance: bool
    publish_to_telegram: bool
    mark_id: Optional[str] = None
    deadline: Optional[int] = None
