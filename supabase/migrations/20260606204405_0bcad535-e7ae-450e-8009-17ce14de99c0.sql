
INSERT INTO public.integration_templates (name, category, icon, description, config_schema, is_active) VALUES
-- AI
('Anthropic Claude','ai','Brain','Chat, reasoning & tool-use with Claude','{"model":"","prompt":"","max_tokens":""}',true),
('Google Gemini','ai','Brain','Multimodal generation & vision','{"model":"","prompt":""}',true),
('Mistral','ai','Brain','Fast open-weight LLM completions','{"model":"","prompt":""}',true),
('Groq','ai','Brain','Ultra-low-latency LLM inference','{"model":"","prompt":""}',true),
('Perplexity','ai','Brain','Online LLM with live citations','{"prompt":""}',true),
('Cohere','ai','Brain','Embeddings, rerank, classify','{"endpoint":"","input":""}',true),
('Hugging Face','ai','Brain','Run any HF inference endpoint','{"model":"","input":""}',true),
('Replicate','ai','Brain','Run any open-source model','{"model_version":"","input":""}',true),
('Stability AI','ai','Brain','Text-to-image generation','{"prompt":""}',true),
('ElevenLabs','ai','Brain','Realistic text-to-speech','{"voice_id":"","text":""}',true),
('Whisper Transcribe','ai','Brain','Speech-to-text','{"audio_url":""}',true),
('Pinecone Vector','ai','Database','Vector DB upsert & query','{"index":"","operation":""}',true),
('Weaviate','ai','Database','Open-source vector database','{"class":"","operation":""}',true),
('Qdrant','ai','Database','Vector similarity search','{"collection":"","operation":""}',true),
('LangChain Agent','ai','Brain','Run a LangChain agent','{"agent":"","input":""}',true),
('RAG Retriever','ai','Brain','Retrieve docs for grounded answers','{"corpus":"","query":""}',true),

-- Communication
('SMS (Twilio)','communication','MessageSquare','Send SMS via Twilio','{"to":"","body":""}',true),
('WhatsApp','communication','MessageSquare','Send WhatsApp message','{"to":"","template":""}',true),
('Microsoft Teams','communication','MessageSquare','Post to Teams channel','{"webhook":"","message":""}',true),
('Zoom','communication','MessageSquare','Create meetings & webinars','{"topic":"","start_time":""}',true),
('Google Meet','communication','MessageSquare','Schedule a Meet','{"summary":"","start":""}',true),
('Mattermost','communication','MessageSquare','Self-hosted team chat','{"channel":"","text":""}',true),
('SendGrid','communication','Mail','Send transactional email','{"to":"","subject":"","html":""}',true),
('Mailgun','communication','Mail','Send email via Mailgun','{"to":"","subject":"","text":""}',true),
('Postmark','communication','Mail','Reliable transactional email','{"to":"","template":""}',true),
('Pushover','communication','MessageSquare','Push notifications','{"message":""}',true),
('Pushbullet','communication','MessageSquare','Cross-device push','{"title":"","body":""}',true),
('Signal','communication','MessageSquare','Send Signal message','{"to":"","body":""}',true),
('IMAP','communication','Mail','Read inbound email','{"folder":"INBOX"}',true),

-- CRM
('HubSpot','crm','Network','Contacts, deals, tickets','{"object":"","operation":""}',true),
('Salesforce','crm','Network','Leads, opportunities, accounts','{"sobject":"","operation":""}',true),
('Pipedrive','crm','Network','Sales pipeline ops','{"resource":"","operation":""}',true),
('Zoho CRM','crm','Network','Zoho contacts & deals','{"module":"","operation":""}',true),
('Copper','crm','Network','CRM for Google Workspace','{"resource":"","operation":""}',true),
('Close','crm','Network','Inside sales CRM','{"resource":"","operation":""}',true),
('Freshsales','crm','Network','Freshworks CRM','{"resource":"","operation":""}',true),
('Attio','crm','Network','Modern relationship CRM','{"object":"","operation":""}',true),
('Folk','crm','Network','Contact intelligence CRM','{"resource":"","operation":""}',true),

-- Marketing
('Mailchimp','marketing','Mail','Add/remove list members','{"list_id":"","email":""}',true),
('ConvertKit','marketing','Mail','Tag subscribers, broadcasts','{"form_id":"","email":""}',true),
('ActiveCampaign','marketing','Mail','Email & marketing automation','{"resource":"","operation":""}',true),
('Klaviyo','marketing','Mail','Ecommerce email & SMS','{"list_id":"","email":""}',true),
('Brevo','marketing','Mail','Email + SMS marketing','{"list_id":"","email":""}',true),
('Customer.io','marketing','Mail','Event-driven messaging','{"event":"","data":""}',true),
('Loops','marketing','Mail','Modern transactional email','{"event":"","email":""}',true),
('Beehiiv','marketing','Mail','Newsletter subscribers','{"publication_id":"","email":""}',true),
('Substack','marketing','Mail','Newsletter posts','{"publication":"","action":""}',true),

