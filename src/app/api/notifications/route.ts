import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase";

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export interface NotificationSettings {
  user_id: string;
  discord_webhook: string | null;
  min_score_threshold: number;
  enabled: boolean;
  updated_at: string;
}

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication is required." },
        { status: 401 },
      );
    }

    const { data: settings, error } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    // If no row exists (edge case), return defaults
    const resolved: NotificationSettings = settings
      ? {
          user_id: settings.user_id,
          discord_webhook: settings.discord_webhook,
          min_score_threshold: settings.min_score_threshold,
          enabled: settings.enabled,
          updated_at: settings.updated_at,
        }
      : {
          user_id: user.id,
          discord_webhook: null,
          min_score_threshold: 80,
          enabled: true,
          updated_at: new Date().toISOString(),
        };

    return NextResponse.json({ settings: resolved });
  } catch (error) {
    console.error("Unable to retrieve notification settings:", error);
    return NextResponse.json(
      { error: "Unable to retrieve notification settings at this time." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication is required." },
        { status: 401 },
      );
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

    if (typeof payload !== "object" || payload === null) {
      return NextResponse.json(
        { error: "Invalid request payload." },
        { status: 400 },
      );
    }

    const body = payload as Record<string, unknown>;

    // Validate discord_webhook if provided
    if (body.discord_webhook !== undefined && body.discord_webhook !== null) {
      if (typeof body.discord_webhook !== "string") {
        return NextResponse.json(
          { error: "discord_webhook must be a string." },
          { status: 400 },
        );
      }
      if (
        body.discord_webhook.length > 0 &&
        !body.discord_webhook.startsWith("https://discord.com/api/webhooks/")
      ) {
        return NextResponse.json(
          {
            error:
              "discord_webhook must start with https://discord.com/api/webhooks/",
          },
          { status: 400 },
        );
      }
    }

    // Validate min_score_threshold if provided
    if (body.min_score_threshold !== undefined) {
      if (
        typeof body.min_score_threshold !== "number" ||
        !Number.isInteger(body.min_score_threshold) ||
        body.min_score_threshold < 0 ||
        body.min_score_threshold > 100
      ) {
        return NextResponse.json(
          {
            error:
              "min_score_threshold must be an integer between 0 and 100.",
          },
          { status: 400 },
        );
      }
    }

    // Validate enabled if provided
    if (body.enabled !== undefined && typeof body.enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled must be a boolean." },
        { status: 400 },
      );
    }

    // Build update payload with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.discord_webhook !== undefined) {
      updateData.discord_webhook =
        body.discord_webhook === "" ? null : body.discord_webhook;
    }
    if (body.min_score_threshold !== undefined) {
      updateData.min_score_threshold = body.min_score_threshold;
    }
    if (body.enabled !== undefined) {
      updateData.enabled = body.enabled;
    }

    // Upsert: insert if missing, update if exists
    const { data: updated, error: upsertError } = await supabase
      .from("notification_settings")
      .upsert(
        {
          user_id: user.id,
          ...updateData,
        },
        { onConflict: "user_id" },
      )
      .select()
      .single();

    if (upsertError) {
      throw upsertError;
    }

    return NextResponse.json({ settings: updated });
  } catch (error) {
    console.error("Unable to update notification settings:", error);
    return NextResponse.json(
      { error: "Unable to update notification settings at this time." },
      { status: 500 },
    );
  }
}
