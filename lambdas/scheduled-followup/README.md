# Scheduled follow-up Lambda

EventBridge invokes a Lambda on a short schedule. The Lambda calls `POST /api/internal/followups/run` with `X-Internal-Secret`. Express finds due `WAITING_FOR_DOCUMENT` and `WAITING_FOR_CORRECTION` cases, verifies their current state, sends at most three automated follow-ups, and escalates overdue cases to `HUMAN_REVIEW`.
