import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ProgrammeError } from "./errors";
export function programmeError(error: unknown) { if (error instanceof ZodError) return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 }); if (error instanceof ProgrammeError) return NextResponse.json({ error: error.message }, { status: error.status }); console.error(error); return NextResponse.json({ error: "Unable to process programme request" }, { status: 500 }); }
