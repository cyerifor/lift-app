import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { programmeError } from "@/lib/programme/http";
import { updateBlockSchema } from "@/lib/programme/schema";
import { ProgrammeService } from "@/lib/programme/service";
const service = new ProgrammeService(db);
type Context = { params: Promise<{ blockId: string }> };
export async function GET(request: Request, { params }: Context) { const actor = await requireAuthenticatedUser(request); if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); try { return NextResponse.json(await service.getBlock(actor, (await params).blockId)); } catch (error) { return programmeError(error); } }
export async function PATCH(request: Request, { params }: Context) { const actor = await requireAuthenticatedUser(request); if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); try { const { name, ...data } = updateBlockSchema.parse(await request.json()); return NextResponse.json(await service.updateDraftBlock(actor, (await params).blockId, { ...data, ...(name === undefined ? {} : { title: name }) })); } catch (error) { return programmeError(error); } }
