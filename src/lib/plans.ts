// Pricing and premium rules for WESLEY MUSIC DOWNLOAD (pure, shared by client and server).
export const NATCASH_NUMBER = "+509 56568810";

export type PlanId = "monthly" | "lifetime";

export const PLANS: Record<PlanId, { id: PlanId; label: string; price: number; days: number | null }> = {
  monthly: { id: "monthly", label: "Chak mwa", price: 20, days: 30 },
  lifetime: { id: "lifetime", label: "Pou tout lavi", price: 150, days: null },
};

export type PremiumState = { isLifetime: boolean; premiumUntil: string | null };

/** Returns the new premium state after a payment for `plan` is approved. */
export function applyApprovedPlan(plan: PlanId, current: PremiumState, now: Date = new Date()): PremiumState {
  if (plan === "lifetime" || current.isLifetime) {
    return { isLifetime: true, premiumUntil: current.premiumUntil };
  }
  const days = PLANS.monthly.days!;
  const currentEnd = current.premiumUntil ? new Date(current.premiumUntil) : null;
  const base = currentEnd && currentEnd > now ? currentEnd : now;
  const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  return { isLifetime: false, premiumUntil: next.toISOString() };
}

export function isPremiumActive(state: PremiumState, now: Date = new Date()): boolean {
  if (state.isLifetime) return true;
  if (!state.premiumUntil) return false;
  return new Date(state.premiumUntil) > now;
}
