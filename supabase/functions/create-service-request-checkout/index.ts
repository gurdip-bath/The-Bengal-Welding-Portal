// @ts-nocheck - Deno runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000";
const GC_ACCESS_TOKEN = Deno.env.get("GOCARDLESS_ACCESS_TOKEN") ?? "";
const GC_ENV = (Deno.env.get("GOCARDLESS_ENV") ?? "sandbox").toLowerCase();
const GC_BASE_URL =
  GC_ENV === "live" ? "https://api.gocardless.com" : "https://api-sandbox.gocardless.com";
const INITIAL_SERVICE_FEE_PENCE = parseInt(Deno.env.get("INITIAL_SERVICE_FEE_PENCE") ?? "15000", 10) || 15000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
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
      (typeof json?.error === "string" ? json.error : null) ||
      (Array.isArray(json?.error) ? json.error.map((e) => e?.message ?? e).join(", ") : null) ||
      `GoCardless request failed (${res.status})`;
    const err = new Error(msg);
    (err as Record<string, unknown>).gocardlessRaw = json;
    (err as Record<string, unknown>).gocardlessErrors = json?.error?.errors ?? json?.errors;
    throw err;
  }
  return json;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const token = body?.access_token ?? req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) {
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

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: { user }, error: userError } = await admin.auth.getUser(token.trim());
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing } = await admin.from("service_request_payments").select("status").eq("user_id", user.id).maybeSingle();
    if (existing?.status === "paid") {
      return new Response(JSON.stringify({ error: "You have already completed payment setup" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const billingReq = await gcRequest("/billing_requests", {
      method: "POST",
      body: JSON.stringify({
        billing_requests: {
          mandate_request: {
            scheme: "bacs",
            currency: "GBP",
            description: "Bengal Welding service requests",
            metadata: { supabase_user_id: user.id },
          },
          payment_request: {
            amount: INITIAL_SERVICE_FEE_PENCE,
            currency: "GBP",
            description: "Initial service fee",
          },
          metadata: { supabase_user_id: user.id, type: "service_request" },
        },
      }),
    });

    const billingRequestId = billingReq?.billing_requests?.id;
    if (!billingRequestId) throw new Error("GoCardless billing request did not return an id");

    const flow = await gcRequest("/billing_request_flows", {
      method: "POST",
      body: JSON.stringify({
        billing_request_flows: {
          redirect_uri: `${SITE_URL}/#/gocardless/service-request/callback?brq=${encodeURIComponent(billingRequestId)}`,
          exit_uri: `${SITE_URL}/#/dashboard`,
          prefilled_customer: { email: user.email ?? undefined },
          links: { billing_request: billingRequestId },
        },
      }),
    });

    const url = flow?.billing_request_flows?.authorisation_url;
    if (!url) throw new Error("GoCardless did not return an authorisation_url");

    try {
      await admin.from("service_request_payments").upsert({
        user_id: user.id,
        billing_request_id: billingRequestId,
        status: "pending_setup",
      });
    } catch {
      // ignore
    }

    return new Response(JSON.stringify({ url, billing_request_id: billingRequestId, amount_pence: INITIAL_SERVICE_FEE_PENCE }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const e = err as Record<string, unknown>;
    const extra: Record<string, unknown> = {};
    if (e.gocardlessErrors) extra.gocardless_errors = e.gocardlessErrors;
    if (e.gocardlessRaw) extra.gocardless_raw = e.gocardlessRaw;
    return new Response(
      JSON.stringify({ error: (err as Error).message, ...extra }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
