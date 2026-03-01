// @ts-nocheck - Deno runtime; IDE doesn't resolve Deno/esm.sh types
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "");
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    let customerEmail: string | undefined;
    try {
      const body = await req.json().catch(() => ({}));
      customerEmail = body?.customerEmail;
    } catch {
      // Empty or invalid body is ok
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card", "bacs_debit"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: "Grease Cleaning Service Plan",
              description:
                "Professional deep cleaning for commercial extraction systems. Monthly subscription.",
            },
            unit_amount: 49900, // £499/month
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      success_url: `${SITE_URL}/#/products?subscribed=success`,
      cancel_url: `${SITE_URL}/#/products`,
      ...(customerEmail && { customer_email: customerEmail }),
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
