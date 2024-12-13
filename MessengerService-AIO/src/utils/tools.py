import json
import re


def safe_json_loads(s):
    if isinstance(s, dict):
        return s
    try:
        corrected_s = re.sub(r"'([^']*)'", r'"\1"', s)
        return json.loads(corrected_s)
    except json.JSONDecodeError:
        return {}

