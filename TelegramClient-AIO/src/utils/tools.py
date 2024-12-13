from datetime import datetime

import requests


def extract_callback_data(data: str):
    params = data.split("$")[-1]
    return params.split("_")


def format_timestamp(timestamp):
    if isinstance(timestamp, (int, float)):
        return datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M')
    return 'N/A'


async def reverse_geocode_osm(lat, lon):
    url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&accept-language=he"
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    else:
        return None
