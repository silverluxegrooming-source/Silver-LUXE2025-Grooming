import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const plans: { [key: string]: { amount: number } } = {
  "classic-plan": { amount: 300000 * 100 }, 
  "executive-plan": { amount: 525000 * 100 },
  "prestige-plan": { amount: 750000 * 100 },
  "black-card": { amount: 20000000 * 100 }
};

// --- THIS IS YOUR LIVE DOMAIN ---
const LIVE_SITE_URL = "https://silverluxegrooming.com";

async function handleOneOffBooking(PAYSTACK_KEY: string, bookingData: any) {
    let totalAmount = 0;
    Object.values(bookingData.order_items).forEach((item: any) => {
        totalAmount += item.price * item.qty;
    });

    return await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${PAYSTACK_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            email: bookingData.email,
            amount: totalAmount * 100, // Convert to Kobo
            callback_url: `${LIVE_SITE_URL}/confirmation-one-off.html`, // <-- UPDATED
            metadata: { booking_id: bookingData.id } 
        }),
    });
}

async function handleMembershipBooking(PAYSTACK_KEY: string, planId: string, email: string) {
    const plan = plans[planId];
    if (!plan) {
        throw new Error("Invalid plan selected.");
    }

    return await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${PAYSTACK_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            email: email,
            amount: plan.amount,
            callback_url: `${LIVE_SITE_URL}/account.html`, // <-- UPDATED
        }),
    });
}

serve(async (req: Request) => {
  // Set CORS headers for security
  // We now allow BOTH your Vercel URL and your final domain
  const allowedOrigins = [LIVE_SITE_URL, "https://silver-luxe-grooming.vercel.app"];
  const origin = req.headers.get("Origin");
  const corsHeaders = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (allowedOrigins.includes(origin)) {
    corsHeaders["Access-Control-Allow-Origin"] = origin;
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const PAYSTACK_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    const body = await req.json();
    let paystackResponse;

    if (body.planId && body.email) {
        paystackResponse = await handleMembershipBooking(PAYSTACK_KEY!, body.planId, body.email);
    } else if (body.bookingData) {
        paystackResponse = await handleOneOffBooking(PAYSTACK_KEY!, body.bookingData);
    } else {
        throw new Error("Invalid request. Must provide planId or bookingData.");
    }

    const paystackData = await paystackResponse.json();
    if (!paystackData.status) {
      throw new Error(paystackData.message);
    }

    return new Response(
      JSON.stringify({ authorization_url: paystackData.data.authorization_url }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
});