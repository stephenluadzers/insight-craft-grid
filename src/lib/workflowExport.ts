/**
 * Business-Ready Workflow Export System
 * Exports FlowFuse workflows to multiple platforms and formats
 */

import { WorkflowNodeData } from "@/components/WorkflowNode";
import JSZip from "jszip";

export type ExportPlatform = 
  | 'n8n'
  | 'make'
  | 'zapier'
  | 'python'
  | 'typescript'
  | 'docker'
  | 'github-actions'
  | 'supabase-function'
  | 'standalone';

export interface ExportOptions {
  platform: ExportPlatform;
  includeCredentials?: boolean;
  includeDocs?: boolean;
  includeTests?: boolean;
  deploymentTarget?: 'cloud' | 'self-hosted' | 'hybrid';
}

// === n8n Export ===
function generateN8NWorkflow(nodes: WorkflowNodeData[], workflowName: string) {
  return {
    name: workflowName,
    nodes: nodes.map((node, index) => ({
      parameters: node.config || {},
      name: node.title,
      type: mapToN8NNodeType(node.type),
      typeVersion: 1,
      position: [node.x, node.y],
      id: node.id,
      ...(index > 0 && {
        webhookId: undefined,
      }),
    })),
    connections: nodes.slice(0, -1).reduce((acc, node, index) => {
      acc[node.id] = {
        main: [[{ node: nodes[index + 1].id, type: 'main', index: 0 }]]
      };
      return acc;
    }, {} as any),
    active: false,
    settings: {},
    versionId: "1",
  };
}

function mapToN8NNodeType(type: string): string {
  const typeMap: Record<string, string> = {
    trigger: 'n8n-nodes-base.webhook',
    action: 'n8n-nodes-base.httpRequest',
    condition: 'n8n-nodes-base.if',
    data: 'n8n-nodes-base.set',
    ai: 'n8n-nodes-base.openAi',
  };
  return typeMap[type] || 'n8n-nodes-base.noOp';
}

// === Make.com Export ===
function generateMakeScenario(nodes: WorkflowNodeData[], workflowName: string) {
  return {
    name: workflowName,
    flow: nodes.map((node, index) => ({
      id: index + 1,
      module: mapToMakeModule(node.type),
      version: 1,
      parameters: node.config || {},
      mapper: index > 0 ? { [index]: 1 } : {},
      metadata: {
        designer: {
          x: node.x,
          y: node.y
        },
        restore: {},
        expect: []
      }
    })),
    metadata: {
      version: 1,
      scenario: {
        roundtrips: 1,
        maxErrors: 3,
        autoCommit: true,
        autoCommitTriggerLast: true,
        sequential: false,
        confidential: false,
        dataloss: false,
        dlq: false
      },
      designer: {
        orphans: []
      }
    }
  };
}

function mapToMakeModule(type: string): string {
  const moduleMap: Record<string, string> = {
    trigger: 'gateway:CustomWebhook',
    action: 'http:ActionSendData',
    condition: 'builtin:BasicRouter',
    data: 'util:SetVariable2',
    ai: 'openai:CreateCompletion',
  };
  return moduleMap[type] || 'util:NoOp';
}

// === Python Standalone Export ===
function generatePythonScript(nodes: WorkflowNodeData[], workflowName: string) {
  return `#!/usr/bin/env python3
"""
${workflowName} - FlowFuse Workflow
Auto-generated Python implementation
"""

import os
import json
import requests
from typing import Dict, Any, Optional
from dataclasses import dataclass
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class WorkflowResult:
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class ${workflowName.replace(/[^a-zA-Z0-9]/g, '')}Workflow:
    """Automated workflow generated from FlowFuse"""
    
    def __init__(self):
        # Load credentials from environment
        self.config = {
            'openai_api_key': os.getenv('OPENAI_API_KEY'),
            'webhook_url': os.getenv('WEBHOOK_URL'),
            # Add other credentials as needed
        }
    
${nodes.map((node, idx) => generatePythonNodeFunction(node, idx)).join('\n\n')}
    
    def execute(self, input_data: Dict[str, Any]) -> WorkflowResult:
        """Execute the complete workflow"""
        logger.info("Starting workflow execution")
        context = {'input': input_data}
        
        try:
${nodes.map((node, idx) => `            # Step ${idx + 1}: ${node.title}
            result = self.${sanitizePythonName(node.title)}(context)
            if not result.success:
                return result
            context['step_${idx + 1}'] = result.data`).join('\n\n')}
            
            logger.info("Workflow completed successfully")
            return WorkflowResult(success=True, data=context)
            
        except Exception as e:
            logger.error(f"Workflow failed: {str(e)}")
            return WorkflowResult(success=False, error=str(e))

if __name__ == "__main__":
    # Example usage
    workflow = ${workflowName.replace(/[^a-zA-Z0-9]/g, '')}Workflow()
    
    # Sample input data
    input_data = {
        "sample": "data"
    }
    
    result = workflow.execute(input_data)
    
    if result.success:
        print("✓ Workflow completed successfully")
        print(json.dumps(result.data, indent=2))
    else:
        print(f"✗ Workflow failed: {result.error}")
        exit(1)
`;
}

