import base64
import json
import os
import urllib.request
from email import policy
from email.parser import BytesParser

import boto3

s3 = boto3.client("s3")


def handler(event, _context):
    record = event["Records"][0]
    receipt = record["ses"]["receipt"]
    recipient = receipt["recipients"][0]
    bucket = os.environ["RAW_EMAIL_BUCKET"]
    key = record["ses"]["mail"]["messageId"]
    raw = s3.get_object(Bucket=bucket, Key=key)["Body"].read()
    message = BytesParser(policy=policy.default).parsebytes(raw)
    attachments = []
    for part in message.iter_attachments():
        if part.get_content_type() == "application/pdf":
            content = part.get_payload(decode=True)
            if isinstance(content, bytes):
                attachments.append({"filename": part.get_filename() or "attachment.pdf", "content_base64": base64.b64encode(content).decode("ascii")})
    body_part = message.get_body(preferencelist=("plain", "html"))
    body_text = body_part.get_content() if body_part is not None else ""
    payload = json.dumps({"recipient": recipient, "provider_message_id": record["ses"]["mail"]["messageId"], "sender": message.get("From", "unknown@example.com"), "subject": message.get("Subject", ""), "body": body_text, "attachments": attachments}).encode()
    request = urllib.request.Request(os.environ["BACKEND_INBOUND_URL"], data=payload, headers={"Content-Type": "application/json", "X-Internal-Secret": os.environ["INTERNAL_API_SECRET"]})
    with urllib.request.urlopen(request, timeout=20) as response:
        return {"statusCode": response.status, "body": response.read().decode()}
