import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase";
import { starPartySchema } from "@/lib/validations/star-party";
import type { StarPartyWithDetails } from "@/types/database";

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    // Fetch all star parties ordered chronologically
    const { data: parties, error } = await supabase
      .from("star_parties")
      .select(`
        *,
        host:profiles!host_id(email, role),
        attendees:party_attendees(user_id)
      `)
      .order("event_date", { ascending: true });

    if (error) {
      throw error;
    }

    type RawParty = (typeof parties)[number];

    const formattedParties: StarPartyWithDetails[] = (parties || []).map((party: RawParty) => {
      const attendeesList = Array.isArray(party.attendees) ? party.attendees : [];
      const isAttending = user ? attendeesList.some((a: { user_id: string }) => a.user_id === user.id) : false;

      return {
        id: party.id,
        host_id: party.host_id,
        title: party.title,
        description: party.description,
        location_name: party.location_name,
        latitude: Number(party.latitude),
        longitude: Number(party.longitude),
        event_date: party.event_date,
        max_attendees: party.max_attendees,
        created_at: party.created_at,
        host: party.host as { email: string; role: "stargazer" | "astronomer" } | null,
        attendee_count: attendeesList.length,
        is_attending: isAttending,
      };
    });

    return NextResponse.json({ starParties: formattedParties });
  } catch (error) {
    console.error("Unable to retrieve star parties:", error);
    return NextResponse.json(
      { error: "Unable to retrieve star parties at this time." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "The request body must contain valid JSON." }, { status: 400 });
    }

    const validation = starPartySchema.safeParse(payload);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed.", issues: validation.error.flatten() },
        { status: 400 },
      );
    }

    const partyData = validation.data;

    // 1. Insert Star Party with host_id = user.id
    const { data: newParty, error: insertError } = await supabase
      .from("star_parties")
      .insert({
        host_id: user.id,
        title: partyData.title,
        description: partyData.description,
        location_name: partyData.location_name,
        latitude: partyData.latitude,
        longitude: partyData.longitude,
        event_date: partyData.event_date,
        max_attendees: partyData.max_attendees,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // 2. Automatically add host as an attendee
    await supabase.from("party_attendees").insert({
      party_id: newParty.id,
      user_id: user.id,
    });

    return NextResponse.json({ starParty: newParty }, { status: 201 });
  } catch (error) {
    console.error("Unable to create star party:", error);
    return NextResponse.json(
      { error: "Unable to create star party at this time." },
      { status: 500 },
    );
  }
}
