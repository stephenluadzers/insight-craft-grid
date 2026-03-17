/**
 * Credential Manifest System
 * Extracts, maps, and generates portable credential configurations
 * so exported workflows auto-wire keys into any target platform.
 */

import { WorkflowNodeData } from "@/types/workflow";

// Known service registry with key prefixes and platform-specific config paths
const SERVICE_REGISTRY: Record<string, {
  name: string;
  prefixes: string[];
  envVar: string;
  helpUrl: string;
  platformMapping: Record<string, { path: string; format: string; instructions: string }>;
}> = {
  slack: {
    name: "Slack",
    prefixes: ["xoxb-", "xoxp-", "xapp-"],
    envVar: "SLACK_BOT_TOKEN",
    helpUrl: "https://api.slack.com/apps",
    platformMapping: {
      n8n: { path: "credentials.slackApi", format: "accessToken", instructions: "Go to Settings > Credentials > Add Credential > Slack API, paste token into 'Access Token'" },
      make: { path: "connection.slack", format: "oauth_token", instructions: "Add a Slack connection in Make, use 'Custom App' and paste the Bot Token" },
      zapier: { path: "authentication.slack", format: "api_key", instructions: "Connect Slack in Zapier using 'Custom Integration' with your Bot Token" },
      python: { path: "os.environ['SLACK_BOT_TOKEN']", format: "env_var", instructions: "Set SLACK_BOT_TOKEN in your .env file or environment variables" },
      typescript: { path: "process.env.SLACK_BOT_TOKEN", format: "env_var", instructions: "Set SLACK_BOT_TOKEN in your .env file or environment variables" },
      docker: { path: "environment.SLACK_BOT_TOKEN", format: "docker_env", instructions: "Add SLACK_BOT_TOKEN to docker-compose.yml environment section or .env file" },
      "github-actions": { path: "secrets.SLACK_BOT_TOKEN", format: "github_secret", instructions: "Add SLACK_BOT_TOKEN to Repository Settings > Secrets and Variables > Actions" },
      "supabase-function": { path: "Deno.env.get('SLACK_BOT_TOKEN')", format: "supabase_secret", instructions: "Run: supabase secrets set SLACK_BOT_TOKEN=your-token" },
    },
  },
  openai: {
    name: "OpenAI",
    prefixes: ["sk-"],
    envVar: "OPENAI_API_KEY",
    helpUrl: "https://platform.openai.com/api-keys",
    platformMapping: {
      n8n: { path: "credentials.openAiApi", format: "apiKey", instructions: "Go to Settings > Credentials > Add Credential > OpenAI, paste key into 'API Key'" },
      make: { path: "connection.openai", format: "api_key", instructions: "Add an OpenAI connection in Make and paste your API key" },
      zapier: { path: "authentication.openai", format: "api_key", instructions: "Connect OpenAI in Zapier and paste your API key" },
      python: { path: "os.environ['OPENAI_API_KEY']", format: "env_var", instructions: "Set OPENAI_API_KEY in your .env file" },
      typescript: { path: "process.env.OPENAI_API_KEY", format: "env_var", instructions: "Set OPENAI_API_KEY in your .env file" },
      docker: { path: "environment.OPENAI_API_KEY", format: "docker_env", instructions: "Add OPENAI_API_KEY to docker-compose.yml or .env" },
      "github-actions": { path: "secrets.OPENAI_API_KEY", format: "github_secret", instructions: "Add OPENAI_API_KEY to Repository Secrets" },
      "supabase-function": { path: "Deno.env.get('OPENAI_API_KEY')", format: "supabase_secret", instructions: "Run: supabase secrets set OPENAI_API_KEY=your-key" },
    },
  },
  stripe: {
    name: "Stripe",
    prefixes: ["sk_live_", "sk_test_", "pk_live_", "pk_test_", "rk_live_", "rk_test_"],
    envVar: "STRIPE_SECRET_KEY",
    helpUrl: "https://dashboard.stripe.com/apikeys",
    platformMapping: {
      n8n: { path: "credentials.stripeApi", format: "secretKey", instructions: "Go to Settings > Credentials > Add Credential > Stripe, paste key into 'Secret Key'" },
      make: { path: "connection.stripe", format: "api_key", instructions: "Add a Stripe connection in Make with your Secret Key" },
      zapier: { path: "authentication.stripe", format: "api_key", instructions: "Connect Stripe in Zapier with your API key" },
      python: { path: "os.environ['STRIPE_SECRET_KEY']", format: "env_var", instructions: "Set STRIPE_SECRET_KEY in your .env file" },
      typescript: { path: "process.env.STRIPE_SECRET_KEY", format: "env_var", instructions: "Set STRIPE_SECRET_KEY in your .env file" },
      docker: { path: "environment.STRIPE_SECRET_KEY", format: "docker_env", instructions: "Add to docker-compose.yml environment or .env" },
      "github-actions": { path: "secrets.STRIPE_SECRET_KEY", format: "github_secret", instructions: "Add STRIPE_SECRET_KEY to Repository Secrets" },
      "supabase-function": { path: "Deno.env.get('STRIPE_SECRET_KEY')", format: "supabase_secret", instructions: "Run: supabase secrets set STRIPE_SECRET_KEY=your-key" },
    },
  },
  sendgrid: {
    name: "SendGrid",
    prefixes: ["SG."],
    envVar: "SENDGRID_API_KEY",
    helpUrl: "https://app.sendgrid.com/settings/api_keys",
    platformMapping: {
      n8n: { path: "credentials.sendGridApi", format: "apiKey", instructions: "Go to Settings > Credentials > Add Credential > SendGrid, paste key" },
      make: { path: "connection.sendgrid", format: "api_key", instructions: "Add a SendGrid connection with your API key" },
      zapier: { path: "authentication.sendgrid", format: "api_key", instructions: "Connect SendGrid in Zapier with your API key" },
      python: { path: "os.environ['SENDGRID_API_KEY']", format: "env_var", instructions: "Set SENDGRID_API_KEY in your .env" },
      typescript: { path: "process.env.SENDGRID_API_KEY", format: "env_var", instructions: "Set SENDGRID_API_KEY in your .env" },
      docker: { path: "environment.SENDGRID_API_KEY", format: "docker_env", instructions: "Add to docker-compose.yml or .env" },
      "github-actions": { path: "secrets.SENDGRID_API_KEY", format: "github_secret", instructions: "Add SENDGRID_API_KEY to Repository Secrets" },
      "supabase-function": { path: "Deno.env.get('SENDGRID_API_KEY')", format: "supabase_secret", instructions: "Run: supabase secrets set SENDGRID_API_KEY=your-key" },
    },
  },
  github: {
    name: "GitHub",
    prefixes: ["ghp_", "gho_", "ghu_", "ghs_", "ghr_"],
    envVar: "GITHUB_TOKEN",
    helpUrl: "https://github.com/settings/tokens",
    platformMapping: {
      n8n: { path: "credentials.githubApi", format: "accessToken", instructions: "Go to Settings > Credentials > Add Credential > GitHub, paste token" },
      make: { path: "connection.github", format: "personal_token", instructions: "Add a GitHub connection with your Personal Access Token" },
      zapier: { path: "authentication.github", format: "api_key", instructions: "Connect GitHub in Zapier with your token" },
      python: { path: "os.environ['GITHUB_TOKEN']", format: "env_var", instructions: "Set GITHUB_TOKEN in your .env" },
      typescript: { path: "process.env.GITHUB_TOKEN", format: "env_var", instructions: "Set GITHUB_TOKEN in your .env" },
      docker: { path: "environment.GITHUB_TOKEN", format: "docker_env", instructions: "Add to docker-compose.yml or .env" },
      "github-actions": { path: "secrets.GITHUB_TOKEN", format: "github_secret", instructions: "Use the built-in GITHUB_TOKEN or add a custom PAT to Secrets" },
      "supabase-function": { path: "Deno.env.get('GITHUB_TOKEN')", format: "supabase_secret", instructions: "Run: supabase secrets set GITHUB_TOKEN=your-token" },
    },
  },
  twilio: {
    name: "Twilio",
    prefixes: ["SK", "AC"],
    envVar: "TWILIO_AUTH_TOKEN",
    helpUrl: "https://www.twilio.com/console",
    platformMapping: {
      n8n: { path: "credentials.twilioApi", format: "authToken", instructions: "Go to Settings > Credentials > Add Credential > Twilio, paste Account SID and Auth Token" },
      make: { path: "connection.twilio", format: "auth_token", instructions: "Add a Twilio connection with Account SID + Auth Token" },
      zapier: { path: "authentication.twilio", format: "api_key", instructions: "Connect Twilio in Zapier with your credentials" },
      python: { path: "os.environ['TWILIO_AUTH_TOKEN']", format: "env_var", instructions: "Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in your .env" },
      typescript: { path: "process.env.TWILIO_AUTH_TOKEN", format: "env_var", instructions: "Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in your .env" },
      docker: { path: "environment.TWILIO_AUTH_TOKEN", format: "docker_env", instructions: "Add to docker-compose.yml or .env" },
      "github-actions": { path: "secrets.TWILIO_AUTH_TOKEN", format: "github_secret", instructions: "Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to Repository Secrets" },
      "supabase-function": { path: "Deno.env.get('TWILIO_AUTH_TOKEN')", format: "supabase_secret", instructions: "Run: supabase secrets set TWILIO_AUTH_TOKEN=your-token" },
    },
  },
  google: {
    name: "Google",
    prefixes: ["AIza"],
    envVar: "GOOGLE_API_KEY",
    helpUrl: "https://console.cloud.google.com/apis/credentials",
    platformMapping: {
      n8n: { path: "credentials.googleApi", format: "apiKey", instructions: "Go to Settings > Credentials > Add Credential > Google, paste API key" },
      make: { path: "connection.google", format: "api_key", instructions: "Add a Google connection with your API key or OAuth credentials" },
      zapier: { path: "authentication.google", format: "api_key", instructions: "Connect Google in Zapier with your credentials" },
      python: { path: "os.environ['GOOGLE_API_KEY']", format: "env_var", instructions: "Set GOOGLE_API_KEY in your .env" },
      typescript: { path: "process.env.GOOGLE_API_KEY", format: "env_var", instructions: "Set GOOGLE_API_KEY in your .env" },
      docker: { path: "environment.GOOGLE_API_KEY", format: "docker_env", instructions: "Add to docker-compose.yml or .env" },
      "github-actions": { path: "secrets.GOOGLE_API_KEY", format: "github_secret", instructions: "Add GOOGLE_API_KEY to Repository Secrets" },
      "supabase-function": { path: "Deno.env.get('GOOGLE_API_KEY')", format: "supabase_secret", instructions: "Run: supabase secrets set GOOGLE_API_KEY=your-key" },
    },
  },
  notion: {
    name: "Notion",
    prefixes: ["secret_", "ntn_"],
    envVar: "NOTION_API_KEY",
    helpUrl: "https://www.notion.so/my-integrations",
    platformMapping: {
      n8n: { path: "credentials.notionApi", format: "apiKey", instructions: "Go to Settings > Credentials > Add Credential > Notion, paste Integration Token" },
      make: { path: "connection.notion", format: "api_key", instructions: "Add a Notion connection with your Integration Token" },
      zapier: { path: "authentication.notion", format: "api_key", instructions: "Connect Notion in Zapier" },
      python: { path: "os.environ['NOTION_API_KEY']", format: "env_var", instructions: "Set NOTION_API_KEY in your .env" },
      typescript: { path: "process.env.NOTION_API_KEY", format: "env_var", instructions: "Set NOTION_API_KEY in your .env" },
      docker: { path: "environment.NOTION_API_KEY", format: "docker_env", instructions: "Add to docker-compose.yml or .env" },
      "github-actions": { path: "secrets.NOTION_API_KEY", format: "github_secret", instructions: "Add NOTION_API_KEY to Repository Secrets" },
      "supabase-function": { path: "Deno.env.get('NOTION_API_KEY')", format: "supabase_secret", instructions: "Run: supabase secrets set NOTION_API_KEY=your-key" },
    },
  },
  discord: {
    name: "Discord",
    prefixes: [],
    envVar: "DISCORD_BOT_TOKEN",
    helpUrl: "https://discord.com/developers/applications",
    platformMapping: {
      n8n: { path: "credentials.discordApi", format: "botToken", instructions: "Go to Settings > Credentials > Add Credential > Discord, paste Bot Token" },
      make: { path: "connection.discord", format: "bot_token", instructions: "Add a Discord connection with your Bot Token" },
      zapier: { path: "authentication.discord", format: "api_key", instructions: "Connect Discord in Zapier" },
      python: { path: "os.environ['DISCORD_BOT_TOKEN']", format: "env_var", instructions: "Set DISCORD_BOT_TOKEN in your .env" },
      typescript: { path: "process.env.DISCORD_BOT_TOKEN", format: "env_var", instructions: "Set DISCORD_BOT_TOKEN in your .env" },
      docker: { path: "environment.DISCORD_BOT_TOKEN", format: "docker_env", instructions: "Add to docker-compose.yml or .env" },
      "github-actions": { path: "secrets.DISCORD_BOT_TOKEN", format: "github_secret", instructions: "Add DISCORD_BOT_TOKEN to Repository Secrets" },
      "supabase-function": { path: "Deno.env.get('DISCORD_BOT_TOKEN')", format: "supabase_secret", instructions: "Run: supabase secrets set DISCORD_BOT_TOKEN=your-token" },
    },
  },
  hubspot: {
    name: "HubSpot",
    prefixes: ["pat-"],
    envVar: "HUBSPOT_API_KEY",
    helpUrl: "https://app.hubspot.com/private-apps/",
    platformMapping: {
      n8n: { path: "credentials.hubspotApi", format: "accessToken", instructions: "Go to Settings > Credentials > Add Credential > HubSpot, paste Private App Token" },
      make: { path: "connection.hubspot", format: "private_app_token", instructions: "Add a HubSpot connection with your Private App Token" },
      zapier: { path: "authentication.hubspot", format: "api_key", instructions: "Connect HubSpot in Zapier" },
      python: { path: "os.environ['HUBSPOT_API_KEY']", format: "env_var", instructions: "Set HUBSPOT_API_KEY in your .env" },
      typescript: { path: "process.env.HUBSPOT_API_KEY", format: "env_var", instructions: "Set HUBSPOT_API_KEY in your .env" },
      docker: { path: "environment.HUBSPOT_API_KEY", format: "docker_env", instructions: "Add to docker-compose.yml or .env" },
      "github-actions": { path: "secrets.HUBSPOT_API_KEY", format: "github_secret", instructions: "Add HUBSPOT_API_KEY to Repository Secrets" },
      "supabase-function": { path: "Deno.env.get('HUBSPOT_API_KEY')", format: "supabase_secret", instructions: "Run: supabase secrets set HUBSPOT_API_KEY=your-key" },
    },
  },
  airtable: {
    name: "Airtable",
    prefixes: ["pat", "key"],
    envVar: "AIRTABLE_API_KEY",
    helpUrl: "https://airtable.com/create/tokens",
    platformMapping: {
      n8n: { path: "credentials.airtableApi", format: "apiKey", instructions: "Go to Settings > Credentials > Add Credential > Airtable, paste your token" },
      make: { path: "connection.airtable", format: "api_key", instructions: "Add an Airtable connection with your Personal Access Token" },
      zapier: { path: "authentication.airtable", format: "api_key", instructions: "Connect Airtable in Zapier" },
      python: { path: "os.environ['AIRTABLE_API_KEY']", format: "env_var", instructions: "Set AIRTABLE_API_KEY in your .env" },
      typescript: { path: "process.env.AIRTABLE_API_KEY", format: "env_var", instructions: "Set AIRTABLE_API_KEY in your .env" },
      docker: { path: "environment.AIRTABLE_API_KEY", format: "docker_env", instructions: "Add to docker-compose.yml or .env" },
      "github-actions": { path: "secrets.AIRTABLE_API_KEY", format: "github_secret", instructions: "Add AIRTABLE_API_KEY to Repository Secrets" },
      "supabase-function": { path: "Deno.env.get('AIRTABLE_API_KEY')", format: "supabase_secret", instructions: "Run: supabase secrets set AIRTABLE_API_KEY=your-key" },
    },
  },
  mailgun: {
    name: "Mailgun",
    prefixes: ["key-"],
    envVar: "MAILGUN_API_KEY",
    helpUrl: "https://app.mailgun.com/settings/api_security",
    platformMapping: {
      n8n: { path: "credentials.mailgunApi", format: "apiKey", instructions: "Go to Settings > Credentials > Add Credential > Mailgun, paste key" },
      make: { path: "connection.mailgun", format: "api_key", instructions: "Add a Mailgun connection with your API key" },
      zapier: { path: "authentication.mailgun", format: "api_key", instructions: "Connect Mailgun in Zapier" },
      python: { path: "os.environ['MAILGUN_API_KEY']", format: "env_var", instructions: "Set MAILGUN_API_KEY in your .env" },
      typescript: { path: "process.env.MAILGUN_API_KEY", format: "env_var", instructions: "Set MAILGUN_API_KEY in your .env" },
      docker: { path: "environment.MAILGUN_API_KEY", format: "docker_env", instructions: "Add to docker-compose.yml or .env" },
      "github-actions": { path: "secrets.MAILGUN_API_KEY", format: "github_secret", instructions: "Add MAILGUN_API_KEY to Repository Secrets" },
      "supabase-function": { path: "Deno.env.get('MAILGUN_API_KEY')", format: "supabase_secret", instructions: "Run: supabase secrets set MAILGUN_API_KEY=your-key" },
    },
  },
};

