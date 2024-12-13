from dataclasses import dataclass, field
from typing import List, Optional
from src.entities.Team import Team


@dataclass
class TeamNode:
    team_id: str
    team: 'Team'
    parent: Optional[str] = None
    children: List[str] = field(default_factory=list)