function generatePythonNodeFunction(node: WorkflowNodeData, index: number): string {
  const funcName = sanitizePythonName(node.title);
  
  switch (node.type) {
    case 'trigger':
      return `    def ${funcName}(self, context: Dict[str, Any]) -> WorkflowResult:
        """${node.description}"""
        logger.info("Trigger: ${node.title}")
        # Webhook trigger - data comes from input
        return WorkflowResult(success=True, data=context.get('input'))`;
    
    case 'ai':
      return `    def ${funcName}(self, context: Dict[str, Any]) -> WorkflowResult:
        """${node.description}"""
        logger.info("AI Processing: ${node.title}")
        
        if not self.config.get('openai_api_key'):
            return WorkflowResult(success=False, error="OpenAI API key not configured")
        
        try:
            response = requests.post(
                'https://api.openai.com/v1/chat/completions',
                headers={'Authorization': f"Bearer {self.config['openai_api_key']}"},
                json={
                    'model': 'gpt-4',
                    'messages': [
                        {'role': 'system', 'content': 'You are a helpful assistant'},
                        {'role': 'user', 'content': str(context)}
                    ]
                }
            )
            response.raise_for_status()
            result = response.json()['choices'][0]['message']['content']
            return WorkflowResult(success=True, data={'ai_response': result})
        except Exception as e:
            return WorkflowResult(success=False, error=f"AI processing failed: {str(e)}")`;
    
    case 'action':
      return `    def ${funcName}(self, context: Dict[str, Any]) -> WorkflowResult:
        """${node.description}"""
        logger.info("Action: ${node.title}")
        
        try:
            # Perform action (customize based on your needs)
            response = requests.post(
                self.config.get('webhook_url', 'https://example.com/webhook'),
                json=context,
                timeout=30
            )
            response.raise_for_status()
            return WorkflowResult(success=True, data=response.json())
        except Exception as e:
            return WorkflowResult(success=False, error=f"Action failed: {str(e)}")`;
    
    case 'condition':
      return `    def ${funcName}(self, context: Dict[str, Any]) -> WorkflowResult:
        """${node.description}"""
        logger.info("Condition: ${node.title}")
        
        # Evaluate condition (customize logic)
        condition_met = True  # Replace with actual condition
        
        return WorkflowResult(success=True, data={'condition_met': condition_met})`;
    
    case 'data':
      return `    def ${funcName}(self, context: Dict[str, Any]) -> WorkflowResult:
        """${node.description}"""
        logger.info("Data Transform: ${node.title}")
        
        # Transform data (customize logic)
        transformed = context.copy()
        
        return WorkflowResult(success=True, data=transformed)`;
    
    default:
      return `    def ${funcName}(self, context: Dict[str, Any]) -> WorkflowResult:
        """${node.description}"""
        logger.info("Step: ${node.title}")
        return WorkflowResult(success=True, data=context)`;
  }
}

function sanitizePythonName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

