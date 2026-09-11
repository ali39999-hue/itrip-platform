import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { LoyaltyStreakService } from "@/domains/loyalty/LoyaltyStreakService";

export async function POST(request: Request) {
  try {
    const session = await auth();
    let bodyUserId: string | undefined;
    try {
      const body = await request.json();
      bodyUserId = body?.userId;
    } catch {
      // Empty body is acceptable if session exists
    }

    const userId = session?.user?.id || bodyUserId;
    if (!userId || userId === "guest") {
      return NextResponse.json(
        {
          success: false,
          errorCode: "USER_REQUIRED",
          message: "برای دریافت پاداش وفاداری روزانه، لطفاً ابتدا وارد حساب کاربری خود شوید.",
        },
        { status: 401 }
      );
    }

    const result = await LoyaltyStreakService.claimDailyReward(userId);
    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
