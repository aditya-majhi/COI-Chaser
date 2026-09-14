export const logger = {
  info(message: string, context?: Record<string, unknown>) {
    console.info(JSON.stringify({ level: "info", message, ...context }));
  },
  error(error: unknown, context?: Record<string, unknown>) {
    console.error(JSON.stringify({ level: "error", error, ...context }));
  },
};
