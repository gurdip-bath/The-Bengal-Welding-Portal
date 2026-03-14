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

    const metadata = br?.billing_requests?.metadata ?? {};
    const serviceRequestId = metadata.service_request_id ?? null;
    const paymentType = (metadata.payment_type ?? "one_off") as string;
    const ddAmountPence = metadata.dd_amount_pence ?? null;
    const ddDayOfMonth = metadata.dd_day_of_month ?? 15;

    if (serviceRequestId) {
      const { data: sr, error: srErr } = await admin
        .from("service_requests")
        .select("*")
        .eq("id", serviceRequestId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!srErr && sr && sr.status === "approved" && !sr.paid_at) {
        const hasOneOff = paymentType === "one_off" || paymentType === "both";
        const hasDd = paymentType === "dd_only" || paymentType === "both";
        const effectiveAmountPence = hasOneOff ? (amountPence ?? 0) : (ddAmountPence ?? 0);

        if (hasDd && ddAmountPence && ddAmountPence >= 100 && mandateId) {
          const day = Math.min(Number(ddDayOfMonth) || 15, 28);
          const in14 = new Date();
          in14.setDate(in14.getDate() + 14);
          const y = in14.getFullYear();
          const m = in14.getMonth();
          let startDate = new Date(y, m, Math.min(day, new Date(y, m + 1, 0).getDate()));
          if (startDate < in14) {
            startDate = new Date(y, m + 1, Math.min(day, new Date(y, m + 2, 0).getDate()));
          }
          const startDateStr = startDate.toISOString().slice(0, 10);

          try {
            const subRes = await gcRequest("/subscriptions", {
              method: "POST",
              headers: { "Idempotency-Key": `sr-${serviceRequestId}-${Date.now()}` },
              body: JSON.stringify({
                subscriptions: {
                  amount: ddAmountPence,
                  currency: "GBP",
                  interval_unit: "monthly",
                  day_of_month: day,
                  start_date: startDateStr,
                  name: "Bengal Welding service",
                  metadata: { service_request_id: serviceRequestId },
                  links: { mandate: mandateId },
                },
              }),
            });
            const subId = subRes?.subscriptions?.id;
            if (subId) {
              await admin
                .from("service_requests")
                .update({ gocardless_subscription_id: subId })
                .eq("id", serviceRequestId);
            }
          } catch (subErr) {
            console.error("Subscription create failed:", subErr);
          }
        }

        const jobId = `J-${Math.floor(Math.random() * 90000) + 10000}`;
        const siteName = sr.business_name || sr.full_name;
        await admin.from("jobs").insert({
          id: jobId,
          title: `Service Request — ${siteName}`,
          description: sr.notes || "Service request approved",
          customer_id: sr.user_id,
          customer_name: sr.full_name,
          customer_email: sr.contact_email,
          customer_phone: null,
          customer_address: sr.business_address,
          customer_postcode: sr.postcode,
          contact_name: sr.contact_name,
          frequency: null,
          status: "PENDING",
          start_date: sr.requested_date,
          warranty_end_date: sr.requested_date,
          payment_status: "PAID",
          amount: effectiveAmountPence / 100,
          start_time: null,
          duration: null,
          job_type: null,
          lead_operative: null,
          service_request_id: sr.id,
          access_difficulty: sr.access_difficulty ?? null,
          appliance_location: sr.appliance_location ?? null,
          access_instructions: sr.access_instructions ?? null,
          equipment_required: sr.equipment_required ?? null,
          ppe_required: sr.ppe_required ?? null,
        });
        await admin
          .from("service_requests")
          .update({ paid_at: new Date().toISOString() })
          .eq("id", serviceRequestId);
      }
    }

    await admin.from("service_request_payments").upsert({
      user_id: user.id,
      gocardless_customer_id: customerId,
      gocardless_mandate_id: mandateId,
      first_payment_id: paymentId,
      amount_paid_pence: amountPence ?? 0,
      paid_at: new Date().toISOString(),
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