// === TypeScript Standalone Export ===
function generateTypeScriptCode(nodes: WorkflowNodeData[], workflowName: string) {
  return `/**
 * ${workflowName} - FlowFuse Workflow
 * Auto-generated TypeScript implementation
 */

interface WorkflowResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

interface WorkflowContext {
  [key: string]: any;
}

export class ${workflowName.replace(/[^a-zA-Z0-9]/g, '')}Workflow {
  private config: Record<string, string>;

  constructor(config?: Record<string, string>) {
    this.config = config || {
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      webhookUrl: process.env.WEBHOOK_URL || '',
    };
  }

${nodes.map((node, idx) => generateTypeScriptNodeFunction(node, idx)).join('\n\n')}

  async execute(inputData: any): Promise<WorkflowResult> {
    console.log('🚀 Starting workflow execution');
    const context: WorkflowContext = { input: inputData };

    try {
${nodes.map((node, idx) => `      // Step ${idx + 1}: ${node.title}
      const result${idx} = await this.${sanitizeTypescriptName(node.title)}(context);
      if (!result${idx}.success) {
        return result${idx};
      }
      context.step_${idx + 1} = result${idx}.data;`).join('\n\n')}

      console.log('✅ Workflow completed successfully');
      return { success: true, data: context };

    } catch (error) {
      console.error('❌ Workflow failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Example usage
if (require.main === module) {
  const workflow = new ${workflowName.replace(/[^a-zA-Z0-9]/g, '')}Workflow();
  
  workflow.execute({ sample: 'data' })
    .then(result => {
      if (result.success) {
        console.log('Result:', JSON.stringify(result.data, null, 2));
      } else {
        console.error('Error:', result.error);
        process.exit(1);
      }
    });
}
`;
}

function generateTypeScriptNodeFunction(node: WorkflowNodeData, index: number): string {
  const funcName = sanitizeTypescriptName(node.title);
  
  switch (node.type) {
    case 'trigger':
      return `  private async ${funcName}(context: WorkflowContext): Promise<WorkflowResult> {
    console.log('📥 Trigger: ${node.title}');
    // ${node.description}
    return { success: true, data: context.input };
  }`;
    
    case 'ai':
      return `  private async ${funcName}(context: WorkflowContext): Promise<WorkflowResult> {
    console.log('🤖 AI Processing: ${node.title}');
    // ${node.description}
    
    if (!this.config.openaiApiKey) {
      return { success: false, error: 'OpenAI API key not configured' };
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${this.config.openaiApiKey}\`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'You are a helpful assistant' },
            { role: 'user', content: JSON.stringify(context) }
          ]
        })
      });

      const data = await response.json();
      return { success: true, data: { aiResponse: data.choices[0].message.content } };
    } catch (error) {
      return { success: false, error: \`AI processing failed: \${error}\` };
    }
  }`;
    
    case 'action':
      return `  private async ${funcName}(context: WorkflowContext): Promise<WorkflowResult> {
    console.log('⚡ Action: ${node.title}');
    // ${node.description}
    
    try {
      const response = await fetch(this.config.webhookUrl || 'https://example.com/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context)
      });

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: \`Action failed: \${error}\` };
    }
  }`;
    
    case 'condition':
      return `  private async ${funcName}(context: WorkflowContext): Promise<WorkflowResult> {
    console.log('🔀 Condition: ${node.title}');
    // ${node.description}
    
    const conditionMet = true; // Customize condition logic
    return { success: true, data: { conditionMet } };
  }`;
    
    case 'data':
      return `  private async ${funcName}(context: WorkflowContext): Promise<WorkflowResult> {
    console.log('🔄 Data Transform: ${node.title}');
    // ${node.description}
    
    const transformed = { ...context }; // Customize transformation
    return { success: true, data: transformed };
  }`;
    
    default:
      return `  private async ${funcName}(context: WorkflowContext): Promise<WorkflowResult> {
    console.log('📌 Step: ${node.title}');
    return { success: true, data: context };
  }`;
  }
}

function sanitizeTypescriptName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '').charAt(0).toLowerCase() + 
         name.replace(/[^a-zA-Z0-9]/g, '').slice(1);
}

// === Docker Export ===
function generateDockerfile(nodes: WorkflowNodeData[]) {
  const hasAI = nodes.some(n => n.type === 'ai');
  
  return `FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy workflow code
COPY workflow.py .

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Health check
HEALTHCHECK --interval=30s --timeout=3s \\
  CMD python -c "print('healthy')" || exit 1

# Run workflow
CMD ["python", "workflow.py"]
`;
}

function generateDockerCompose(workflowName: string) {
  return `version: '3.8'

services:
  workflow:
    build: .
    container_name: ${workflowName.toLowerCase().replace(/[^a-z0-9]/g, '-')}
    environment:
      - OPENAI_API_KEY=\${OPENAI_API_KEY}
      - WEBHOOK_URL=\${WEBHOOK_URL}
    restart: unless-stopped
    networks:
      - workflow-net

networks:
  workflow-net:
    driver: bridge
`;
}

