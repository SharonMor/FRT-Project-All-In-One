from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Header, Request, Query
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware

from src.TeamsManager import TeamsManager
from src.config.Config import Config
from src.logger.CustomLogger import CustomLogger
from src.requests.AcceptSubscribeRequest import AcceptSubscribeRequest
from src.requests.AddMemberRequest import AddMemberRequest
from src.requests.CreateTeamRequest import CreateTeamRequest
from src.requests.DeleteMemberRequest import DeleteMemberRequest
from src.requests.LeaveTeamRequest import LeaveTeamRequest
from src.requests.SetPermissionsRequest import SetPermissionsRequest
from src.requests.SubscribeRequest import SubscribeRequest
from src.requests.TeamIDsRequest import TeamIDsRequest
from src.requests.UpdateTeamRequest import UpdateTeamRequest


@asynccontextmanager
async def lifespan(app: FastAPI):
    await initialize_app()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = CustomLogger()
config = Config().project_config
teams_manager = TeamsManager()


async def initialize_app():
    await teams_manager.init()


async def verify_api_key(api_key: str = Header(None)):
    if api_key not in config["api_auth_keys"]:
        logger.error("Unauthorized access attempt with invalid API key.")
        raise HTTPException(status_code=403, detail="Unauthorized")


@app.get("/api/v1/teams/getTeam/{team_id}")
async def get_team(team_id: str, api_key: str = Depends(verify_api_key)):
    try:
        team = await teams_manager.get_team(team_id)
        if team:
            return team.to_dict()
        else:
            logger.warning(f"Team not found: {team_id}")
            raise HTTPException(status_code=404, detail="Team not found")
    except Exception as e:
        logger.error(f"Failed to retrieve team {team_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/v1/teams/getTeams")
async def get_teams(request: TeamIDsRequest, api_key: str = Depends(verify_api_key)):
    try:
        if not request.team_ids:
            return None

        teams = await teams_manager.get_teams(request.team_ids)
        if teams:
            return [team.to_dict() for team in teams if team]
        else:
            logger.warning(f"Teams not found: {request.team_ids}")
            raise HTTPException(status_code=404, detail="Teams not found")
    except Exception as e:
        logger.error(f"Failed to retrieve teams {request.team_ids}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/v1/teams/createTeam")
async def create_team(request: CreateTeamRequest, api_key: str = Depends(verify_api_key)):
    try:
        team = await teams_manager.create_team(request.user_id, request.team_name)
        if team:
            return {"message": "Team created successfully", "team_id": team.team_id}
        else:
            raise HTTPException(status_code=404, detail="Could not create team")
    except Exception as e:
        logger.error(f"Failed to create team: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.put("/api/v1/teams/updateTeam/{team_id}")
async def update_team(team_id: str, request: UpdateTeamRequest, api_key: str = Depends(verify_api_key)):
    try:
        team = await teams_manager.update_team(request.user_id, team_id, request.team_name)
        if team:
            return {"message": "Team updated successfully", "team": team.to_dict()}
        else:
            raise HTTPException(status_code=404, detail="Team not found")
    except Exception as e:
        logger.error(f"Failed to update team {team_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.delete("/api/v1/teams/deleteTeam/{team_id}")
async def delete_team(team_id: str, user_id: str = Query(...), api_key: str = Depends(verify_api_key)):
    try:
        success = await teams_manager.delete_team(user_id, team_id)
        if success:
            return {"message": "Team deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Team not found or could not be deleted")
    except Exception as e:
        logger.error(f"Failed to delete team {team_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/v1/teams/teamHierarchy/{team_id}")
async def get_team_hierarchy(team_id: str, api_key: str = Depends(verify_api_key)):
    try:
        hierarchy = await teams_manager.get_team_hierarchy(team_id)
        return hierarchy
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Failed to retrieve hierarchy for team {team_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/v1/teams/allHierarchies")
async def get_all_hierarchies(api_key: str = Depends(verify_api_key)):
    try:
        all_hierarchies = await teams_manager.get_all_hierarchies()
        return all_hierarchies
    except Exception as e:
        logger.error("Failed to retrieve all hierarchies: " + str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/v1/teams/requestSubscribe")
async def request_subscribe(request: SubscribeRequest, api_key: str = Depends(verify_api_key)):
    if await teams_manager.request_team_subscribe(request.parent_owner_id, request.parent_team_id,
                                                  request.child_team_id):
        return {"message": "Subscription request sent successfully"}
    else:
        raise HTTPException(status_code=400, detail="Subscription request failed")


@app.post("/api/v1/teams/respondSubscribe")
async def respond_subscribe(request: AcceptSubscribeRequest, api_key: str = Depends(verify_api_key)):
    if await teams_manager.respond_team_subscribe(request.child_owner_id, request.parent_team_id, request.child_team_id,
                                                  request.respond):
        return {"message": "Subscription request responded"}
    else:
        raise HTTPException(status_code=400, detail="Subscription acceptance failed")


@app.post("/api/v1/teams/deleteMember/{team_id}")
async def api_delete_member(team_id: str, request: DeleteMemberRequest, api_key: str = Depends(verify_api_key)):
    success = await teams_manager.delete_member_to_team(request.user_id, team_id, request.delete_member_id)
    if success:
        return {"message": success}
    raise HTTPException(status_code=403, detail=success)


@app.post("/api/v1/teams/leaveTeam")
async def api_leave_team(request: LeaveTeamRequest, api_key: str = Depends(verify_api_key)):
    success, code = await teams_manager.leave_team(request.user_id, request.team_id)
    if success:
        return {"message": success, "code": code}
    raise HTTPException(status_code=code, detail=success)


@app.post("/api/v1/teams/addMember/{team_id}")
async def api_add_member(team_id: str, request: AddMemberRequest, api_key: str = Depends(verify_api_key)):
    success = await teams_manager.add_member_to_team(request.user_id, team_id, request.new_member_id)
    if success:
        return {"message": success}
    raise HTTPException(status_code=403, detail=success)


@app.post("/api/v1/teams/setPermissions/{team_id}")
async def api_set_permissions(team_id: str, request: SetPermissionsRequest,
                              api_key: str = Depends(verify_api_key)):
    success = await teams_manager.set_member_permissions(request.user_id, team_id, request.target_user_id,
                                                         request.permissions)
    if success:
        return {"message": success}
    raise HTTPException(status_code=403, detail=success)


@app.get("/health")
async def health_check():
    return JSONResponse(content={"status": "OK"}, status_code=200)


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"}
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host=config['app']['host'], port=config['app']['port'], log_level=config['app']['log_level'])
