// @ts-nocheck - Deno runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const admin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin: user_metadata.role or profiles.role
    let isAdmin = user.user_metadata?.role === "ADMIN" || user.user_metadata?.role === "ENGINEER";
    if (!isAdmin) {
      const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
      const pr = (profile?.role as string)?.toLowerCase();
      isAdmin = pr === "admin" || pr === "engineer";
    }
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { name, email, phone, address, send_invite, redirectTo } = body;
    if (!name) {
      return new Response(JSON.stringify({ error: "Missing name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trimmedName = String(name).trim();
    const providedEmail = String(email ?? "").trim().toLowerCase();
    const shouldSendInvite = send_invite === true;
    const userEmail = providedEmail || `customer-${crypto.randomUUID()}@no-email.local`;
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
    if (!Number.isFinite(balanceParsed)) {
      return new Response(JSON.stringify({ error: "Invalid balance" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const balance = Number(balanceParsed);

    const notesRaw = String(body.notes ?? "").trim();
    const notes = notesRaw.length > 0 ? notesRaw.slice(0, 20000) : null;

    if (shouldSendInvite && !providedEmail) {
      return new Response(JSON.stringify({ error: "Valid email required to send invite" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let createdUser: any = null;
    if (shouldSendInvite) {
      const { data: invitedData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(providedEmail, {
        redirectTo: String(redirectTo ?? "").trim() || undefined,
        data: {
          name: trimmedName,
          role: "CUSTOMER",
          phone: (phone && String(phone).trim()) || "",
          address: (address && String(address).trim()) || "",
          company_name: companyName,
          vat_number: vatNumber,
          account_type: accountType,
          balance,
          customer_type: customerType,
          completed,
          notes: notes ?? "",
        },
      });
      if (inviteErr) {
        return new Response(JSON.stringify({ error: inviteErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      createdUser = invitedData?.user ?? null;
    } else {
      // Create auth user directly so admins can add customers without email-delivery limits.
      const tempPassword = `Tmp-${crypto.randomUUID()}-A1!`;
      const { data: createdData, error } = await admin.auth.admin.createUser({
        email: userEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          name: trimmedName,
          role: "CUSTOMER",
          phone: (phone && String(phone).trim()) || "",
          address: (address && String(address).trim()) || "",
          company_name: companyName,
          vat_number: vatNumber,
          account_type: accountType,
          balance,
          customer_type: customerType,
          completed,
          notes: notes ?? "",
        },
      });
      if (error) {
        const raw = String(error.message ?? "");
        const lower = raw.toLowerCase();
        const duplicateEmail =
          providedEmail.length > 0 &&
          (lower.includes("already been registered") ||
            lower.includes("already registered") ||
            lower.includes("user already exists") ||
            lower.includes("duplicate"));
        const message = duplicateEmail
          ? "A customer with this email already exists. Use a different email or link this site to the existing customer."
          : raw;
        return new Response(JSON.stringify({ error: message }), {
          status: duplicateEmail ? 409 : 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      createdUser = createdData?.user ?? null;
    }

    if (!createdUser) {
      return new Response(JSON.stringify({ error: "User creation failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert profile for fast admin listing + RLS
    await admin.from("profiles").upsert(
      {
        id: createdUser.id,
        role: "customer",
        name: trimmedName,
        email: providedEmail || null,
        phone: (phone && String(phone).trim()) || "",
        address: (address && String(address).trim()) || "",
        company_name: companyName || null,
        vat_number: vatNumber || null,
        account_type: accountType,
        balance,
        customer_type: customerType,
        completed,
        notes,
      },
      { onConflict: "id" }
    );

    return new Response(
      JSON.stringify({
        user: {
          id: createdUser.id,
          email: providedEmail || "",
          user_metadata: createdUser.user_metadata,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
