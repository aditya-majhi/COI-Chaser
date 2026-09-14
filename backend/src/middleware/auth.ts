import type { NextFunction, Request, Response } from "express";
import { supabaseAuth } from "../services/supabase.js";

export async function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const authorization = request.header("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : undefined;

  if (!token) {
    response.status(401).json({ error: "Authentication required" });
    return;
  }

  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data.user) {
    response.status(401).json({ error: "Invalid authentication token" });
    return;
  }

  request.user = data.user;
  next();
}
