import json
import os
import urllib.request


def handler(_event, _context):
    request = urllib.request.Request(
        os.environ["BACKEND_FOLLOWUP_URL"],
        data=b"{}",
        method="POST",
        headers={"Content-Type": "application/json", "X-Internal-Secret": os.environ["INTERNAL_API_SECRET"]},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return {"statusCode": response.status, "body": response.read().decode()}