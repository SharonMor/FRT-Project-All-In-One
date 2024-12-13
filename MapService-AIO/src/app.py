from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware

from src.MapManager import MapManager
from src.config.Config import Config
from src.logger.CustomLogger import CustomLogger
from src.requests.CreateMapRequest import CreateMapRequest
from src.requests.UpdateMapRequest import UpdateMapRequest

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
map_manager = MapManager()


async def initialize_app():
    logger.info("Initializing MapManager")
    await map_manager.start()
    logger.info("MapManager initialized")


async def shutdown_app():
    logger.info("Shutting down MapManager")
    await map_manager.stop()
    logger.info("MapManager shut down")


async def verify_api_key(api_key: str = Header(None)):
    if api_key not in config["api_auth_keys"]:
        logger.error("Unauthorized access attempt with invalid API key.")
        raise HTTPException(status_code=403, detail="Unauthorized")


@app.post("/api/v1/maps/createMap")
async def create_map_request(request: CreateMapRequest, api_key: str = Depends(verify_api_key)):
    """
    Handle the create map API request.
    """
    try:
        result, _ = await map_manager.create_map(request.scale, request.initial_location, request.map_id)
        if result:
            return result
        else:
            logger.warning(f"Failed to create map: {request.map_id}")
            raise HTTPException(status_code=404, detail="Create map Failed")

    except Exception as e:
        logger.error(f"Failed to retrieve map {request.map_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/health")
async def health_check():
    return JSONResponse(content={"status": "OK"}, status_code=200)


@app.post("/api/v1/maps/updateMap")
async def update_map_request(request: UpdateMapRequest, api_key: str = Depends(verify_api_key)):
    """
    Handle the update map API request.
    """
    try:
        result = await map_manager.update_map(request.scale, request.initial_location, request.map_id)
        if result:
            return result
        else:
            logger.warning(f"Failed to update map: {request.map_id}")
            raise HTTPException(status_code=404, detail="Update map Failed")

    except Exception as e:
        logger.error(f"Failed to retrieve map {request.map_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/v1/maps/getMap/{map_id}")
async def get_map_request(map_id: str, api_key: str = Depends(verify_api_key)):
    """
    Handle the get_map API request.
    """
    try:
        return (await map_manager.get_map(map_id)).to_dict()
    except Exception as e:
        logger.error(f"Failed to retrieve map {map_id}: {str(e)}")
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
