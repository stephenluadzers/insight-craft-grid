// Unified proxy across PayPal/Square/Adyen/Braintree/Razorpay/Mollie/Lemon Squeezy
// POST { gateway_id, action: 'create_payment'|'refund'|'subscribe'|'webhook_verify', payload }
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

type Provider = 'paypal'|'square'|'adyen'|'braintree'|'razorpay'|'mollie'|'lemonsqueezy';

const ENDPOINTS: Record<Provider, { live: string; sandbox: string }> = {
  paypal:       { live: 'https://api-m.paypal.com',       sandbox: 'https://api-m.sandbox.paypal.com' },
  square:       { live: 'https://connect.squareup.com',   sandbox: 'https://connect.squareupsandbox.com' },
  adyen:        { live: 'https://checkout-live.adyen.com', sandbox: 'https://checkout-test.adyen.com' },
  braintree:    { live: 'https://api.braintreegateway.com', sandbox: 'https://api.sandbox.braintreegateway.com' },
  razorpay:     { live: 'https://api.razorpay.com',       sandbox: 'https://api.razorpay.com' },
  mollie:       { live: 'https://api.mollie.com',         sandbox: 'https://api.mollie.com' },
  lemonsqueezy: { live: 'https://api.lemonsqueezy.com',   sandbox: 'https://api.lemonsqueezy.com' },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { gateway_id, action, payload = {} } = await req.json();
    if (!gateway_id || !action) return j({ error: 'gateway_id + action required' }, 400);
    const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: gw } = await supa.from('payment_gateways').select('*').eq('id', gateway_id).single();
    if (!gw) return j({ error: 'gateway not found' }, 404);
    const secret = Deno.env.get(gw.credentials_secret_name);
    if (!secret) return j({ error: `secret ${gw.credentials_secret_name} missing` }, 500);

    const base = ENDPOINTS[gw.provider as Provider]?.[gw.mode as 'live'|'sandbox'];
    if (!base) return j({ error: 'unsupported provider/mode' }, 400);

    // Provider-specific minimal routing — full SDK calls live in dedicated functions per provider
    const routes: Record<Provider, Record<string, { path: string; method: string }>> = {
      paypal: { create_payment: { path: '/v2/checkout/orders', method: 'POST' }, refund: { path: `/v2/payments/captures/${payload.capture_id}/refund`, method: 'POST' } },
      square: { create_payment: { path: '/v2/payments', method: 'POST' }, refund: { path: '/v2/refunds', method: 'POST' } },
      adyen: { create_payment: { path: '/v71/payments', method: 'POST' }, refund: { path: `/v71/payments/${payload.psp_reference}/refunds`, method: 'POST' } },
      braintree: { create_payment: { path: '/merchants/_/transactions', method: 'POST' }, refund: { path: `/merchants/_/transactions/${payload.transaction_id}/refund`, method: 'POST' } },
      razorpay: { create_payment: { path: '/v1/orders', method: 'POST' }, refund: { path: `/v1/payments/${payload.payment_id}/refund`, method: 'POST' } },
      mollie: { create_payment: { path: '/v2/payments', method: 'POST' }, refund: { path: `/v2/payments/${payload.payment_id}/refunds`, method: 'POST' } },
      lemonsqueezy: { create_payment: { path: '/v1/checkouts', method: 'POST' }, refund: { path: '/v1/refunds', method: 'POST' } },
    };
    const route = routes[gw.provider as Provider]?.[action];
    if (!route) return j({ error: 'unsupported action' }, 400);

    const auth = gw.provider === 'razorpay'
      ? `Basic ${btoa(secret)}` // key_id:key_secret
      : `Bearer ${secret}`;

    const r = await fetch(base + route.path, {
      method: route.method,
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: route.method === 'GET' ? undefined : JSON.stringify(payload),
    });
    const text = await r.text();
    let data: unknown = text; try { data = JSON.parse(text); } catch {}
    return j({ status: r.status, data }, r.ok ? 200 : r.status);
  } catch (e) { return j({ error: String(e?.message ?? e) }, 500); }
});
function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