-- Productivity / Project
('Trello','productivity','Hash','Boards, lists, cards','{"board":"","operation":""}',true),
('Asana','productivity','Hash','Projects & tasks','{"project":"","operation":""}',true),
('Jira','productivity','Hash','Issues & sprints','{"project":"","operation":""}',true),
('Linear','productivity','Hash','Modern issue tracking','{"team":"","operation":""}',true),
('ClickUp','productivity','Hash','Tasks, docs, goals','{"list":"","operation":""}',true),
('Monday.com','productivity','Hash','Work OS boards','{"board":"","operation":""}',true),
('Basecamp','productivity','Hash','Projects & messaging','{"project":"","operation":""}',true),
('Todoist','productivity','Hash','Personal & team tasks','{"project":"","operation":""}',true),
('Height','productivity','Hash','AI project tracker','{"list":"","operation":""}',true),
('Shortcut','productivity','Hash','Eng project management','{"workflow":"","operation":""}',true),

-- Files / Storage
('Google Drive','files','FileText','Files & folders ops','{"operation":"","fileId":""}',true),
('Dropbox','files','FileText','File storage','{"operation":"","path":""}',true),
('OneDrive','files','FileText','Microsoft cloud storage','{"operation":"","path":""}',true),
('Box','files','FileText','Enterprise file storage','{"operation":"","item_id":""}',true),
('AWS S3','files','Database','S3 bucket operations','{"bucket":"","operation":""}',true),
('Cloudflare R2','files','Database','S3-compatible R2 storage','{"bucket":"","operation":""}',true),
('Backblaze B2','files','Database','Affordable cloud storage','{"bucket":"","operation":""}',true),
('Cloudinary','files','FileText','Image & video CDN','{"operation":"","public_id":""}',true),
('Uploadcare','files','FileText','File upload & processing','{"operation":""}',true),

-- Documents
('Google Docs','files','FileText','Create & edit Google Docs','{"document_id":"","operation":""}',true),
('Microsoft Word','files','FileText','Word document ops','{"file_id":"","operation":""}',true),
('PDF Generate','files','FileText','Generate PDF from HTML/template','{"template":"","data":""}',true),
('PDF Extract','files','FileText','OCR & extract text from PDFs','{"file_url":""}',true),
('Google Slides','files','FileText','Build slide decks','{"presentation_id":"","operation":""}',true),
('Notion Database','data','Database','Query/write Notion DB rows','{"database_id":"","operation":""}',true),
('Coda','productivity','FileText','Coda doc tables','{"doc_id":"","table":""}',true),

-- Devtools
('GitHub','devtools','Code','Repos, issues, PRs','{"repo":"","operation":""}',true),
('GitLab','devtools','Code','Projects, issues, MRs','{"project_id":"","operation":""}',true),
('Bitbucket','devtools','Code','Atlassian git hosting','{"repo":"","operation":""}',true),
('Vercel','devtools','Globe','Deploy & manage projects','{"project":"","operation":""}',true),
('Netlify','devtools','Globe','Static site deploys','{"site_id":"","operation":""}',true),
('Cloudflare','devtools','Globe','DNS, Workers, KV','{"zone":"","operation":""}',true),
('AWS Lambda','devtools','Code','Invoke a Lambda function','{"function_name":"","payload":""}',true),
('Docker Hub','devtools','Code','Trigger image builds','{"repo":"","operation":""}',true),
('Sentry','monitoring','Network','Errors & releases','{"project":"","operation":""}',true),
('Datadog','monitoring','Network','Metrics, logs, traces','{"resource":"","operation":""}',true),
('New Relic','monitoring','Network','APM & observability','{"resource":"","operation":""}',true),
('PagerDuty','monitoring','Network','Incident on-call','{"service":"","operation":""}',true),
('Opsgenie','monitoring','Network','Alerting & on-call','{"team":"","operation":""}',true),
('Statuspage','monitoring','Network','Public status pages','{"page_id":"","operation":""}',true),
('Better Stack','monitoring','Network','Uptime + logs','{"monitor":"","operation":""}',true),

