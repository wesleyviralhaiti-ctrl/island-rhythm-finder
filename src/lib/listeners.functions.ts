import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PLANS, isPremiumActive } from "./plans";

export const registerListener = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({ name: z.string().trim().min(1).max(60), email: z.string().trim().email().max(120) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("listeners")
      .insert({ name: data.name, email: data.email.toLowerCase() })
      .select("id, name, email")
      .single();
    if (error || !row) {
      console.error(error);
      throw new Error("Nou pa rive anrejistre ou. Eseye ankò.");
    }
    return row;
  });

export const getListenerStatus = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ listenerId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: l } = await supabaseAdmin
      .from("listeners")
      .select("id, plan, premium_until, is_lifetime")
      .eq("id", data.listenerId)
      .maybeSingle();
    if (!l) return { exists: false, premium: false, plan: null, premiumUntil: null, isLifetime: false, pending: null };
    const { data: pending } = await supabaseAdmin
      .from("payment_requests")
      .select("id, plan, created_at")
      .eq("listener_id", data.listenerId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return {
      exists: true,
      premium: isPremiumActive({ isLifetime: l.is_lifetime, premiumUntil: l.premium_until }),
      plan: l.plan,
      premiumUntil: l.premium_until,
      isLifetime: l.is_lifetime,
      pending: pending ? { plan: pending.plan, createdAt: pending.created_at } : null,
    };
  });

export const submitPayment = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        listenerId: z.string().uuid(),
        plan: z.enum(["monthly", "lifetime"]),
        region: z.enum(["ayiti", "lot_bo"]),
        phone: z.string().trim().min(6).max(25),
        reference: z.string().trim().min(3).max(60),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: l } = await supabaseAdmin.from("listeners").select("id").eq("id", data.listenerId).maybeSingle();
    if (!l) return { ok: false, error: "Kont ou pa jwenn. Rekòmanse aplikasyon an." };
    const { count } = await supabaseAdmin
      .from("payment_requests")
      .select("id", { count: "exact", head: true })
      .eq("listener_id", data.listenerId)
      .eq("status", "pending");
    if ((count ?? 0) > 0) return { ok: false, error: "Ou gen yon peman k ap tann verifikasyon deja." };
    const { error } = await supabaseAdmin.from("payment_requests").insert({
      listener_id: data.listenerId,
      plan: data.plan,
      amount: PLANS[data.plan].price,
      region: data.region,
      phone: data.phone,
      reference: data.reference,
    });
    if (error) {
      console.error(error);
      return { ok: false, error: "Nou pa rive voye peman an. Eseye ankò." };
    }
    return { ok: true, error: null };
  });
