import { NextResponse } from "next/server";

const isDev = process.env.NODE_ENV === "development";

export class APIError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "APIError";
  }
}

export function handleAPIError(err: unknown) {
  if (isDev) {
    console.error("[api-error]", err);
  }

  if (err instanceof APIError) {
    return NextResponse.json(
      { error: err.code, message: err.message },
      { status: err.statusCode },
    );
  }

  if ((err as Error).name === "AbortError") {
    return NextResponse.json(
      { error: "timeout", message: "Request timed out. Please try again." },
      { status: 504 },
    );
  }

  const error = err as Record<string, unknown>;
  if (error.code?.toString().startsWith("PGRST")) {
    return NextResponse.json(
      { error: "database_error", message: "Database operation failed" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { error: "internal_error", message: "An unexpected error occurred" },
    { status: 500 },
  );
}
