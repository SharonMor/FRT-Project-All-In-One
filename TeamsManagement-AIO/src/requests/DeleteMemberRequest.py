from pydantic import BaseModel


class DeleteMemberRequest(BaseModel):
    user_id: str
    delete_member_id: str