// Context-based service detection from node title/type
const CONTEXT_KEYWORDS: Record<string, string[]> = {
  slack: ["slack", "slack message", "slack notification"],
  openai: ["openai", "gpt", "chatgpt", "ai completion", "ai generate"],
  stripe: ["stripe", "payment", "charge", "invoice"],
  sendgrid: ["sendgrid", "email send"],
  twilio: ["twilio", "sms", "text message"],
  github: ["github", "repository", "pull request"],
  google: ["google", "gmail", "google sheet", "youtube"],
  notion: ["notion"],
  discord: ["discord"],
  hubspot: ["hubspot", "crm"],
  airtable: ["airtable"],
  mailgun: ["mailgun"],
};

export interface CredentialEntry {
  id: string;
  service: string;
  serviceName: string;
  envVar: string;
  maskedValue: string;
  rawValue: string;
  nodeId: string;
  nodeTitle: string;
  configField: string;
  helpUrl: string;
  detectedBy: 'prefix' | 'context' | 'field_name';
}

export interface CredentialManifest {
  version: string;
  generatedAt: string;
  workflowName: string;
  credentials: CredentialEntry[];
  platformSetup: Record<string, {
    platform: string;
    instructions: { service: string; path: string; format: string; steps: string }[];
    envTemplate: string;
  }>;
}

