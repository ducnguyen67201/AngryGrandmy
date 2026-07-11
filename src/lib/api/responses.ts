import { NextResponse } from "next/server";
import { z } from "zod";

type ApiErrorDetail = {
  field?: string;
  message: string;
  code?: string;
};

export function ok<T>(
  data: T,
  meta?: Record<string, unknown>,
  init?: ResponseInit,
) {
  return NextResponse.json({ data, ...(meta ? { meta } : {}) }, init);
}

export function fail(
  code: string,
  message: string,
  status = 400,
  details?: ApiErrorDetail[],
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details?.length ? { details } : {}),
      },
    },
    { status },
  );
}

export function validationFailure(error: unknown) {
  if (error instanceof z.ZodError) {
    return fail(
      "validation_error",
      "Request validation failed.",
      422,
      error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      })),
    );
  }

  return fail(
    "validation_error",
    error instanceof Error ? error.message : "Request validation failed.",
    422,
  );
}
