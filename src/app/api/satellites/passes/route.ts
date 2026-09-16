import { NextRequest, NextResponse } from "next/server";
import { getVisualPasses } from "@/lib/api/n2yo";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latStr = searchParams.get("lat");
    const lngStr = searchParams.get("lng");
    const altStr = searchParams.get("alt");
    const satIdStr = searchParams.get("satId");
    const daysStr = searchParams.get("days");

    const lat = latStr ? parseFloat(latStr) : 40.7128;
    const lng = lngStr ? parseFloat(lngStr) : -74.006;
    const alt = altStr ? parseFloat(altStr) : 0;
    const satId = satIdStr ? parseInt(satIdStr, 10) : undefined;
    const days = daysStr ? parseInt(daysStr, 10) : 5;

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "Invalid coordinates provided" },
        { status: 400 },
      );
    }

    const passes = await getVisualPasses({ lat, lng, alt, satId, days });
    return NextResponse.json({ passes });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve satellite pass predictions",
      },
      { status: 500 },
    );
  }
}