// Credential field patterns
const CREDENTIAL_FIELDS = [
  'api_key', 'apikey', 'apiKey', 'api-key',
  'token', 'access_token', 'accessToken', 'auth_token', 'authToken',
  'secret', 'secret_key', 'secretKey',
  'bearer', 'bot_token', 'webhook_secret',
  'password', 'credentials', 'key',
];

function isCredentialField(field: string): boolean {
  return CREDENTIAL_FIELDS.some(p => field.toLowerCase().includes(p.toLowerCase()));
}

function detectServiceFromValue(value: string): string | null {
  for (const [serviceId, service] of Object.entries(SERVICE_REGISTRY)) {
    for (const prefix of service.prefixes) {
      if (value.startsWith(prefix)) return serviceId;
    }
  }
  return null;
}

function detectServiceFromContext(nodeTitle: string, nodeType: string): string | null {
  const combined = `${nodeTitle} ${nodeType}`.toLowerCase();
  for (const [serviceId, keywords] of Object.entries(CONTEXT_KEYWORDS)) {
    if (keywords.some(kw => combined.includes(kw))) return serviceId;
  }
  return null;
}

function maskValue(value: string): string {
  if (value.length <= 8) return '****';
  return value.slice(0, 6) + '...' + value.slice(-4);
}

