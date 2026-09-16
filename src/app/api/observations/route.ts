import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase";
import { observationSchema } from "@/lib/validations/observation";

async function getAuthenticatedSupabaseClient() {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { supabase, user, error };
}

export async function GET() {
  try {
    const { supabase, user, error: authError } =
      await getAuthenticatedSupabaseClient();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    let query = supabase
      .from("observations")
      .select("*")
      .order("created_at", { ascending: false });

    if (profile?.role !== "astronomer") {
      query = query.eq("user_id", user.id);
    }

    const { data: observations, error: observationsError } = await query;

    if (observationsError) {
      throw observationsError;
    }

    return NextResponse.json(
      {
        observations: observations ?? [],
        isAstronomerView: profile?.role === "astronomer",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Unable to retrieve observations:", error);
    return NextResponse.json(
      { error: "Unable to retrieve observations at this time." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, error: authError } =
      await getAuthenticatedSupabaseClient();

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

    const validation = observationSchema.safeParse(payload);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Observation validation failed.",
          issues: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { data: observation, error: insertError } = await supabase
      .from("observations")
      .insert({
        ...validation.data,
        user_id: user.id,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ observation }, { status: 201 });
  } catch (error) {
    console.error("Unable to create observation:", error);
    return NextResponse.json(
      { error: "Unable to create the observation at this time." },
      { status: 500 },
    );
  }
}
