from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware

from src.MessengerManager import MessengerManager
from src.config.Config import Config
from src.logger.CustomLogger import CustomLogger
from src.requests.GetChatRequest import GetChatRequest
from src.requests.GetChatTimelineExcelRequest import GetChatTimelineExcelRequest

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
messenger_manager = MessengerManager()


async def initialize_app():
    logger.info("Initializing MessengerManager")
    await messenger_manager.start()
    logger.info("MessengerManager initialized")


async def shutdown_app():
    logger.info("Shutting down MessengerManager")
    await messenger_manager.stop()
    logger.info("MessengerManager shut down")


async def verify_api_key(api_key: str = Header(None)):
    if api_key not in config["api_auth_keys"]:
        logger.error("Unauthorized access attempt with invalid API key.")
        raise HTTPException(status_code=403, detail="Unauthorized")


@app.get("/api/v1/messenger/getChatInsights/{chat_id}")
async def get_chat_insights(chat_id: str, api_key: str = Depends(verify_api_key)):
    try:
        chat = await messenger_manager.get_chat_insights(chat_id)
        if chat:
            return chat
        else:
            logger.warning(f"Chat insights not found: {chat_id}")
            raise HTTPException(status_code=404, detail="Chat not found")
    except Exception as e:
        logger.error(f"Failed to retrieve chat insights {chat_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/v1/messenger/getMessage/{chat_id}/{message_id}")
async def get_message(chat_id: str, message_id: str, api_key: str = Depends(verify_api_key)):
    try:
        message = await messenger_manager.get_message(chat_id, message_id)
        if message:
            return message
        else:
            logger.warning(f"Message not found: chat_id: {chat_id}, message_id: {message_id}")
            raise HTTPException(status_code=404, detail="Message not found")
    except Exception as e:
        logger.error(f"Failed to retrieve chat insights {chat_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/v1/messenger/getCallbackQueryResults/{chat_id}/{callback_query_message_id}")
async def get_callback_query_results_request(chat_id: str, callback_query_message_id: str, api_key: str = Depends(verify_api_key)):
    try:
        message = await messenger_manager.get_callback_query_results(chat_id, callback_query_message_id)
        if message:
            return message
        else:
            logger.warning(f"Message not found: chat_id: {chat_id}, callback_query_message_id: {callback_query_message_id}")
            raise HTTPException(status_code=404, detail="Message not found")
    except Exception as e:
        logger.error(f"Failed to retrieve chat insights {chat_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/health")
async def health_check():
    return JSONResponse(content={"status": "OK"}, status_code=200)


@app.post("/api/v1/messenger/getChat")
async def get_chat(request: GetChatRequest, api_key: str = Depends(verify_api_key)):
    """
    Handle the getChat API request.

    Parameters:
    ----------
    request : GetChatRequest
        The request body containing chat_id, page, and page_size.
    api_key : str
        The API key provided in the request header.

    Returns:
    -------
    dict
        The chat data or an error message.

    Raises:
    ------
    HTTPException
        If the chat is not found or there is an internal server error.
    """
    try:
        chat = await messenger_manager.get_chat(request.chat_id, request.page, request.page_size)
        if chat:
            return chat
        else:
            logger.warning(f"Chat not found: {request.chat_id}")
            raise HTTPException(status_code=404, detail="Chat not found")
    except Exception as e:
        logger.error(f"Failed to retrieve chat {request.chat_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/v1/messenger/getChatTimelineExcel")
async def get_chat_summary_excel(request: GetChatTimelineExcelRequest, api_key: str = Depends(verify_api_key)):
    """
    Handle the getChat API request.

    Parameters:
    ----------
    request : GetChatTimelineExcelRequest
        The request body containing chat_id, start_time, and end_time in milliseconds.
    api_key : str
        The API key provided in the request header.

    Returns:
    -------
    bytes of the excel

    Raises:
    ------
    HTTPException
        If the chat is not found or there is an internal server error.
    """
    try:
        chat = await messenger_manager.get_chat_timeline_excel(request.chat_id, request.start_time, request.end_time)
        if chat:
            return chat
        elif chat is None:
            return []
        else:
            logger.warning(f"Data not found: {request.chat_id}")
            raise HTTPException(status_code=404, detail="Chat not found")
    except Exception as e:
        logger.error(f"Failed to retrieve chat {request.chat_id}: {str(e)}")
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
