import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase";

const equipmentIdSchema = z.string().uuid("Equipment ID must be a valid UUID.");

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const parsedId = equipmentIdSchema.safeParse(id);

    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid equipment ID." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerSupabaseClient(cookieStore);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    const { data: deletedEquipment, error } = await supabase
      .from("equipment")
      .delete()
      .eq("id", parsedId.data)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!deletedEquipment) {
      return NextResponse.json({ error: "Equipment was not found." }, { status: 404 });
    }

    return NextResponse.json({ message: "Equipment deleted successfully.", id: deletedEquipment.id });
  } catch (error) {
    console.error("Unable to delete equipment:", error);
    return NextResponse.json(
      { error: "Unable to delete the equipment at this time." },
      { status: 500 },
    );
  }
}
