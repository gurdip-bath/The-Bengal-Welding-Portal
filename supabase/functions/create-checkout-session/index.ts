// @ts-nocheck - Deno runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000";
const GC_ACCESS_TOKEN = Deno.env.get("GOCARDLESS_ACCESS_TOKEN") ?? "";
const GC_ENV = (Deno.env.get("GOCARDLESS_ENV") ?? "sandbox").toLowerCase();
const GC_BASE_URL =
  GC_ENV === "live" ? "https://api.gocardless.com" : "https://api-sandbox.gocardless.com";

const PLAN = {
  name: "Grease Cleaning Service Plan",
  amount: 4900,
  currency: "GBP",
  scheme: "bacs",
} as const;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      (Array.isArray(json?.error) ? json.error.map((e) => e.message).join(", ") : null) ||
      `GoCardless request failed (${res.status})`;
    throw new Error(msg);
  }
  return json;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

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

    const billingReq = await gcRequest("/billing_requests", {
      method: "POST",
      body: JSON.stringify({
        billing_requests: {
          mandate_request: {
            scheme: PLAN.scheme,
            currency: PLAN.currency,
            description: PLAN.name,
            metadata: { supabase_user_id: user.id },
          },
          metadata: { supabase_user_id: user.id, plan: "grease_cleaning_monthly" },
        },
      }),
    });

    const billingRequestId = billingReq?.billing_requests?.id;
    if (!billingRequestId) throw new Error("GoCardless billing request did not return an id");

    const flow = await gcRequest("/billing_request_flows", {
      method: "POST",
      body: JSON.stringify({
        billing_request_flows: {
          redirect_uri: `${SITE_URL}/#/gocardless/callback?brq=${encodeURIComponent(billingRequestId)}`,
          exit_uri: `${SITE_URL}/#/products`,
          prefilled_customer: { email: user.email ?? undefined },
          links: { billing_request: billingRequestId },
        },
      }),
    });

    const url = flow?.billing_request_flows?.authorisation_url;
    if (!url) throw new Error("GoCardless did not return an authorisation_url");

    // Best-effort persistence for later reconciliation/webhooks.
    try {
      const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      await admin.from("service_plan_subscriptions").upsert({
        user_id: user.id,
        plan_key: "grease_cleaning_monthly",
        billing_request_id: billingRequestId,
        status: "pending_setup",
      });
    } catch {
      // ignore
    }

    return new Response(JSON.stringify({ url, billing_request_id: billingRequestId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
