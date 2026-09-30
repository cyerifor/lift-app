import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { programmeError } from "@/lib/programme/http";
import { createBlockSchema } from "@/lib/programme/schema";
import { ProgrammeService } from "@/lib/programme/service";
const service = new ProgrammeService(db);
export async function POST(request: Request) { const actor = await requireAuthenticatedUser(request); if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); try { return NextResponse.json(await service.createDraftBlock(actor, createBlockSchema.parse(await request.json())), { status: 201 }); } catch (error) { return programmeError(error); } }
export async function GET(request: Request) { const actor = await requireAuthenticatedUser(request); if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const athleteId = new URL(request.url).searchParams.get("athleteId"); if (!athleteId) return NextResponse.json({ error: "athleteId is required" }, { status: 400 }); try { return NextResponse.json(await service.listAthleteBlocks(actor, athleteId)); } catch (error) { return programmeError(error); } }
