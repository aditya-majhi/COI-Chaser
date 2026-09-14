import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errors.js";
import { caseRouter } from "./routes/cases.js";
import { complianceRouter } from "./routes/compliance.js";
import { documentRouter } from "./routes/documents.js";
import { extractionRouter } from "./routes/extraction.js";
import { inboundRouter } from "./routes/inbound.js";
import { agentRouter } from "./routes/agent.js";
import { humanReviewRouter } from "./routes/human-review.js";
import { followupRouter } from "./routes/followups.js";
import { healthRouter } from "./routes/health.js";
import { organizationRouter } from "./routes/organizations.js";
import { vendorRouter } from "./routes/vendors.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("combined"));

app.use("/api", healthRouter);
app.use("/api/organizations", organizationRouter);
app.use("/api/vendors", vendorRouter);
app.use("/api/cases", caseRouter);
app.use("/api/cases", documentRouter);
app.use("/api/cases", complianceRouter);
app.use("/api", extractionRouter);
app.use("/api", inboundRouter);
app.use("/api/cases", agentRouter);
app.use("/api/cases", humanReviewRouter);
app.use("/api", followupRouter);

app.use((_request, response) => {
  response.status(404).json({ error: "Route not found" });
});

app.use(errorHandler);
