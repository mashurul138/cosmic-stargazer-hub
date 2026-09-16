import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createServerSupabaseClient(cookieStore);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

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

    let deleteQuery = supabase.from("observations").delete().eq("id", id);

    if (profile?.role !== "astronomer") {
      deleteQuery = deleteQuery.eq("user_id", user.id);
    }

    const { data: deletedObservation, error: deleteError } = await deleteQuery
      .select("id")
      .maybeSingle();

    if (deleteError) {
      throw deleteError;
    }

    if (!deletedObservation) {
      return NextResponse.json(
        { error: "You do not have permission to delete this observation." },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { message: "Observation deleted successfully.", id: deletedObservation.id },
      { status: 200 },
    );
  } catch (error) {
    console.error("Unable to delete observation:", error);
    return NextResponse.json(
      { error: "Unable to delete the observation at this time." },
      { status: 500 },
    );
  }
}
