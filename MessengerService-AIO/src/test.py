import asyncio
from pprint import pprint

import httpx

chat_id = "team-8100dce7-6f8b-4402-957a-5c6db90cb16c"
message_id = "dHZZCq4ZHe"


async def get_chat(api_url, api_key):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{api_url}/api/v1/messenger/getChatTimelineExcel",timeout=20,
            headers={"api-key": api_key},
            json={"chat_id": chat_id, "start_time": 1726413625910.8403, "end_time": 9726413635924.8403}
        )
        return response.status_code, response.json()


async def get_chat_insights(api_url, api_key):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{api_url}/api/v1/messenger/getChatInsights/{chat_id}",
            headers={"api-key": api_key},
        )
        return response.status_code, response.json()


async def get_message(api_url, api_key):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{api_url}/api/v1/messenger/getCallbackQueryResults/{chat_id}/{message_id}",
            headers={"api-key": api_key}, timeout=20,
        )
        return response.status_code, response.json()


async def main():
    api_url = "http://127.0.0.1:8097"
    api_key = "badihi"  # Replace with your actual API key

    status, result = await get_chat(api_url,
                                       api_key)
    print(f"Response [{status}]:", result)
    print(len(result))
    pprint(result)


if __name__ == "__main__":
    asyncio.run(main())
