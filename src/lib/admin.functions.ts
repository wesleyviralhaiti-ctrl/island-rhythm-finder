import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { applyApprovedPlan, type PlanId } from "./plans";

function checkPasscode(passcode: string) {
  const expected = process.env["ADMIN_PASSCODE"];
  if (!expected || passcode !== expected) throw new Error("Kòd admin lan pa bon.");
}

const withPass = z.object({ passcode: z.string().min(1).max(100) });

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d) => withPass.parse(d))
  .handler(async ({ data }) => {
    const expected = process.env["ADMIN_PASSCODE"];
    return { ok: !!expected && data.passcode === expected };
  });

export const adminDashboard = createServerFn({ method: "POST" })
  .inputValidator((d) => withPass.parse(d))
  .handler(async ({ data }) => {
    checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: payments }, { data: listeners }] = await Promise.all([
      supabaseAdmin
        .from("payment_requests")
        .select("id, plan, amount, region, phone, reference, status, created_at, reviewed_at, listener:listeners(name, email)")
        .order("created_at", { ascending: false })
        .limit(300),
      supabaseAdmin
        .from("listeners")
        .select("id, name, email, plan, premium_until, is_lifetime, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);
    return { payments: payments ?? [], listeners: listeners ?? [] };
  });

export const adminReviewPayment = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    withPass.extend({ paymentId: z.string().uuid(), decision: z.enum(["approved", "rejected"]) }).parse(d),
  )
  .handler(async ({ data }) => {
    checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin
      .from("payment_requests")
      .select("id, listener_id, plan, status")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (!p) throw new Error("Peman an pa jwenn.");
    if (p.status !== "pending") return { ok: true };

    if (data.decision === "approved") {
      const { data: l } = await supabaseAdmin
        .from("listeners")
        .select("premium_until, is_lifetime")
        .eq("id", p.listener_id)
        .single();
      const next = applyApprovedPlan(p.plan as PlanId, {
        isLifetime: l?.is_lifetime ?? false,
        premiumUntil: l?.premium_until ?? null,
      });
      await supabaseAdmin
        .from("listeners")
        .update({ plan: p.plan, is_lifetime: next.isLifetime, premium_until: next.premiumUntil })
        .eq("id", p.listener_id);
    }
    await supabaseAdmin
      .from("payment_requests")
      .update({ status: data.decision, reviewed_at: new Date().toISOString() })
      .eq("id", p.id);
    return { ok: true };
  });

function maskKey(k: string) {
  return k.length > 12 ? `${k.slice(0, 6)}••••••${k.slice(-4)}` : "••••••";
}

export const adminGetRapidKey = createServerFn({ method: "POST" })
  .inputValidator((d) => withPass.parse(d))
  .handler(async ({ data }) => {
    checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: s } = await supabaseAdmin
      .from("app_settings")
      .select("value, updated_at")
      .eq("key", "rapidapi_key")
      .maybeSingle();
    const fallback = process.env["RAPIDAPI_KEY"] ?? "";
    const active = s?.value || fallback;
    return { masked: active ? maskKey(active) : null, isCustom: !!s?.value, updatedAt: s?.updated_at ?? null };
  });

export const adminSaveRapidKey = createServerFn({ method: "POST" })
  .inputValidator((d) => withPass.extend({ key: z.string().trim().max(200) }).parse(d))
  .handler(async ({ data }) => {
    checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!data.key) {
      await supabaseAdmin.from("app_settings").delete().eq("key", "rapidapi_key");
      return { ok: true, reset: true };
    }
    if (!/^[A-Za-z0-9]{20,100}$/.test(data.key)) throw new Error("Kle a pa sanble ak yon kle RapidAPI.");
    await supabaseAdmin
      .from("app_settings")
      .upsert({ key: "rapidapi_key", value: data.key, updated_at: new Date().toISOString() });
    return { ok: true, reset: false };
  });
