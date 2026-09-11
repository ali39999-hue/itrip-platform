import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { LoyaltyStreakService } from "@/domains/loyalty/LoyaltyStreakService";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const url = new URL(request.url);
    const fallbackUserId = url.searchParams.get("userId") || undefined;
    const userId = session?.user?.id || fallbackUserId || "guest";

    const status = LoyaltyStreakService.getStreakStatus(userId);
    return NextResponse.json(status);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
