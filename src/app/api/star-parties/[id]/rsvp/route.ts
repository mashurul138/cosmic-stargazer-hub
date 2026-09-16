import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase";

const partyIdSchema = z.string().uuid("Party ID must be a valid UUID.");

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const parsedId = partyIdSchema.safeParse(id);

    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid star party ID." }, { status: 400 });
    }

    const partyId = parsedId.data;
    const cookieStore = await cookies();
    const supabase = createServerSupabaseClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication is required to RSVP." }, { status: 401 });
    }

    // 1. Fetch Star Party capacity limit
    const { data: party, error: partyError } = await supabase
      .from("star_parties")
      .select("id, max_attendees")
      .eq("id", partyId)
      .maybeSingle();

    if (partyError) {
      throw partyError;
    }

    if (!party) {
      return NextResponse.json({ error: "Star party was not found." }, { status: 404 });
    }

    // 2. Check current attendee status for this user
    const { data: existingAttendee, error: attendeeError } = await supabase
      .from("party_attendees")
      .select("id")
      .eq("party_id", partyId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (attendeeError) {
      throw attendeeError;
    }

    if (existingAttendee) {
      // User is already attending -> Cancel RSVP (Leave)
      const { error: deleteError } = await supabase
        .from("party_attendees")
        .delete()
        .eq("party_id", partyId)
        .eq("user_id", user.id);

      if (deleteError) {
        throw deleteError;
      }

      // Get updated count
      const { count } = await supabase
        .from("party_attendees")
        .select("*", { count: "exact", head: true })
        .eq("party_id", partyId);

      return NextResponse.json({
        is_attending: false,
        attendee_count: count ?? 0,
        message: "RSVP cancelled successfully.",
      });
    }

    // User is NOT attending -> Join Party
    // First, verify capacity
    const { count: currentCount, error: countError } = await supabase
      .from("party_attendees")
      .select("*", { count: "exact", head: true })
      .eq("party_id", partyId);

    if (countError) {
      throw countError;
    }

    const attendeeCount = currentCount ?? 0;
    if (attendeeCount >= party.max_attendees) {
      return NextResponse.json(
        { error: "This star party has reached maximum capacity." },
        { status: 400 },
      );
    }

    // Insert RSVP attendee record
    const { error: insertError } = await supabase.from("party_attendees").insert({
      party_id: partyId,
      user_id: user.id,
    });

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      is_attending: true,
      attendee_count: attendeeCount + 1,
      message: "RSVP confirmed! You are attending this star party.",
    });
  } catch (error) {
    console.error("Unable to update RSVP status:", error);
    return NextResponse.json(
      { error: "Unable to update RSVP status at this time." },
      { status: 500 },
    );
  }
}
