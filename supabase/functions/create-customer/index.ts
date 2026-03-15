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
    const { name, email, phone, address } = body;
    if (!name || !email) {
      return new Response(JSON.stringify({ error: "Missing name or email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trimmedEmail = String(email).trim().toLowerCase();

    // Use inviteUserByEmail - Supabase sends invite email; user sets password via invite link
    const redirectTo = (body.redirectTo as string) || (Deno.env.get("SITE_URL") || "http://localhost:5173") + "#/set-password";

    const { data: inviteData, error } = await admin.auth.admin.inviteUserByEmail(trimmedEmail, {
      redirectTo,
      data: {
        name: String(name).trim(),
        role: "CUSTOMER",
        phone: (phone && String(phone).trim()) || "",
        address: (address && String(address).trim()) || "",
      },
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!inviteData?.user) {
      return new Response(JSON.stringify({ error: "Invite failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert profile for RLS
    await admin.from("profiles").upsert(
      { id: inviteData.user.id, role: "customer" },
      { onConflict: "id" }
    );

    return new Response(
      JSON.stringify({
        user: {
          id: inviteData.user.id,
          email: inviteData.user.email,
          user_metadata: inviteData.user.user_metadata,
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
