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
    const body = await req.json().catch(() => ({}));
    const token = (body?.access_token ?? req.headers.get("Authorization")?.replace(/^Bearer\s+/i, ""))?.trim();
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
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const billingRequestId = body?.billing_request_id || body?.brq;
    if (!billingRequestId || typeof billingRequestId !== "string") {
      return new Response(JSON.stringify({ error: "Missing billing_request_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let br = await gcRequest(`/billing_requests/${encodeURIComponent(billingRequestId)}`, { method: "GET" });
    let mandateId = br?.billing_requests?.mandate_request?.links?.mandate ?? null;
    let customerId = br?.billing_requests?.links?.customer ?? null;
    let paymentId = br?.billing_requests?.payment_request?.links?.payment ?? null;
    let amountPence = br?.billing_requests?.payment_request?.amount ?? null;

    if (!mandateId) {
      const fulfil = await gcRequest(`/billing_requests/${encodeURIComponent(billingRequestId)}/actions/fulfil`, { method: "POST" });
      const fulfilled = fulfil?.billing_requests ?? br?.billing_requests;
      mandateId = fulfilled?.mandate_request?.links?.mandate ?? mandateId;
      customerId = fulfilled?.links?.customer ?? customerId;
      paymentId = fulfilled?.payment_request?.links?.payment ?? paymentId;
      amountPence = fulfilled?.payment_request?.amount ?? amountPence;
    }

    if (!mandateId) throw new Error("Mandate not available yet. Please try again in a moment.");

    await admin.from("service_request_payments").upsert({
      user_id: user.id,
      gocardless_customer_id: customerId,
      gocardless_mandate_id: mandateId,
      first_payment_id: paymentId,
      amount_paid_pence: amountPence,
      paid_at: paymentId ? new Date().toISOString() : null,
      billing_request_id: billingRequestId,
      status: "paid",
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
