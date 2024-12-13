from typing import Optional

from pydantic import BaseModel, Field

from src.utils.generators import generate_random_id


class CreateMapRequest(BaseModel):
    map_id: Optional[str] = Field(generate_random_id(), description="Map id usually will be the same as the team id")
    scale: Optional[float] = Field(15.0, description="Initial scale of the map")
    initial_location: dict
