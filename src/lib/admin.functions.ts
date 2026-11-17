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