/**
 * Extract all credentials from workflow nodes
 */
export function extractCredentials(nodes: WorkflowNodeData[], workflowName: string): CredentialManifest {
  const credentials: CredentialEntry[] = [];
  let credIndex = 0;

  for (const node of nodes) {
    const config = node.config || {};
    
    for (const [field, value] of Object.entries(config)) {
      if (typeof value !== 'string' || value.length < 5) continue;
      
      // Try detect by key prefix
      let serviceId = detectServiceFromValue(value);
      let detectedBy: 'prefix' | 'context' | 'field_name' = 'prefix';

      // Fallback: detect from field name + node context
      if (!serviceId && isCredentialField(field)) {
        serviceId = detectServiceFromContext(node.title, node.type);
        detectedBy = serviceId ? 'context' : 'field_name';
      }

      if (!serviceId && isCredentialField(field)) {
        // Still a credential, but unknown service — mark as generic
        detectedBy = 'field_name';
      }

      if (serviceId || isCredentialField(field)) {
        const service = serviceId ? SERVICE_REGISTRY[serviceId] : null;
        credIndex++;
        
        credentials.push({
          id: `cred_${credIndex}`,
          service: serviceId || 'unknown',
          serviceName: service?.name || 'Unknown Service',
          envVar: service?.envVar || field.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
          maskedValue: maskValue(value),
          rawValue: value,
          nodeId: node.id,
          nodeTitle: node.title,
          configField: field,
          helpUrl: service?.helpUrl || '',
          detectedBy,
        });
      }
    }
  }

  // Generate platform-specific setup for all platforms
  const platforms = ['n8n', 'make', 'zapier', 'python', 'typescript', 'docker', 'github-actions', 'supabase-function'];
  const platformSetup: CredentialManifest['platformSetup'] = {};

  for (const platform of platforms) {
    const instructions = credentials
      .filter(c => c.service !== 'unknown')
      .map(c => {
        const mapping = SERVICE_REGISTRY[c.service]?.platformMapping[platform];
        return {
          service: c.serviceName,
          path: mapping?.path || `${platform}.credentials.${c.envVar}`,
          format: mapping?.format || 'env_var',
          steps: mapping?.instructions || `Set ${c.envVar} in your ${platform} configuration`,
        };
      });

    const envLines = credentials.map(c => `${c.envVar}=${c.maskedValue}`);

    platformSetup[platform] = {
      platform,
      instructions,
      envTemplate: envLines.join('\n'),
    };
  }

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    workflowName,
    credentials,
    platformSetup,
  };
}

