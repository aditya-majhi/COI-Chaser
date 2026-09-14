import type { Request, Response } from "express";
import { processDueCases } from "../services/followup-service.js";

export async function processFollowupsController(
  _request: Request,
  response: Response
) {
  response.status(200).json({ processed: await processDueCases() });
}
