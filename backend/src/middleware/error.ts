import type { Request, Response, NextFunction } from "express";
import { logger } from "../logger.js";

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

/** Global error handler middleware */
export function errorHandler(
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  logger.error("API Error", {
    statusCode,
    message,
    code: err.code,
    stack: err.stack,
  });

  res.status(statusCode).json({
    error: message,
    code: err.code,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

/** Not found handler */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: "Not Found",
    path: req.path,
  });
}

/** Create an API error */
export function createError(
  message: string,
  statusCode = 500,
  code?: string
): ApiError {
  const error: ApiError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
