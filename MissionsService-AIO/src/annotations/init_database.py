from src.db.Database import Database


def init_database():
    def decorator(cls):
        class Wrapped(cls):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, **kwargs)
                self.database = Database()
        return Wrapped
    return decorator