import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { ExerciseLibraryError } from "@/lib/exercises/errors";

export function exerciseErrorResponse(error: unknown) {
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Validation failed", details: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) },
      { status: 400 },
    );
  }
  if (error instanceof ExerciseLibraryError) {
    const status = error.code === "NOT_FOUND" ? 404 : error.code === "DUPLICATE_NAME" ? 409 : 400;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return NextResponse.json({ error: "Exercise name already exists", code: "DUPLICATE_NAME" }, { status: 409 });
  }
  return NextResponse.json({ error: "Unable to process exercise library request" }, { status: 500 });
}
