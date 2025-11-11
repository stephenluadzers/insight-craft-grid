import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user's workspace
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('default_workspace_id')
      .eq('id', user.id)
      .single();

    if (!profile?.default_workspace_id) {
      return new Response(JSON.stringify({ 
        subscribed: false, 
        tier: 'free',
        subscription_end: null 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check existing subscription in DB
    const { data: dbSub } = await supabaseClient
      .from('workspace_subscriptions')
      .select('*')
      .eq('workspace_id', profile.default_workspace_id)
      .single();

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // If we have a Stripe customer, sync their subscription
    if (dbSub?.stripe_customer_id) {
      const subscriptions = await stripe.subscriptions.list({
        customer: dbSub.stripe_customer_id,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        const productId = subscription.items.data[0].price.product as string;
        
        // Map product to tier
        let tier: string = 'free';
        if (productId.includes('professional') || productId.includes('pro')) tier = 'professional';
        else if (productId.includes('business')) tier = 'business';
        else if (productId.includes('enterprise')) tier = 'enterprise';

        // Update DB
        await supabaseClient
          .from('workspace_subscriptions')
          .update({
            status: 'active',
            stripe_product_id: productId,
            tier: tier,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
          })
          .eq('workspace_id', profile.default_workspace_id);

        logStep("Active subscription found", { tier, productId });

        return new Response(JSON.stringify({
          subscribed: true,
          tier: tier,
          product_id: productId,
          subscription_end: new Date(subscription.current_period_end * 1000).toISOString()
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // No active subscription found
    logStep("No active subscription");
    return new Response(JSON.stringify({
      subscribed: false,
      tier: dbSub?.tier || 'free',
      subscription_end: null
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
