from contextlib import asynccontextmanager
import os
import sys
from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware

from src.MissionsManager import MissionsManager
from src.config.Config import Config
from src.enums.MissionOperation import MissionOperation
from src.enums.MissionStatus import MissionStatus
from src.kafka.factory import get_producer
from src.logger.CustomLogger import CustomLogger
from src.requests.CreateMissionRequest import CreateMissionRequest
from src.requests.DeleteMissionRequest import DeleteMissionDto
from src.requests.UpdateMissionRequest import UpdateMissionRequest

logger = CustomLogger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing app lifespan")
    await initialize_app()
    logger.info("Yielding control back to FastAPI")
    yield
    await shutdown_app()
    logger.info("App lifespan ending")


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

config = Config().project_config
missions_manager = MissionsManager()
kafka_producer = get_producer()


async def initialize_app():
    logger.info("Initializing MissionsManager")
    await missions_manager.start()
    logger.info("MissionsManager initialized")


async def shutdown_app():
    logger.info("Shutting down MissionsManager")
    await missions_manager.stop()
    logger.info("MissionsManager shut down")


async def verify_api_key(api_key: str = Header(None)):
    if api_key not in config["api_auth_keys"]:
        logger.error("Unauthorized access attempt with invalid API key.")
        raise HTTPException(status_code=403, detail="Unauthorized")


@app.get("/api/v1/missions/getMission/{mission_id}")
async def get_mission_request(mission_id: str, api_key: str = Depends(verify_api_key)):
    try:
        result = await missions_manager.get_mission(mission_id)
        if result:
            return result.to_dict()
        else:
            logger.warning(f"Failed to get mission: {mission_id}")
            raise HTTPException(status_code=404, detail="Create map Failed")

    except Exception as e:
        logger.error(f"Failed to retrieve mission {mission_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/v1/missions/createMission")
async def create_mission_request(request: CreateMissionRequest, api_key: str = Depends(verify_api_key)):
    try:
        result = await missions_manager.create_mission(team_id=request.team_id, creator_id=request.creator_id,
                                                       name=request.name,
                                                       description=request.description, mark_id=request.mark_id,
                                                       deadline=request.deadline,
                                                       publish_to_telegram=request.publish_to_telegram,
                                                       is_attendance=request.is_attendance)
        if result:
            kafka_producer.send(config['kafka']['producer']['mission_topic'],
                                {"operation": MissionOperation.CREATE_MISSION.value, "mission": result})
            return result
        else:
            logger.warning(f"Failed to create mission: {request.name}")
            raise HTTPException(status_code=404, detail="Update map Failed")

    except Exception as e:
        logger.error(f"Exception from create mission {request.name}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/health")
async def health_check():
    return JSONResponse(content={"status": "OK"}, status_code=200)


@app.post("/api/v1/missions/updateMission")
async def update_mission_request(request: UpdateMissionRequest, api_key: str = Depends(verify_api_key)):
    try:

        result = await missions_manager.update_mission(mission_id=request.mission_id,
                                                       name=request.name,
                                                       description=request.description,
                                                       assigned_id=request.assigned_id,
                                                       mark_id=request.mark_id,
                                                       deadline=request.deadline,
                                                       sender_id=request.sender_id,
                                                       publish_to_telegram=request.publish_to_telegram,
                                                       mission_status=MissionStatus.from_value(
                                                           request.mission_status) if request.mission_status else None)
        if result:
            kafka_producer.send(config['kafka']['producer']['mission_topic'],
                                {"operation": MissionOperation.UPDATE_MISSION.value, "mission": result})
            return result
        else:
            logger.warning(f"Failed to set mission status: {request.mission_id}")
            raise HTTPException(status_code=404, detail="Update map Failed")

    except Exception as e:
        logger.error(f"Exception from set mission status {request.mission_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/v1/missions/getUserMissions/{user_id}")
async def get_user_missions_request(user_id: str, api_key: str = Depends(verify_api_key)):
    try:
        missions = await missions_manager.get_user_missions(user_id)
        return missions
    except Exception as e:
        logger.error(f"Failed to retrieve user missions {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.delete("/api/v1/missions/deleteMission")
async def delete_mission_request(request: DeleteMissionDto, api_key: str = Depends(verify_api_key)):
    try:
        result = await missions_manager.delete_mission(
            mission_id=request.mission_id,
            sender_id=request.sender_id,
            name=request.name
        )
        if result:
            kafka_producer.send(config['kafka']['producer']['mission_topic'],
                                {"operation": MissionOperation.DELETE_MISSION.value,
                                 "mission": {"mission_id": request.mission_id, "sender_id": request.sender_id,
                                             "name": request.name}})

            return {"message": "Mission deleted successfully"}
        else:
            logger.warning(f"Failed to delete mission: {request.mission_id}")
            raise HTTPException(status_code=404, detail="Delete mission Failed")
    except Exception as e:
        logger.error(f"Exception from delete mission {request.mission_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"}
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host=config['app']['host'], port=config['app']['port'], log_level="debug")
print("Current working directory:", os.getcwd())
print("Contents of current directory:", os.listdir())
print("Python path:", sys.path)
print("Environment variables:", os.environ)