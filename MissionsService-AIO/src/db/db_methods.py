from src.config.contants import REQUEST_TYPE_COLLECTION_COMA_ID_VALUE
from src.db.Database import Database
from src.entities.Mission import Mission

database = Database()


async def update_db_mission(mission: Mission):
    result = await database.update(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE,
                                   f"missions,{mission.mission_id}",
                                   mission.to_dict())
    return result


async def post_db_mission(mission: Mission):
    result = await database.post(REQUEST_TYPE_COLLECTION_COMA_ID_VALUE,
                                 f"missions,{mission.mission_id}",
                                 mission.to_dict())
    return result
