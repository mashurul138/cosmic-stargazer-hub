import { NextRequest, NextResponse } from "next/server";
import {
  evaluateWithGroq,
  extractSharpMetrics,
  validateImageFile,
} from "@/lib/utils/assess-photo";

export const maxDuration = 30; // Allow sufficient duration for image processing and AI completion

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("photo") as File | null;
    const targetType = (formData.get("targetType") as string) || "Deep Sky Object";

    if (!file) {
      return NextResponse.json(
        { error: "No photo was uploaded. Please select an image file." },
        { status: 400 },
      );
    }

    // 1. Validate payload size and MIME type
    const validation = validateImageFile(file.size, file.type);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // 2. Decode image buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Extract optical and luminance metrics using Sharp
    let stats;
    try {
      stats = await extractSharpMetrics(buffer);
    } catch (sharpError) {
      return NextResponse.json(
        {
          error:
            sharpError instanceof Error
              ? `Corrupt or unprocessable image file: ${sharpError.message}`
              : "Unable to decode image file.",
        },
        { status: 400 },
      );
    }

    // 4. Perform AI quality assessment
    const report = await evaluateWithGroq(stats, targetType);

    return NextResponse.json({
      success: true,
      stats,
      report,
    });
  } catch (error) {
    console.error("Astrophotography photo assessment failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred during photo assessment.",
      },
      { status: 500 },
    );
  }
}