-- Ecommerce
('Shopify','ecommerce','Hash','Products, orders, customers','{"resource":"","operation":""}',true),
('WooCommerce','ecommerce','Hash','WP store ops','{"resource":"","operation":""}',true),
('BigCommerce','ecommerce','Hash','Store catalog & orders','{"resource":"","operation":""}',true),
('Square','ecommerce','Hash','POS & payments','{"resource":"","operation":""}',true),
('Etsy','ecommerce','Hash','Listings & receipts','{"resource":"","operation":""}',true),

-- Payments / Finance
('Stripe','payments','Hash','Charges, customers, subscriptions','{"resource":"","operation":""}',true),
('PayPal','payments','Hash','Payments & invoices','{"resource":"","operation":""}',true),
('Paddle','payments','Hash','Merchant of record billing','{"resource":"","operation":""}',true),
('Lemon Squeezy','payments','Hash','Digital product checkout','{"resource":"","operation":""}',true),
('Plaid','finance','Hash','Bank data & ACH','{"endpoint":""}',true),
('QuickBooks','finance','Hash','Accounting ops','{"entity":"","operation":""}',true),
('Xero','finance','Hash','Accounting ops','{"entity":"","operation":""}',true),
('Wise','finance','Hash','Cross-border transfers','{"endpoint":""}',true),

-- Analytics
('Google Analytics','analytics','Network','GA4 reports','{"property_id":"","metrics":""}',true),
('Mixpanel','analytics','Network','Event analytics','{"event":"","properties":""}',true),
('Amplitude','analytics','Network','Product analytics','{"event":"","properties":""}',true),
('PostHog','analytics','Network','Open-source product analytics','{"event":"","properties":""}',true),
('Segment','analytics','Network','Customer data routing','{"event":"","traits":""}',true),
('Plausible','analytics','Network','Privacy-friendly web stats','{"site_id":""}',true),

-- Social
('Twitter / X','social','MessageSquare','Post & search tweets','{"action":"","text":""}',true),
('LinkedIn','social','MessageSquare','Posts & messaging','{"action":"","text":""}',true),
('Facebook Pages','social','MessageSquare','Publish to Page','{"page_id":"","message":""}',true),
('Instagram','social','MessageSquare','Publish media','{"account_id":"","media":""}',true),
('YouTube','social','MessageSquare','Videos, comments, analytics','{"resource":"","operation":""}',true),
('TikTok','social','MessageSquare','Posts & insights','{"resource":"","operation":""}',true),
('Reddit','social','MessageSquare','Posts & comments','{"subreddit":"","action":""}',true),
('Mastodon','social','MessageSquare','Federated toots','{"action":"","text":""}',true),
('Bluesky','social','MessageSquare','AT Protocol posts','{"action":"","text":""}',true),
('Threads','social','MessageSquare','Meta Threads posts','{"action":"","text":""}',true),

-- Calendar / Scheduling
('Google Calendar','calendar','Clock','Events on Google Cal','{"calendar_id":"","operation":""}',true),
('Outlook Calendar','calendar','Clock','Microsoft 365 calendar','{"calendar":"","operation":""}',true),
('Calendly','calendar','Clock','Booked events webhook','{"event":""}',true),
('Cal.com','calendar','Clock','Open scheduling','{"event":""}',true),
('Savvycal','calendar','Clock','Group scheduling','{"event":""}',true),
('Schedule (Cron)','utility','Timer','Run on a cron schedule','{"cron":"0 * * * *"}',true),

-- Forms
('Typeform','forms','FileText','Form submissions','{"form_id":""}',true),
('Tally','forms','FileText','Free unlimited forms','{"form_id":""}',true),
('Jotform','forms','FileText','Forms & PDFs','{"form_id":""}',true),
('Google Forms','forms','FileText','Forms responses','{"form_id":""}',true),
('Fillout','forms','FileText','Advanced form builder','{"form_id":""}',true),

-- Support
('Zendesk','support','MessageSquare','Tickets & users','{"resource":"","operation":""}',true),
('Intercom','support','MessageSquare','Conversations & contacts','{"resource":"","operation":""}',true),
('Freshdesk','support','MessageSquare','Support tickets','{"resource":"","operation":""}',true),
('Help Scout','support','MessageSquare','Conversations & mailboxes','{"resource":"","operation":""}',true),
('Front','support','MessageSquare','Shared inbox','{"resource":"","operation":""}',true),
('Crisp','support','MessageSquare','Live chat & inbox','{"resource":"","operation":""}',true),

