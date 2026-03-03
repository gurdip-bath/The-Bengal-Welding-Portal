// @ts-nocheck - Deno runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function verifySignature(secret: string, payload: string, signature: string): Promise<boolean> {
  if (!secret || !signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const calculated = toHex(mac);
  return timingSafeEqual(calculated, signature);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  const secret = Deno.env.get("GOCARDLESS_WEBHOOK_SECRET") ?? "";
  const signature = req.headers.get("Webhook-Signature") ?? "";
  const bodyText = await req.text();

  const okSig = await verifySignature(secret, bodyText, signature);
  if (!okSig) {
    return new Response("Invalid Token", { status: 498, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceKey) return new Response("Server misconfiguration", { status: 500, headers: corsHeaders });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  let payload: any = null;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return new Response("Bad Request", { status: 400, headers: corsHeaders });
  }

  const events = Array.isArray(payload?.events) ? payload.events : [];
  for (const ev of events) {
    try {
      const resourceType = ev?.resource_type;
      const action = ev?.action;

      if (resourceType === "subscriptions") {
        const subId = ev?.links?.subscription;
        if (!subId) continue;

        // Map GoCardless subscription events to a simple status.
        const status =
          action === "cancelled" ? "cancelled" :
          action === "paused" ? "paused" :
          action === "resumed" ? "active" :
          action === "created" ? "active" :
          action === "customer_approval_granted" ? "active" :
          action === "customer_approval_denied" ? "inactive" :
          undefined;

        if (!status) continue;
        await admin
          .from("service_plan_subscriptions")
          .update({ status })
          .eq("gocardless_subscription_id", subId);
      }

      if (resourceType === "mandates") {
        const mandateId = ev?.links?.mandate;
        if (!mandateId) continue;
        if (action === "cancelled" || action === "failed") {
          await admin
            .from("service_plan_subscriptions")
            .update({ status: "mandate_cancelled" })
            .eq("gocardless_mandate_id", mandateId);
        }
      }

      if (resourceType === "payments") {
        // For visibility; a failed payment usually means follow-up is needed.
        const paymentId = ev?.links?.payment;
        if (!paymentId) continue;
        if (action === "failed" || action === "cancelled" || action === "charged_back") {
          // We don't have payment->subscription mapping stored; mark all active plans as "payment_issue"
          // only when the failure cause indicates mandate/subscription issues would be too aggressive.
          // So we leave this as a no-op for now.
        }
      }
    } catch {
      // Ignore individual event failures so we can ack the batch.
    }
  }

  return new Response(null, { status: 204, headers: corsHeaders });
});

