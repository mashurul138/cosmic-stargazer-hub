import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase";
import { equipmentSchema } from "@/lib/validations/equipment";

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
    const { supabase, user, error: authError } = await getAuthenticatedSupabaseClient();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    const { data: equipment, error } = await supabase
      .from("equipment")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ equipment: equipment ?? [] });
  } catch (error) {
    console.error("Unable to retrieve equipment:", error);
    return NextResponse.json(
      { error: "Unable to retrieve equipment at this time." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, error: authError } = await getAuthenticatedSupabaseClient();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "The request body must contain valid JSON." }, { status: 400 });
    }

    const validation = equipmentSchema.safeParse(payload);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Equipment validation failed.", issues: validation.error.flatten() },
        { status: 400 },
      );
    }

    const { data: equipment, error } = await supabase
      .from("equipment")
      .insert({ ...validation.data, user_id: user.id })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ equipment }, { status: 201 });
  } catch (error) {
    console.error("Unable to create equipment:", error);
    return NextResponse.json(
      { error: "Unable to save the equipment at this time." },
      { status: 500 },
    );
  }
}
