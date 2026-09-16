import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { generateCosmicAdvice } from "@/lib/api/groq";
import { createServerSupabaseClient } from "@/lib/supabase";

const aiGuideRequestSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, "A question for Cosmic Guide is required.")
    .max(2000, "Questions must be 2,000 characters or fewer."),
  context: z
    .object({
      score: z.number().min(0).max(100).optional(),
      location: z.string().trim().min(1).max(100).optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerSupabaseClient(cookieStore);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { error: "The request body must contain valid JSON." },
        { status: 400 },
      );
    }

    const validation = aiGuideRequestSchema.safeParse(payload);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "AI Guide request validation failed.",
          issues: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const response = await generateCosmicAdvice(
      validation.data.prompt,
      validation.data.context,
    );

    return NextResponse.json({ response }, { status: 200 });
  } catch (error) {
    console.error("Unable to process Cosmic Guide request:", error);
    return NextResponse.json(
      { error: "Cosmic Guide could not process your request at this time." },
      { status: 500 },
    );
  }
}
