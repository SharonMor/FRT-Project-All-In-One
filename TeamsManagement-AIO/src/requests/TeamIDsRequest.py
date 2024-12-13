from typing import List

from pydantic import BaseModel


class TeamIDsRequest(BaseModel):
    team_ids: List[str]