// === GitHub Actions Export ===
function generateGitHubAction(nodes: WorkflowNodeData[], workflowName: string) {
  return `name: ${workflowName}

on:
  workflow_dispatch:
    inputs:
      input_data:
        description: 'Input data for workflow'
        required: true
        type: string
  schedule:
    - cron: '0 */6 * * *'  # Run every 6 hours

jobs:
  execute-workflow:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install requests
      
      - name: Execute workflow
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
          WEBHOOK_URL: \${{ secrets.WEBHOOK_URL }}
        run: |
          python workflow.py
      
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: workflow-results
          path: results.json
          retention-days: 30
`;
}

// === Main Export Function ===
export async function exportWorkflowForBusiness(
  nodes: WorkflowNodeData[],
  workflowName: string,
  options: ExportOptions
): Promise<Blob> {
  const zip = new JSZip();
  
  switch (options.platform) {
    case 'n8n':
      zip.file('workflow.json', JSON.stringify(generateN8NWorkflow(nodes, workflowName), null, 2));
      zip.file('README.md', generateN8NReadme(workflowName));
      break;
    
    case 'make':
      zip.file('scenario.json', JSON.stringify(generateMakeScenario(nodes, workflowName), null, 2));
      zip.file('README.md', generateMakeReadme(workflowName));
      break;
    
    case 'python':
      zip.file('workflow.py', generatePythonScript(nodes, workflowName));
      zip.file('requirements.txt', 'requests>=2.31.0\npython-dotenv>=1.0.0');
      zip.file('.env.example', generateEnvExample(nodes));
      zip.file('README.md', generatePythonReadme(workflowName));
      break;
    
    case 'typescript':
      zip.file('workflow.ts', generateTypeScriptCode(nodes, workflowName));
      zip.file('package.json', generatePackageJson(workflowName));
      zip.file('.env.example', generateEnvExample(nodes));
      zip.file('README.md', generateTypeScriptReadme(workflowName));
      break;
    
    case 'docker':
      zip.file('workflow.py', generatePythonScript(nodes, workflowName));
      zip.file('Dockerfile', generateDockerfile(nodes));
      zip.file('docker-compose.yml', generateDockerCompose(workflowName));
      zip.file('requirements.txt', 'requests>=2.31.0');
      zip.file('.env.example', generateEnvExample(nodes));
      zip.file('README.md', generateDockerReadme(workflowName));
      break;
    
    case 'github-actions':
      zip.file('workflow.py', generatePythonScript(nodes, workflowName));
      zip.file('.github/workflows/workflow.yml', generateGitHubAction(nodes, workflowName));
      zip.file('requirements.txt', 'requests>=2.31.0');
      zip.file('README.md', generateGitHubActionsReadme(workflowName));
      break;
    
    case 'supabase-function':
      zip.file('index.ts', generateSupabaseFunction(nodes, workflowName));
      zip.file('README.md', generateSupabaseFunctionReadme(workflowName));
      break;
  }
  
  // Always include workflow JSON
  zip.file('flowfuse-workflow.json', JSON.stringify({
    name: workflowName,
    version: '1.0.0',
    platform: 'FlowFuse',
    exportedAt: new Date().toISOString(),
    nodes: nodes
  }, null, 2));
  
  return await zip.generateAsync({ type: 'blob' });
}

// Helper functions for README generation
function generateN8NReadme(workflowName: string): string {
  return `# ${workflowName} - n8n Workflow

## Import Instructions

1. Open your n8n instance
2. Click "New Workflow"
3. Click the menu (⋮) → "Import from File"
4. Select \`workflow.json\`
5. Configure credentials for each node
6. Activate the workflow

## Configuration

Configure these credentials in n8n:
- Webhook credentials
- API keys for external services
- Database connections

## Testing

1. Trigger the webhook manually
2. Check execution history
3. Review node outputs

For support: https://flowfuse.ai/support
`;
}

function generateMakeReadme(workflowName: string): string {
  return `# ${workflowName} - Make.com Scenario

## Import Instructions

1. Log in to Make.com
2. Navigate to Scenarios
3. Click "Create a new scenario"
4. Click the menu (⋮) → "Import Blueprint"
5. Upload \`scenario.json\`
6. Configure connections for each module

## Configuration

Set up these connections:
- Custom Webhook
- HTTP requests
- External service APIs

## Activation

1. Review all modules
2. Test with sample data
3. Activate the scenario

For support: https://flowfuse.ai/support
`;
}

