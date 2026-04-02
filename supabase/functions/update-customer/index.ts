// @ts-nocheck - Deno runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Unauthorized" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseServiceKey) return json(500, { error: "Server misconfiguration" });

    // Header value can be `Bearer <jwt>` with varying casing/spacing.
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json(401, { error: "Unauthorized" });
    const admin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) return json(401, { error: "Invalid token" });

    // Check admin: user_metadata.role or profiles.role (ADMIN or ENGINEER have admin access)
    let isAdmin = user.user_metadata?.role === "ADMIN" || user.user_metadata?.role === "ENGINEER";
    if (!isAdmin) {
      const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
      const pr = (profile?.role as string)?.toLowerCase();
      isAdmin = pr === "admin" || pr === "engineer";
    }
    if (!isAdmin) return json(403, { error: "Admin only" });

    const body = await req.json().catch(() => ({}));
    const userId = String(body.userId ?? body.user_id ?? "").trim();
    if (!userId) return json(400, { error: "Missing userId" });

    const name = String(body.name ?? "").trim();
    const emailRaw = String(body.email ?? "").trim();
    const emailProvided = emailRaw.length > 0;
    const phone = String(body.phone ?? "").trim();
    const address = String(body.address ?? "").trim();
    const companyName = String(body.company_name ?? body.companyName ?? "").trim();
    const vatNumber = String(body.vat_number ?? body.vatNumber ?? "").trim();
    const rawAccountType = String(body.account_type ?? body.accountType ?? "").trim().toLowerCase();
    const accountType = rawAccountType === "credit" || rawAccountType === "cash" ? rawAccountType : null;
    const rawCustomerType = String(body.customer_type ?? body.customerType ?? "").trim().toLowerCase();
    const customerType = rawCustomerType === "trade" || rawCustomerType === "retail" ? rawCustomerType : null;
    const completed = Boolean(body.completed ?? false);
    const rawBalance = body.balance;
    const balanceParsed =
      typeof rawBalance === "number"
        ? rawBalance
        : typeof rawBalance === "string" && rawBalance.trim() !== ""
          ? Number(rawBalance)
          : 0;
    if (!Number.isFinite(balanceParsed)) return json(400, { error: "Invalid balance" });
    const balance = Number(balanceParsed);

    const hasNotes = Object.prototype.hasOwnProperty.call(body, "notes");
    const notesParsed = hasNotes
      ? (() => {
          const raw = String(body.notes ?? "").trim();
          return raw.length > 0 ? raw.slice(0, 20000) : null;
        })()
      : undefined;

    if (!name) return json(400, { error: "Missing name" });
    const email = emailProvided ? emailRaw.toLowerCase() : null;

    const { data: existing, error: existingErr } = await admin.auth.admin.getUserById(userId);
    if (existingErr || !existing?.user) return json(404, { error: "User not found" });

    const currentMeta = existing.user.user_metadata || {};
    const nextMeta: Record<string, unknown> = {
      ...currentMeta,
      name,
      phone,
      address,
      company_name: companyName,
      vat_number: vatNumber,
      account_type: accountType,
      balance,
      customer_type: customerType,
      completed,
    };
    if (hasNotes) nextMeta.notes = notesParsed ?? "";

    const updateAuthPayload: Record<string, unknown> = {
      user_metadata: nextMeta,
    };
    if (emailProvided) updateAuthPayload.email = email;

    const { data: updated, error: updateErr } = await admin.auth.admin.updateUserById(userId, updateAuthPayload);
    if (updateErr) return json(400, { error: updateErr.message });

    // Keep profiles in sync (fast admin listing) + job rows in sync.
    const profileUpdate: Record<string, unknown> = {
      name,
      phone,
      address,
      company_name: companyName,
      vat_number: vatNumber,
      account_type: accountType,
      balance,
      customer_type: customerType,
      completed,
    };
    if (hasNotes) profileUpdate.notes = notesParsed;
    if (emailProvided) profileUpdate.email = email;
    await admin.from("profiles").update(profileUpdate).eq("id", userId);

    // Keep job rows in sync for any "customer contact details" stored on jobs.
    const jobUpdate: Record<string, unknown> = {
      customer_name: name,
      customer_phone: phone,
      customer_address: address,
    };
    if (emailProvided) jobUpdate.customer_email = email;
    await admin.from("jobs").update(jobUpdate).eq("customer_id", userId);

    return json(200, {
      user: {
        id: updated.user.id,
        email: updated.user.email ?? "",
        user_metadata: updated.user.user_metadata,
      },
    });
  } catch (err) {
    return json(500, { error: String(err?.message || err) });
  }
});

