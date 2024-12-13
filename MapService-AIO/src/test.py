import asyncio
from pprint import pprint

import httpx

chat_id = "83ec0a82-577c-4c73-b99d-b1f04fac4a6f"


async def create_map(api_url, api_key):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{api_url}/api/v1/maps/createMap",
            headers={"api-key": api_key},
            json={"map_id": "MAP_2", "scale": 69, "initial_location": {"longitude": 55, "latitude": 11}}
        )
        return response.status_code, response.json()

async def update_map(api_url, api_key):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{api_url}/api/v1/maps/updateMap",
            headers={"api-key": api_key},
            json={"map_id": "MAP_1", "scale": 1, "initial_location": {"longitude": 1, "latitude": 1}}
        )
        return response.status_code, response.json()

async def get_map(api_url, api_key):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{api_url}/api/v1/maps/getMap/MAP_1",
            headers={"api-key": api_key},
        )
        return response.status_code, response.json()


async def main():
    api_url = "http://127.0.0.1:8198"
    api_key = "badihi"  # Replace with your actual API key

    status, result = await create_map(api_url, api_key)
    print(f"Response [{status}]:", result)
    pprint(result)


if __name__ == "__main__":
    asyncio.run(main())
