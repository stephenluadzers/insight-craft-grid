-- Add missing essential automation nodes (excluding already existing ones)

INSERT INTO public.integration_templates (name, category, icon, description, config_schema) VALUES
-- Data Manipulation
('Set', 'data', 'Settings', 'Set or modify data fields in your workflow', '{"values": {}, "keepOnlySet": false}'),
('Merge', 'data', 'Merge', 'Combine data from multiple branches', '{"mode": "append", "mergeByFields": []}'),
('Split In Batches', 'data', 'Split', 'Process large datasets in smaller chunks', '{"batchSize": 10, "options": {}}'),

-- Logic & Control Flow
('Function', 'logic', 'Code', 'Execute custom JavaScript code for complex logic', '{"functionCode": "// Your code here\nreturn items;"}'),
('IF', 'condition', 'GitBranch', 'Simple conditional branching - true/false paths', '{"conditions": {"boolean": [], "number": [], "string": []}}'),
('Switch', 'condition', 'Network', 'Route to different paths based on multiple values', '{"mode": "rules", "rules": {}}'),
('Wait', 'utility', 'Timer', 'Pause workflow execution for a specified duration', '{"amount": 1, "unit": "seconds"}'),
('Execute Command', 'action', 'Terminal', 'Run shell commands on the server', '{"command": "", "cwd": ""}'),

-- Communication Platforms
('Email Send (SMTP)', 'communication', 'Mail', 'Send emails via SMTP server', '{"fromEmail": "", "toEmail": "", "subject": "", "text": "", "html": "", "smtpHost": "", "smtpPort": 587}'),
('Telegram', 'communication', 'Send', 'Send messages via Telegram bot', '{"chatId": "", "text": "", "botToken": ""}'),
('Discord', 'communication', 'Hash', 'Automate Discord server interactions', '{"webhookUrl": "", "content": "", "username": ""}'),

-- Data Sources & External Services
('Google Sheets', 'data', 'Sheet', 'Read and write data to Google Sheets', '{"operation": "append", "sheetId": "", "range": "", "credentials": ""}'),
('Notion', 'data', 'FileText', 'Interact with Notion databases and pages', '{"resource": "database", "operation": "getAll", "databaseId": "", "apiKey": ""}'),
('Airtable', 'data', 'Database', 'CRUD operations on Airtable bases', '{"operation": "list", "baseId": "", "tableId": "", "apiKey": ""}');