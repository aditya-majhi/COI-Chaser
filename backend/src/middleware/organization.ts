import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "../services/supabase.js";

export async function requireOrganization(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const organizationId = request.header("x-organization-id");
  if (!organizationId) {
    response
      .status(400)
      .json({ error: "X-Organization-Id header is required" });
    return;
  }

  const userId = request.user?.id;
  if (!userId) {
    response.status(401).json({ error: "Authentication required" });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("organization_members")
    .select("organization_id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    next(error);
    return;
  }

  if (!data) {
    response
      .status(403)
      .json({ error: "User is not a member of this organization" });
    return;
  }

  request.organizationId = organizationId;
  next();
}
