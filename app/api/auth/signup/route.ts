import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { createSession, setSessionCookie } from "@/lib/session";

const signupSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(128, "Password cannot exceed 128 characters"),
  personalName: z.string().trim().min(1, "Personal name is required").max(100),
  businessName: z.string().trim().min(1, "Business name is required").max(120),
  timezone: z.string().trim().min(1, "Timezone is required").max(80),
  defaultUnits: z.enum(["kg", "lb", "METRIC", "IMPERIAL"]),
  tier: z.enum(["STARTER", "PRO", "SCALE"]),
});

type SignupInput = z.infer<typeof signupSchema>;

function extractValidationErrors(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

const acceptedImageMimeTypes = new Set(["image/png", "image/jpeg", "image/svg+xml"]);

function getFileExtension(file: File) {
  if (file.type === "image/png") return ".png";
  if (file.type === "image/jpeg") return ".jpg";
  if (file.type === "image/svg+xml") return ".svg";

  const fromName = path.extname(file.name).toLowerCase();
  if (fromName) return fromName;
  return ".bin";
}

async function saveLogoFile(file: File) {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const extension = getFileExtension(file);
  const fileName = `${Date.now()}-${randomBytes(8).toString("hex")}${extension}`;
  const filePath = path.join(uploadsDir, fileName);
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  await writeFile(filePath, fileBuffer);
  return `/uploads/${fileName}`;
}

export async function POST(request: Request) {
  let payload: SignupInput;
  let normalizedLogoUrl: string | null = null;

  try {
    const body = await request.formData();
    payload = signupSchema.parse({
      email: body.get("email"),
      password: body.get("password"),
      personalName: body.get("personalName"),
      businessName: body.get("businessName"),
      timezone: body.get("timezone"),
      defaultUnits: body.get("defaultUnits"),
      tier: body.get("tier"),
    });

    const logo = body.get("logo");
    if (logo instanceof File && logo.size > 0) {
      if (!acceptedImageMimeTypes.has(logo.type)) {
        return NextResponse.json(
          {
            error: "Validation failed",
            details: [{ path: "logo", message: "Logo must be a PNG, JPG, or SVG image." }],
          },
          { status: 400 },
        );
      }

      const maxSizeBytes = 5 * 1024 * 1024;
      if (logo.size > maxSizeBytes) {
        return NextResponse.json(
          {
            error: "Validation failed",
            details: [{ path: "logo", message: "Logo file must be smaller than 5MB." }],
          },
          { status: 400 },
        );
      }

      normalizedLogoUrl = await saveLogoFile(logo);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: extractValidationErrors(error),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Invalid request body. Expected multipart/form-data payload." },
      { status: 400 },
    );
  }

  try {
    const passwordHash = await hashPassword(payload.password);

    const { user, coach } = await db.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: payload.email,
          name: payload.personalName,
          role: "COACH",
          imageUrl: normalizedLogoUrl,
        },
      });

      const createdCoach = await tx.coach.create({
        data: {
          userId: createdUser.id,
          bio: JSON.stringify({
            businessName: payload.businessName,
            logoUrl: normalizedLogoUrl,
            timezone: payload.timezone,
            defaultUnits:
              payload.defaultUnits === "kg"
                ? "METRIC"
                : payload.defaultUnits === "lb"
                  ? "IMPERIAL"
                  : payload.defaultUnits,
            passwordHash,
          }),
          specialty: payload.tier,
        },
      });

      return { user: createdUser, coach: createdCoach };
    });

    const session = await createSession(user.id);
    const response = NextResponse.json(
      {
        coachId: coach.id,
        businessName: payload.businessName,
        tier: payload.tier,
        sessionToken: session.token,
      },
      { status: 201 },
    );

    setSessionCookie(response, session.token);

    response.headers.set("x-user-id", user.id);
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        {
          error: "Email already registered",
          field: "email",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error: "Unable to create coach account",
        message: "An unexpected error occurred while creating the account.",
      },
      { status: 500 },
    );
  }
}
