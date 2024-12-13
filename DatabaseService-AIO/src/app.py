from fastapi import FastAPI, HTTPException, Depends, Header, Request, Body
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware

from src.DBManager import DBManager
from src.config.Config import Config
from src.logger.CustomLogger import CustomLogger
from src.requests.RequestType import RequestType

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = CustomLogger()
config = Config().project_config
db_manager = DBManager()


async def verify_api_key(api_key: str = Header(None)):
    if api_key not in config["api_auth_keys"]:
        logger.error(f"Unauthorized access attempt with API key: {api_key}")
        raise HTTPException(status_code=403, detail="Unauthorized")


@app.get("/api/v1/get/{request_type}/{key}", status_code=200)
async def get_value(key: str, request_type: int, api_key: str = Depends(verify_api_key)):
    try:
        value = await db_manager.get(RequestType.from_value(request_type), key)
        if value is not None:
            print(value)
            return {"success": True, "data": value}
        else:
            logger.warning(f"Value not found for key: {key}")
            raise HTTPException(status_code=404, detail="Key not found")
    except Exception as e:
        logger.error(f"Failed to retrieve value: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/v1/post/{request_type}/{key}", status_code=201)
async def post_value(key: str, request_type: int, request_body: dict = Body(...),
                     api_key: str = Depends(verify_api_key)):
    try:
        result = await db_manager.post(RequestType.from_value(request_type), key, request_body)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Failed to post value: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/health")
async def health_check():
    return JSONResponse(content={"status": "OK"}, status_code=200)


@app.put("/api/v1/update/{request_type}/{key}", status_code=200)
async def update_value(key: str, request_type: int, request_body: dict = Body(...),
                       api_key: str = Depends(verify_api_key)):
    try:
        result = await db_manager.update(RequestType.from_value(request_type), key, request_body)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Failed to update value: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.delete("/api/v1/delete/{request_type}/{key}", status_code=200)
async def delete_value(request_type: int, key: str, api_key: str = Depends(verify_api_key)):
    try:
        result = await db_manager.delete(RequestType.from_value(request_type), key)
        if result:
            return {"success": True, "data": f"Key {key} deleted successfully"}
        else:
            return {"success": False, "error": "Key not found"}, 404
    except Exception as e:
        logger.error(f"Failed to delete key: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
        headers={"Content-Type": "application/json"}
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host=config['app']['host'], port=config['app']['port'], log_level=config['app']['log_level'])
