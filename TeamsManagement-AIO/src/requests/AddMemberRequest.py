from pydantic import BaseModel


class AddMemberRequest(BaseModel):
    user_id: str
    new_member_id: str
