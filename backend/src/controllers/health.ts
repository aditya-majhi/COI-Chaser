import type { Request, Response } from "express";

export function getHealth(_request: Request, response: Response) {
  response.json({ service: "coi-compliance-agent-api", status: "ok" });
}

export function getSession(request: Request, response: Response) {
  response.json({ user: request.user });
}
