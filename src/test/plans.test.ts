import { describe, expect, it } from "vitest";
import { PLANS, applyApprovedPlan, isPremiumActive } from "@/lib/plans";
import { isIndividualSong, parseIsoDuration } from "@/lib/song-filter";

const now = new Date("2026-11-17T00:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

describe("plans", () => {
  it("monthly costs $20 and lifetime costs $150", () => {
    expect(PLANS.monthly.price).toBe(20);
    expect(PLANS.lifetime.price).toBe(150);
  });

  it("approving monthly gives 30 days of premium", () => {
    const r = applyApprovedPlan("monthly", { isLifetime: false, premiumUntil: null }, now);
    expect(new Date(r.premiumUntil!).getTime() - now.getTime()).toBe(30 * DAY);
  });

  it("monthly renewal extends from the current end date", () => {
    const end = new Date(now.getTime() + 10 * DAY).toISOString();
    const r = applyApprovedPlan("monthly", { isLifetime: false, premiumUntil: end }, now);
    expect(new Date(r.premiumUntil!).getTime() - now.getTime()).toBe(40 * DAY);
  });

  it("lifetime never expires", () => {
    const r = applyApprovedPlan("lifetime", { isLifetime: false, premiumUntil: null }, now);
    expect(isPremiumActive(r, new Date("2099-01-01"))).toBe(true);
  });

  it("expired monthly is not premium", () => {
    expect(isPremiumActive({ isLifetime: false, premiumUntil: "2026-11-01T00:00:00Z" }, now)).toBe(false);
  });
});

describe("individual songs only", () => {
  it("rejects mixes and long videos", () => {
    expect(isIndividualSong("Konpa Mix 2026", 240)).toBe(false);
    expect(isIndividualSong("Kompa song", parseIsoDuration("PT1H2M"))).toBe(false);
  });
  it("rejects anything over 15 minutes and keeps a 14-minute track", () => {
    expect(isIndividualSong("Long track", 16 * 60)).toBe(false);
    expect(isIndividualSong("Long track", 14 * 60)).toBe(true);
  });
  it("keeps a normal single", () => {
    expect(isIndividualSong("Artist - Song (Official Audio)", parseIsoDuration("PT3M45S"))).toBe(true);
  });
});
