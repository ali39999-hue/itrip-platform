import { auth } from "@/auth";
import { LoyaltyStreakService } from "@/domains/loyalty/LoyaltyStreakService";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id || "guest";

    const status = LoyaltyStreakService.getStreakStatus(userId);
    return apiSuccess(status);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return apiError(message, 500);
  }
}
