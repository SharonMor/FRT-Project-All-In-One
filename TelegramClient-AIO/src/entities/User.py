from src.database.LocalStorage import LocalStorage


class User:
    def __init__(self, user_id, telegram_user_id):
        self.local_db = LocalStorage()

        self.user_id = user_id
        self.telegram_user_id = telegram_user_id
        self.selected_team = None

    async def init(self):
        selected_team = await self.local_db.get_resource(f"selected_team${self.telegram_user_id}")
        if selected_team:
            self.selected_team = selected_team
        return self

    @classmethod
    async def create(cls, user_id, telegram_user_id):
        user = cls(user_id, telegram_user_id)
        return await user.init()
