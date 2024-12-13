from typing import Optional

from pydantic import BaseModel, Field


class GetChatRequest(BaseModel):
    chat_id: str
    page: Optional[int] = Field(0, description="Page number")
    page_size: Optional[int] = Field(50, description="Number of items per page")