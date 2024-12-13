from typing import Optional

from pydantic import BaseModel


class GetChatTimelineExcelRequest(BaseModel):
    chat_id: str
    start_time: Optional[float]
    end_time: Optional[float]

