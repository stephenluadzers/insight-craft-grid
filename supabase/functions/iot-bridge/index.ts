// IoT bridge: publish to MQTT broker over WebSocket (mqtt.js via esm), record telemetry
// Modbus/OPC-UA proxied via HTTP gateway URL stored on the device.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import mqtt from 'https://esm.sh/mqtt@5.10.1?bundle';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { device_id, action, payload } = await req.json();
    if (!device_id || !action) return j({ error: 'device_id + action required' }, 400);
    const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: dev } = await supa.from('iot_devices').select('*').eq('id', device_id).single();
    if (!dev) return j({ error: 'device not found' }, 404);

    if (dev.protocol === 'mqtt') {
      const auth = dev.auth_secret_name ? Deno.env.get(dev.auth_secret_name) : null;
      const [username, password] = auth ? auth.split(':') : [undefined, undefined];
      const client = await new Promise<any>((res, rej) => {
        const c = mqtt.connect(dev.broker_url, { username, password, connectTimeout: 8000 });
        c.on('connect', () => res(c));
        c.on('error', rej);
      });
      if (action === 'publish') {
        await new Promise<void>((res, rej) => client.publish(dev.topic, JSON.stringify(payload ?? {}), { qos: 1 }, (e: any) => e ? rej(e) : res()));
      }
      client.end();
      await supa.from('iot_devices').update({ last_seen_at: new Date().toISOString(), last_payload: payload }).eq('id', device_id);
      return j({ ok: true });
    }

    if (dev.protocol === 'modbus' || dev.protocol === 'opcua' || dev.protocol === 'http') {
      const r = await fetch(dev.broker_url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });
      const data = await r.json().catch(() => ({}));
      return j({ status: r.status, data });
    }

    return j({ error: 'unsupported protocol' }, 400);
  } catch (e) { return j({ error: String(e?.message ?? e) }, 500); }
});
function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
