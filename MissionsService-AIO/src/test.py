import asyncio

from src.MissionsManager import MissionsManager

missions_manager = MissionsManager()


async def main():
    await missions_manager.start_green_eyes("83ec0a82-577c-4c73-b99d-b1f04fac4a6f")

asyncio.run(main())