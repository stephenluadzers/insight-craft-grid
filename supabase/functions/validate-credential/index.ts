import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Service registry: patterns, test endpoints, and help URLs
const SERVICE_REGISTRY: Record<string, {
  name: string;
  patterns: { prefix?: string; regex?: RegExp; description: string }[];
  testEndpoint: { url: string; method: string; headers: (key: string) => Record<string, string>; expectStatus?: number[] };
  helpUrl: string;
  helpText: string;
}> = {
  slack: {
    name: "Slack",
    patterns: [
      { prefix: "xoxb-", description: "Slack Bot Token" },
      { prefix: "xoxp-", description: "Slack User Token" },
      { prefix: "xapp-", description: "Slack App Token" },
      { prefix: "xoxe-", description: "Slack Enterprise Token" },
    ],
    testEndpoint: {
      url: "https://slack.com/api/auth.test",
      method: "POST",
      headers: (key) => ({ "Authorization": `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" }),
      expectStatus: [200],
    },
    helpUrl: "https://api.slack.com/apps",
    helpText: "Create a Slack App and generate a Bot Token under OAuth & Permissions.",
  },
  openai: {
    name: "OpenAI",
    patterns: [
      { prefix: "sk-", description: "OpenAI API Key" },
    ],
    testEndpoint: {
      url: "https://api.openai.com/v1/models",
      method: "GET",
      headers: (key) => ({ "Authorization": `Bearer ${key}` }),
      expectStatus: [200],
    },
    helpUrl: "https://platform.openai.com/api-keys",
    helpText: "Go to your OpenAI dashboard to create a new API key.",
  },
  stripe: {
    name: "Stripe",
    patterns: [
      { prefix: "sk_live_", description: "Stripe Live Secret Key" },
      { prefix: "sk_test_", description: "Stripe Test Secret Key" },
      { prefix: "pk_live_", description: "Stripe Live Publishable Key" },
      { prefix: "pk_test_", description: "Stripe Test Publishable Key" },
      { prefix: "rk_live_", description: "Stripe Restricted Key" },
      { prefix: "rk_test_", description: "Stripe Restricted Test Key" },
    ],
    testEndpoint: {
      url: "https://api.stripe.com/v1/balance",
      method: "GET",
      headers: (key) => ({ "Authorization": `Basic ${btoa(key + ":")}` }),
      expectStatus: [200],
    },
    helpUrl: "https://dashboard.stripe.com/apikeys",
    helpText: "Find your API keys in the Stripe Dashboard under Developers > API keys.",
  },
  sendgrid: {
    name: "SendGrid",
    patterns: [
      { prefix: "SG.", description: "SendGrid API Key" },
    ],
    testEndpoint: {
      url: "https://api.sendgrid.com/v3/user/credits",
      method: "GET",
      headers: (key) => ({ "Authorization": `Bearer ${key}` }),
      expectStatus: [200],
    },
    helpUrl: "https://app.sendgrid.com/settings/api_keys",
    helpText: "Create a SendGrid API key under Settings > API Keys.",
  },
  twilio: {
    name: "Twilio",
    patterns: [
      { prefix: "SK", regex: /^SK[0-9a-f]{32}$/, description: "Twilio API Key" },
      { regex: /^AC[0-9a-f]{32}$/, description: "Twilio Account SID" },
    ],
    testEndpoint: {
      url: "https://api.twilio.com/2010-04-01/Accounts.json",
      method: "GET",
      headers: (key) => ({ "Authorization": `Basic ${btoa(key + ":")}` }),
      expectStatus: [200, 401], // 401 means format is right but need SID:Token pair
    },
    helpUrl: "https://www.twilio.com/console",
    helpText: "Find your Account SID and Auth Token in the Twilio Console.",
  },
  github: {
    name: "GitHub",
    patterns: [
      { prefix: "ghp_", description: "GitHub Personal Access Token" },
      { prefix: "gho_", description: "GitHub OAuth Token" },
      { prefix: "ghu_", description: "GitHub User-to-Server Token" },
      { prefix: "ghs_", description: "GitHub Server-to-Server Token" },
      { prefix: "ghr_", description: "GitHub Refresh Token" },
    ],
    testEndpoint: {
      url: "https://api.github.com/user",
      method: "GET",
      headers: (key) => ({ "Authorization": `Bearer ${key}`, "User-Agent": "Remora-Flow" }),
      expectStatus: [200],
    },
    helpUrl: "https://github.com/settings/tokens",
    helpText: "Generate a personal access token under GitHub Settings > Developer Settings > Personal Access Tokens.",
  },
  google: {
    name: "Google / Gmail",
    patterns: [
      { prefix: "AIza", description: "Google API Key" },
    ],
    testEndpoint: {
      url: "https://www.googleapis.com/oauth2/v1/tokeninfo",
      method: "GET",
      headers: (_key) => ({}),
      expectStatus: [200, 400], // 400 = invalid but recognized format
    },
    helpUrl: "https://console.cloud.google.com/apis/credentials",
    helpText: "Create credentials in the Google Cloud Console under APIs & Services > Credentials.",
  },
  mailgun: {
    name: "Mailgun",
    patterns: [
      { prefix: "key-", description: "Mailgun API Key" },
      { regex: /^[0-9a-f]{32}-[0-9a-f]{8}-[0-9a-f]{8}$/, description: "Mailgun API Key" },
    ],
    testEndpoint: {
      url: "https://api.mailgun.net/v3/domains",
      method: "GET",
      headers: (key) => ({ "Authorization": `Basic ${btoa("api:" + key)}` }),
      expectStatus: [200],
    },
    helpUrl: "https://app.mailgun.com/settings/api_security",
    helpText: "Find your API key under Mailgun Settings > API Security.",
  },
  airtable: {
    name: "Airtable",
    patterns: [
      { prefix: "pat", regex: /^pat[A-Za-z0-9]{14}\.[0-9a-f]{64}$/, description: "Airtable Personal Access Token" },
      { prefix: "key", description: "Airtable Legacy API Key" },
    ],
    testEndpoint: {
      url: "https://api.airtable.com/v0/meta/whoami",
      method: "GET",
      headers: (key) => ({ "Authorization": `Bearer ${key}` }),
      expectStatus: [200],
    },
    helpUrl: "https://airtable.com/create/tokens",
    helpText: "Create a personal access token at airtable.com/create/tokens.",
  },
  notion: {
    name: "Notion",
    patterns: [
      { prefix: "secret_", description: "Notion Integration Token" },
      { prefix: "ntn_", description: "Notion Integration Token (new format)" },
    ],
    testEndpoint: {
      url: "https://api.notion.com/v1/users/me",
      method: "GET",
      headers: (key) => ({ "Authorization": `Bearer ${key}`, "Notion-Version": "2022-06-28" }),
      expectStatus: [200],
    },
    helpUrl: "https://www.notion.so/my-integrations",
    helpText: "Create an integration at notion.so/my-integrations and copy the Internal Integration Token.",
  },
  discord: {
    name: "Discord",
    patterns: [
      { regex: /^[A-Za-z0-9_-]{24}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}$/, description: "Discord Bot Token" },
    ],
    testEndpoint: {
      url: "https://discord.com/api/v10/users/@me",
      method: "GET",
      headers: (key) => ({ "Authorization": `Bot ${key}` }),
      expectStatus: [200],
    },
    helpUrl: "https://discord.com/developers/applications",
    helpText: "Create a Bot in the Discord Developer Portal and copy the token.",
  },
  hubspot: {
    name: "HubSpot",
    patterns: [
      { prefix: "pat-", description: "HubSpot Private App Token" },
    ],
    testEndpoint: {
      url: "https://api.hubapi.com/crm/v3/objects/contacts?limit=1",
      method: "GET",
      headers: (key) => ({ "Authorization": `Bearer ${key}` }),
      expectStatus: [200],
    },
    helpUrl: "https://app.hubspot.com/private-apps/",
    helpText: "Create a private app in HubSpot Settings > Integrations > Private Apps.",
  },
};

// Detect which service a key belongs to based on prefix/pattern
function detectService(key: string): { serviceId: string; service: typeof SERVICE_REGISTRY[string]; matchedPattern: string } | null {
  const trimmedKey = key.trim();
  
  for (const [serviceId, service] of Object.entries(SERVICE_REGISTRY)) {
    for (const pattern of service.patterns) {
      if (pattern.prefix && trimmedKey.startsWith(pattern.prefix)) {
        return { serviceId, service, matchedPattern: pattern.description };
      }
      if (pattern.regex && pattern.regex.test(trimmedKey)) {
        return { serviceId, service, matchedPattern: pattern.description };
      }
    }
  }
  return null;
}

// Detect service from node type/title context
function detectServiceFromContext(nodeType: string, nodeTitle: string): { serviceId: string; service: typeof SERVICE_REGISTRY[string] } | null {
  const combined = `${nodeType} ${nodeTitle}`.toLowerCase();
  
  const contextMap: Record<string, string[]> = {
    slack: ["slack", "slack message", "slack notification", "slack channel"],
    openai: ["openai", "gpt", "chatgpt", "dall-e", "whisper", "ai completion", "ai generate"],
    stripe: ["stripe", "payment", "charge", "invoice", "subscription billing"],
    sendgrid: ["sendgrid", "send grid", "email send"],
    twilio: ["twilio", "sms", "text message", "whatsapp"],
    github: ["github", "git repo", "repository", "pull request", "issue tracker"],
    google: ["google", "gmail", "google sheet", "google drive", "google calendar", "youtube"],
    mailgun: ["mailgun", "mail gun"],
    airtable: ["airtable", "air table"],
    notion: ["notion", "notion page", "notion database"],
    discord: ["discord", "discord bot", "discord message"],
    hubspot: ["hubspot", "hub spot", "crm"],
  };
  
  for (const [serviceId, keywords] of Object.entries(contextMap)) {
    if (keywords.some(kw => combined.includes(kw))) {
      const service = SERVICE_REGISTRY[serviceId];
      if (service) return { serviceId, service };
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, nodeType, nodeTitle, serviceHint } = await req.json();
    
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 5) {
      return new Response(JSON.stringify({
        valid: false,
        error: "Please provide a valid API key",
        detectedService: null,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const trimmedKey = apiKey.trim();

    // Step 1: Detect service from key pattern
    let detection = detectService(trimmedKey);
    let detectedFromKey = !!detection;

    // Step 2: If not detected from key, try context
    if (!detection && (nodeType || nodeTitle)) {
      const contextDetection = detectServiceFromContext(nodeType || '', nodeTitle || '');
      if (contextDetection) {
        detection = { ...contextDetection, matchedPattern: "Detected from node context" };
      }
    }

    // Step 3: If service hint provided, use that
    if (!detection && serviceHint && SERVICE_REGISTRY[serviceHint]) {
      detection = {
        serviceId: serviceHint,
        service: SERVICE_REGISTRY[serviceHint],
        matchedPattern: "User-specified service",
      };
    }

    if (!detection) {
      return new Response(JSON.stringify({
        valid: null,
        error: "Could not identify the service for this API key. Please check the key format.",
        detectedService: null,
        allServices: Object.entries(SERVICE_REGISTRY).map(([id, s]) => ({
          id,
          name: s.name,
          prefixes: s.patterns.map(p => p.prefix).filter(Boolean),
          helpUrl: s.helpUrl,
        })),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Step 4: Validate the key against the service's test endpoint
    const { service, matchedPattern } = detection;
    let valid = false;
    let validationMessage = '';

    try {
      const testConfig = service.testEndpoint;
      const headers = testConfig.headers(trimmedKey);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(testConfig.url, {
        method: testConfig.method,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const expectedStatuses = testConfig.expectStatus || [200];
      
      if (expectedStatuses.includes(response.status)) {
        // Extra validation for Slack (check "ok" field)
        if (detection.serviceId === 'slack') {
          try {
            const body = await response.json();
            valid = body.ok === true;
            validationMessage = valid 
              ? `✅ Verified! Connected as ${body.team || 'Slack workspace'}`
              : `❌ Slack rejected the token: ${body.error || 'unknown error'}`;
          } catch {
            valid = false;
            validationMessage = "❌ Could not parse Slack response";
          }
        } else {
          valid = true;
          validationMessage = `✅ ${service.name} API key is valid and working!`;
        }
      } else if (response.status === 401 || response.status === 403) {
        valid = false;
        validationMessage = `❌ ${service.name} rejected this key (${response.status}). The key may be expired, revoked, or lack permissions.`;
      } else {
        valid = false;
        validationMessage = `⚠️ Unexpected response from ${service.name} (HTTP ${response.status}). The key may still work but we couldn't confirm.`;
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        validationMessage = `⚠️ ${service.name} validation timed out. The key format looks correct but we couldn't verify it.`;
        // Trust the pattern match if key format matched
        valid = detectedFromKey;
      } else {
        validationMessage = `⚠️ Could not reach ${service.name} to validate. The key format looks ${detectedFromKey ? 'correct' : 'unrecognized'}.`;
        valid = detectedFromKey;
      }
    }

    return new Response(JSON.stringify({
      valid,
      detectedService: {
        id: detection.serviceId,
        name: service.name,
        matchedPattern,
      },
      message: validationMessage,
      helpUrl: valid ? null : service.helpUrl,
      helpText: valid ? null : service.helpText,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Credential validation error:', error);
    return new Response(JSON.stringify({
      valid: false,
      error: error.message || 'Unknown error during validation',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
