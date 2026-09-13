'use server';

import { safeAuth } from '@/auth';
import { AutoBuyDomainService, type CreateAutoBuyInput } from '@/domains/autobuy/AutoBuyDomainService';
import { revalidatePath } from 'next/cache';

async function resolveUserId(): Promise<string | null> {
  // Fail closed: never act on behalf of a user without their session — a silent
  // demo/first-user fallback would create real rules under a fake identity.
  const session = await safeAuth();
  return session?.user?.id ?? null;
}

export async function createAutoBuyRuleAction(input: CreateAutoBuyInput) {
  try {
    const userId = await resolveUserId();
    if (!userId) {
      return { success: false, error: 'برای ثبت خرید خودکار لطفاً ابتدا وارد حساب کاربری خود شوید.' };
    }

    const rule = await AutoBuyDomainService.createRule(userId, input);
    revalidatePath('/[locale]/account/auto-buy', 'page');
    revalidatePath('/[locale]/account', 'page');

    return { success: true, rule };
  } catch (error: unknown) {
    console.error('Error creating auto-buy rule:', error);
    return { success: false, error: error instanceof Error ? error.message : 'خطا در ثبت سفارش خرید خودکار' };
  }
}

export async function cancelAutoBuyRuleAction(ruleId: string) {
  try {
    const userId = await resolveUserId();
    if (!userId) {
      return { success: false, error: 'دسترسی غیرمجاز' };
    }

    const updated = await AutoBuyDomainService.cancelRule(userId, ruleId);
    revalidatePath('/[locale]/account/auto-buy', 'page');

    return { success: true, rule: updated };
  } catch (error: unknown) {
    console.error('Error cancelling auto-buy rule:', error);
    return { success: false, error: error instanceof Error ? error.message : 'خطا در لغو سفارش خرید خودکار' };
  }
}

export async function getUserAutoBuyRulesAction() {
  try {
    const userId = await resolveUserId();
    if (!userId) {
      return { success: false, rules: [] };
    }

    const rules = await AutoBuyDomainService.getUserRules(userId);
    return { success: true, rules };
  } catch (error: unknown) {
    console.error('Error fetching auto-buy rules:', error);
    return { success: false, error: error instanceof Error ? error.message : 'خطا در دریافت لیست سفارش‌ها', rules: [] };
  }
}

export async function testExecuteAutoBuyRuleAction(ruleId: string) {
  try {
    const result = await AutoBuyDomainService.evaluateRule(ruleId);
    revalidatePath('/[locale]/account/auto-buy', 'page');
    revalidatePath('/[locale]/my-trips', 'page');

    return { success: true, result };
  } catch (error: unknown) {
    console.error('Error testing auto-buy rule execution:', error);
    return { success: false, error: error instanceof Error ? error.message : 'خطا در اجرای آزمایشی سفارش' };
  }
}
