import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

export function requireInternalSecret(
  request: Request,
  response: Response,
  next: NextFunction
) {
  if (
    !env.INTERNAL_API_SECRET ||
    request.header("x-internal-secret") !== env.INTERNAL_API_SECRET
  ) {
    response.status(401).json({ error: "Invalid internal credential" });
    return;
  }
  next();
}
