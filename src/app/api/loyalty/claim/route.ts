import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { LoyaltyStreakService } from "@/domains/loyalty/LoyaltyStreakService";

export async function POST() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
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