/**
 * Generate a .env.template file (masked values)
 */
export function generateEnvTemplate(manifest: CredentialManifest): string {
  let content = `# ============================================\n`;
  content += `# ${manifest.workflowName} - Environment Variables\n`;
  content += `# Generated: ${manifest.generatedAt}\n`;
  content += `# ============================================\n`;
  content += `# Replace masked values with your actual API keys.\n`;
  content += `# Get keys from the URLs listed next to each variable.\n`;
  content += `# ============================================\n\n`;

  const seen = new Set<string>();
  for (const cred of manifest.credentials) {
    if (seen.has(cred.envVar)) continue;
    seen.add(cred.envVar);
    
    content += `# ${cred.serviceName} - Used by: ${cred.nodeTitle}\n`;
    if (cred.helpUrl) content += `# Get your key: ${cred.helpUrl}\n`;
    content += `${cred.envVar}=REPLACE_WITH_YOUR_KEY\n\n`;
  }

  return content;
}

/**
 * Generate a credentials.json manifest (no raw values, safe to share)
 */
export function generateCredentialsJSON(manifest: CredentialManifest): string {
  return JSON.stringify({
    _comment: "Credential manifest - replace placeholder values with real keys",
    version: manifest.version,
    workflow: manifest.workflowName,
    generated: manifest.generatedAt,
    credentials: manifest.credentials.map(c => ({
      id: c.id,
      service: c.serviceName,
      envVar: c.envVar,
      usedInNode: c.nodeTitle,
      configField: c.configField,
      keyFormat: c.maskedValue,
      getKeyAt: c.helpUrl,
    })),
    platformSetup: manifest.platformSetup,
  }, null, 2);
}