-- HR
('BambooHR','hr','Network','Employees & PTO','{"resource":"","operation":""}',true),
('Gusto','hr','Network','Payroll & people','{"resource":"","operation":""}',true),
('Workday','hr','Network','HCM & finance','{"resource":"","operation":""}',true),
('Greenhouse','hr','Network','ATS candidates & jobs','{"resource":"","operation":""}',true),
('Ashby','hr','Network','Modern ATS','{"resource":"","operation":""}',true),

-- Database
('PostgreSQL','data','Database','Query/update Postgres','{"query":""}',true),
('MySQL','data','Database','Query/update MySQL','{"query":""}',true),
('MongoDB','data','Database','Mongo collections','{"collection":"","operation":""}',true),
('Redis','data','Database','Key-value & queues','{"command":"","args":""}',true),
('Supabase','data','Database','Postgres + auth + storage','{"table":"","operation":""}',true),
('Firebase','data','Database','Firestore & RTDB','{"path":"","operation":""}',true),
('Airtable Advanced','data','Database','Advanced base operations','{"base_id":"","table":"","operation":""}',true),

-- Search / Web
('Google Search','search','Search','Web search results','{"query":""}',true),
('Bing Search','search','Search','Bing web/news search','{"query":""}',true),
('Brave Search','search','Search','Privacy search API','{"query":""}',true),
('SerpAPI','search','Search','Structured SERP data','{"engine":"","q":""}',true),
('Algolia','search','Search','Hosted search index','{"index":"","operation":""}',true),
('Meilisearch','search','Search','Open-source search','{"index":"","operation":""}',true),

-- Scrape / Browser
('Firecrawl','data','Globe','LLM-ready web scrape','{"url":""}',true),
('Apify','data','Globe','Run web scrapers','{"actor_id":"","input":""}',true),
('Browserless','data','Globe','Headless Chrome jobs','{"function":"","payload":""}',true),
('ScrapingBee','data','Globe','Proxied scraping','{"url":""}',true),
('Puppeteer','data','Globe','Headless browser script','{"script":""}',true),

-- Maps / Geo
('Google Maps','utility','Globe','Geocoding & places','{"endpoint":"","query":""}',true),
('Mapbox','utility','Globe','Maps & directions','{"endpoint":"","query":""}',true),

-- Security
('1Password','security','Settings','Secrets vault read','{"vault":"","item":""}',true),
('Vault','security','Settings','HashiCorp secrets','{"path":""}',true),
('Auth0','security','Settings','Identity & users','{"resource":"","operation":""}',true),
('Clerk','security','Settings','Auth & user mgmt','{"resource":"","operation":""}',true),

-- Triggers / Flow control
('Manual Trigger','trigger','Send','Run manually from canvas','{}',true),
('Schedule Trigger','trigger','Timer','Run on cron','{"cron":""}',true),
('Webhook Trigger','trigger','Webhook','HTTP endpoint trigger','{"path":""}',true),
('Email Trigger','trigger','Mail','Run on inbound email','{"mailbox":""}',true),
('Form Trigger','trigger','FileText','Run on form submit','{"form_id":""}',true),
('Chat Trigger','trigger','MessageSquare','Run on chat message','{"channel":""}',true),
('File Trigger','trigger','FileText','Run on file upload','{"folder":""}',true),

-- Logic / Flow
('Loop Over Items','logic','RefreshCw','Iterate over array','{"items":""}',true),
('Aggregate','logic','Merge','Combine results','{"strategy":""}',true),
('Filter','logic','Split','Filter items by rule','{"rule":""}',true),
('Sort','logic','Split','Sort items','{"field":"","order":""}',true),
('Limit','logic','Split','Take first N items','{"n":""}',true),
('Try / Catch','logic','GitBranch','Catch errors gracefully','{}',true),
('Sub-Workflow','logic','Network','Execute another workflow','{"workflow_id":""}',true),
('Human Approval','logic','GitBranch','Wait for human OK','{"channel":""}',true),

-- Utility
('Crypto','utility','Settings','Hash, HMAC, encrypt','{"algorithm":"","input":""}',true),
('Date/Time','utility','Clock','Parse, format, math','{"operation":""}',true),
('Markdown','utility','FileText','Render or parse markdown','{"input":""}',true),
('HTML to Text','utility','FileText','Strip HTML','{"input":""}',true),
('CSV Parse','utility','FileText','Parse CSV to JSON','{"input":""}',true),
('JSON Tools','utility','Code','Parse/stringify/jq query','{"operation":"","input":""}',true),
('Compression','utility','FileText','Zip/Gzip files','{"operation":"","input":""}',true)
ON CONFLICT (name) DO UPDATE
SET category = EXCLUDED.category,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    config_schema = EXCLUDED.config_schema,
    is_active = true;