function generatePythonReadme(workflowName: string): string {
  return `# ${workflowName} - Python Workflow

## Setup

\`\`\`bash
# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run workflow
python workflow.py
\`\`\`

## Deployment Options

### Cloud Functions
- AWS Lambda
- Google Cloud Functions
- Azure Functions

### Cron Job
\`\`\`bash
# Add to crontab
0 */6 * * * cd /path/to/workflow && python workflow.py
\`\`\`

### Docker
\`\`\`bash
docker build -t ${workflowName.toLowerCase()} .
docker run --env-file .env ${workflowName.toLowerCase()}
\`\`\`

For support: https://flowfuse.ai/support
`;
}

function generateTypeScriptReadme(workflowName: string): string {
  return `# ${workflowName} - TypeScript Workflow

## Setup

\`\`\`bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run workflow
npm start
\`\`\`

## Deployment

This workflow can be deployed to:
- Vercel Serverless Functions
- AWS Lambda (Node.js runtime)
- Google Cloud Functions
- Self-hosted Node.js server

For support: https://flowfuse.ai/support
`;
}

function generateDockerReadme(workflowName: string): string {
  return `# ${workflowName} - Docker Deployment

## Quick Start

\`\`\`bash
# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
\`\`\`

## Production Deployment

Deploy to any container orchestration platform:
- Kubernetes
- Docker Swarm
- AWS ECS
- Google Cloud Run

For support: https://flowfuse.ai/support
`;
}

function generateGitHubActionsReadme(workflowName: string): string {
  return `# ${workflowName} - GitHub Actions

## Setup

1. Push this repository to GitHub
2. Go to Settings → Secrets and variables → Actions
3. Add secrets:
   - \`OPENAI_API_KEY\`
   - \`WEBHOOK_URL\`
   - (Add others as needed)

## Usage

### Manual Trigger
1. Go to Actions tab
2. Select "${workflowName}"
3. Click "Run workflow"
4. Enter input data

### Scheduled Execution
Workflow runs automatically every 6 hours (configurable in workflow.yml)

## Monitoring

View execution logs in the Actions tab.

For support: https://flowfuse.ai/support
`;
}

function generateSupabaseFunctionReadme(workflowName: string): string {
  return `# ${workflowName} - Supabase Edge Function

## Deployment

\`\`\`bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Deploy function
supabase functions deploy ${workflowName.toLowerCase().replace(/[^a-z0-9]/g, '-')}

# Set secrets
supabase secrets set OPENAI_API_KEY=your_key
\`\`\`

## Invoke

\`\`\`bash
curl -L -X POST 'https://your-project.supabase.co/functions/v1/${workflowName.toLowerCase().replace(/[^a-z0-9]/g, '-')}' \\
  -H 'Authorization: Bearer YOUR_ANON_KEY' \\
  -H 'Content-Type: application/json' \\
  --data '{"input": "your data"}'
\`\`\`

For support: https://flowfuse.ai/support
`;
}

function generateSupabaseFunction(nodes: WorkflowNodeData[], workflowName: string): string {
  return `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { input } = await req.json();
    console.log('🚀 Starting workflow execution');

    let context = { input };

${nodes.map((node, idx) => `    // Step ${idx + 1}: ${node.title}
    console.log('${node.title}');
    // TODO: Implement ${node.type} logic
    context.step_${idx + 1} = { success: true };`).join('\n\n')}

    console.log('✅ Workflow completed');
    return new Response(
      JSON.stringify({ success: true, data: context }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Workflow failed:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});`;
}

function generateEnvExample(nodes: WorkflowNodeData[]): string {
  const hasAI = nodes.some(n => n.type === 'ai');
  const hasActions = nodes.some(n => n.type === 'action');
  
  let env = '# Environment Variables\n\n';
  
  if (hasAI) {
    env += '# AI Services\nOPENAI_API_KEY=your_openai_key_here\n\n';
  }
  
  if (hasActions) {
    env += '# Integrations\nWEBHOOK_URL=https://your-webhook.com\n';
    env += 'API_KEY=your_api_key_here\n\n';
  }
  
  return env;
}

function generatePackageJson(workflowName: string): string {
  return JSON.stringify({
    name: workflowName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    version: '1.0.0',
    description: 'FlowFuse workflow',
    main: 'workflow.ts',
    scripts: {
      start: 'ts-node workflow.ts',
      build: 'tsc workflow.ts'
    },
    dependencies: {
      'dotenv': '^16.0.0'
    },
    devDependencies: {
      '@types/node': '^20.0.0',
      'ts-node': '^10.9.0',
      'typescript': '^5.0.0'
    }
  }, null, 2);
}
