import os
import requests
from fastapi import HTTPException
from db_connection.survey_logs import get_newest_survey_activity

FORMBRICKS_API_KEY = os.getenv("FORMBRICKS_API_KEY", "no_api_key_found")

print("FORMBRICKS API KEY LOADED ? ", FORMBRICKS_API_KEY != "no_api_key_found")

def get_last_responses_from_formbricks(response_count: int = 250, skip=0):

    if response_count > 250:
        raise ValueError("Response count max 250")


    headers = {
            'x-api-key': FORMBRICKS_API_KEY
    }

    params = {
        'limit': response_count,
        'skip': skip,
        'sortBy': 'createdAt',
        'order': 'desc',
    }
    response = requests.get(
        'http://formbricks:3000/api/v2/management/responses',
        params=params,
        headers=headers
    )

    if response.status_code != 200:
        raise HTTPException(
            500,
            "Could not connect to Formbricks"
        )

    return response.json()


def get_response_details_from_formbricks(user: str, segment_id: str) -> dict:

    print(f"Getting response details from formbricks for {user} and segment {segment_id}")

    db_log_details = get_newest_survey_activity(user, segment_id)
    if db_log_details is None:
            raise ValueError(f"Could not find response details for {user} and {segment_id} in survey logs")

    last_formbrick_responses = get_last_responses_from_formbricks()

    for response in last_formbrick_responses.get("data", []):
        fb_data = response.get("data", {})
        if fb_data.get("response_id_backend") != db_log_details.get("response_id"):
            continue
        if fb_data.get("user") != db_log_details.get("user_name"):
            print(f"response_id_backend matched but user mismatch: {fb_data.get('user')} != {db_log_details.get('user_name')}")
            continue
        if fb_data.get("segment_id") != db_log_details.get("segment_id"):
            print(f"response_id_backend matched but segment_id mismatch: {fb_data.get('segment_id')} != {db_log_details.get('segment_id')}")
            continue
        return response["data"]

    raise ValueError(f"Could not find response details for {user} and {segment_id} in formbricks data")