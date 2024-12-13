import asyncio

from src.TeamsManager import TeamsManager

teams_manager = TeamsManager()


async def test():
    success = await teams_manager.delete_member_to_team("7i0ZJx9M3dNvG7xwEnowByF6pPn1", "team-8100dce7-6f8b-4402-957a-5c6db90cb16c", "tDoilwCdcPcXozGuOAsntZsx8mn2")
    print(success)


asyncio.run(test())
