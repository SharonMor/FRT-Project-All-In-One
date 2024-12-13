from pydantic import BaseModel, Field
from typing import Optional, Dict


class UpdateMapRequest(BaseModel):
    map_id: str
    scale: Optional[float] = None
    initial_location: Optional[Dict] = Field(default=None)