/**
 * Generate a human-readable credential setup guide
 */
export function generateCredentialGuide(manifest: CredentialManifest): string {
  if (manifest.credentials.length === 0) {
    return `# Credential Setup Guide\n\nThis workflow does not use any API keys or credentials.\n`;
  }

  let md = `# 🔑 Credential Setup Guide\n\n`;
  md += `**Workflow:** ${manifest.workflowName}\n`;
  md += `**Generated:** ${new Date(manifest.generatedAt).toLocaleString()}\n`;
  md += `**Credentials Found:** ${manifest.credentials.length}\n\n`;

  md += `## Quick Overview\n\n`;
  md += `| Service | Environment Variable | Used In Node | Get Key |\n`;
  md += `|---------|---------------------|-------------|----------|\n`;
  
  const seen = new Set<string>();
  for (const cred of manifest.credentials) {
    if (seen.has(cred.envVar)) continue;
    seen.add(cred.envVar);
    md += `| ${cred.serviceName} | \`${cred.envVar}\` | ${cred.nodeTitle} | [Get Key](${cred.helpUrl || '#'}) |\n`;
  }
  md += `\n`;

  // Per-platform instructions
  md += `## Platform-Specific Setup\n\n`;
  
  const platformNames: Record<string, string> = {
    n8n: '🔧 n8n',
    make: '⚡ Make (Integromat)',
    zapier: '⚡ Zapier',
    python: '🐍 Python',
    typescript: '📘 TypeScript / Node.js',
    docker: '🐳 Docker',
    'github-actions': '🐙 GitHub Actions',
    'supabase-function': '⚡ Supabase Edge Functions',
  };

  for (const [platformId, setup] of Object.entries(manifest.platformSetup)) {
    if (setup.instructions.length === 0) continue;
    
    md += `### ${platformNames[platformId] || platformId}\n\n`;
    
    for (const inst of setup.instructions) {
      md += `**${inst.service}**\n`;
      md += `- Config path: \`${inst.path}\`\n`;
      md += `- ${inst.steps}\n\n`;
    }
  }

  md += `## .env Template\n\n`;
  md += `Copy this to your \`.env\` file and replace with your actual keys:\n\n`;
  md += `\`\`\`bash\n`;
  
  seen.clear();
  for (const cred of manifest.credentials) {
    if (seen.has(cred.envVar)) continue;
    seen.add(cred.envVar);
    md += `${cred.envVar}=REPLACE_WITH_YOUR_KEY\n`;
  }
  md += `\`\`\`\n\n`;

  md += `## ⚠️ Security Notes\n\n`;
  md += `- **Never commit** real API keys to version control\n`;
  md += `- Use \`.env\` files or platform-specific secret managers\n`;
  md += `- Rotate keys regularly and revoke unused ones\n`;
  md += `- Use the minimum required permissions/scopes for each key\n`;

  return md;
}
