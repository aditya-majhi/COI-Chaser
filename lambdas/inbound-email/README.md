# Inbound email Lambda

The SES receipt rule stores raw mail in S3 and invokes `handler.py`. The Lambda parses MIME, keeps PDF attachments only, and posts the case-addressed message to the protected Express endpoint in `BACKEND_INBOUND_URL`.

Required environment variables:

- `RAW_EMAIL_BUCKET`
- `BACKEND_INBOUND_URL`
- `INTERNAL_API_SECRET`

The backend deduplicates provider message IDs before storing attachments or creating events.
