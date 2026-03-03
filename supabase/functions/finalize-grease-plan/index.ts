// @ts-nocheck - Deno runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GC_ACCESS_TOKEN = Deno.env.get("GOCARDLESS_ACCESS_TOKEN") ?? "";
const GC_ENV = (Deno.env.get("GOCARDLESS_ENV") ?? "sandbox").toLowerCase();
const GC_BASE_URL =
  GC_ENV === "live" ? "https://api.gocardless.com" : "https://api-sandbox.gocardless.com";

const PLAN = {
  key: "grease_cleaning_monthly",
  name: "Grease Cleaning Service Plan",
  amount: 4900,
  currency: "GBP",
  interval_unit: "monthly",
  day_of_month: 1,
} as const;

async function gcRequest(path: string, init?: RequestInit) {
  if (!GC_ACCESS_TOKEN) throw new Error("GoCardless not configured (missing GOCARDLESS_ACCESS_TOKEN)");
  const res = await fetch(`${GC_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${GC_ACCESS_TOKEN}`,
      "GoCardless-Version": "2015-07-06",
      ...(init?.headers ?? {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      json?.error?.message ||
      json?.message ||
      `GoCardless request failed (${res.status})`;
    throw new Error(msg);
  }
  return json;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!serviceKey) {
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, authHeader.replace("Bearer ", ""), { auth: { persistSession: false } });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const billingRequestId = body?.billing_request_id || body?.brq;
    if (!billingRequestId || typeof billingRequestId !== "string") {
      return new Response(JSON.stringify({ error: "Missing billing_request_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const br = await gcRequest(`/billing_requests/${encodeURIComponent(billingRequestId)}`, { method: "GET" });
    let mandateId = br?.billing_requests?.mandate_request?.links?.mandate ?? null;
    let customerId = br?.billing_requests?.links?.customer ?? null;

    if (!mandateId) {
      const fulfil = await gcRequest(`/billing_requests/${encodeURIComponent(billingRequestId)}/actions/fulfil`, { method: "POST" });
      mandateId = fulfil?.billing_requests?.mandate_request?.links?.mandate ?? null;
      customerId = fulfil?.billing_requests?.links?.customer ?? customerId;
    }

    if (!mandateId) throw new Error("Mandate not available yet. Please try again in a moment.");

    const sub = await gcRequest("/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        subscriptions: {
          amount: PLAN.amount,
          currency: PLAN.currency,
          name: PLAN.name,
          interval_unit: PLAN.interval_unit,
          day_of_month: String(PLAN.day_of_month),
          metadata: { supabase_user_id: user.id, plan: PLAN.key },
          links: { mandate: mandateId },
        },
      }),
    });

    const subscriptionId = sub?.subscriptions?.id;
    const subscriptionStatus = sub?.subscriptions?.status ?? "active";
    if (!subscriptionId) throw new Error("Subscription was not created");

    await admin.from("service_plan_subscriptions").upsert({
      user_id: user.id,
      plan_key: PLAN.key,
      status: subscriptionStatus,
      billing_request_id: billingRequestId,
      gocardless_customer_id: customerId,
      gocardless_mandate_id: mandateId,
      gocardless_subscription_id: subscriptionId,
    });

    return new Response(JSON.stringify({ ok: true, subscription_id: subscriptionId, status: subscriptionStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

