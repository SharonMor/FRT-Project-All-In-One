from typing import Optional

from pydantic import BaseModel


class UpdateMissionRequest(BaseModel):
    mission_id: str
    publish_to_telegram: Optional[bool] = None
    name: Optional[str] = None
    description: Optional[str] = None
    assigned_id: Optional[str] = None
    mark_id: Optional[str] = None
    deadline: Optional[int] = None
    sender_id: Optional[str] = None
    mission_status: Optional[int] = None
