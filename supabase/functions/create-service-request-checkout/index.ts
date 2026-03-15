// @ts-nocheck - Deno runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000";
const GC_ACCESS_TOKEN = Deno.env.get("GOCARDLESS_ACCESS_TOKEN") ?? "";
const GC_ENV = (Deno.env.get("GOCARDLESS_ENV") ?? "sandbox").toLowerCase();
const GC_BASE_URL =
  GC_ENV === "live" ? "https://api.gocardless.com" : "https://api-sandbox.gocardless.com";
const FALLBACK_AMOUNT_PENCE = parseInt(Deno.env.get("INITIAL_SERVICE_FEE_PENCE") ?? "15000", 10) || 15000;

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

    const serviceRequestId = body?.service_request_id;
    if (!serviceRequestId || typeof serviceRequestId !== "string") {
      return new Response(JSON.stringify({ error: "Missing service_request_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: sr, error: srError } = await admin
      .from("service_requests")
      .select("id, user_id, status, approved_amount_pence, paid_at, payment_type, dd_amount_pence, dd_day_of_month")
      .eq("id", serviceRequestId)
      .maybeSingle();

    if (srError || !sr) {
      return new Response(JSON.stringify({ error: "Service request not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (sr.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Service request does not belong to you" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (sr.status !== "approved") {
      return new Response(JSON.stringify({ error: "Service request must be approved before payment" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (sr.paid_at) {
      return new Response(JSON.stringify({ error: "This service request has already been paid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pt = (sr.payment_type ?? "one_off") as "one_off" | "dd_only" | "both";
    const hasOneOff = pt === "one_off" || pt === "both";
    const hasDd = pt === "dd_only" || pt === "both";

    const amountPence = hasOneOff
      ? ((sr.approved_amount_pence != null && sr.approved_amount_pence >= 100)
          ? sr.approved_amount_pence
          : FALLBACK_AMOUNT_PENCE)
      : 0;

    const brBody: Record<string, unknown> = {
      mandate_request: {
        scheme: "bacs",
        currency: "GBP",
        description: "Bengal Welding service requests",
        metadata: { supabase_user_id: user.id, service_request_id: serviceRequestId },
      },
      metadata: {
        service_request_id: serviceRequestId,
        type: "service_request",
        data: JSON.stringify({
          payment_type: pt,
          dd_amount_pence: hasDd ? (sr.dd_amount_pence ?? 0) : null,
          dd_day_of_month: hasDd ? (sr.dd_day_of_month ?? 15) : null,
        }),
      },
    };

    if (hasOneOff && amountPence >= 100) {
      brBody.payment_request = {
        amount: amountPence,
        currency: "GBP",
        description: "Service request payment",
      };
    }

    const billingReq = await gcRequest("/billing_requests", {
      method: "POST",
      body: JSON.stringify({ billing_requests: brBody }),
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

    return new Response(
      JSON.stringify({
        url,
        billing_request_id: billingRequestId,
        amount_pence: amountPence,
        payment_type: pt,
        has_one_off: hasOneOff,
        has_dd: hasDd,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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
