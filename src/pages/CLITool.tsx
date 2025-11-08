import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Terminal, Copy, Download, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CLITool() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("install");

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied",
      description: "Code copied to clipboard"
    });
  };

  const cliPackageJson = `{
  "name": "workflow-cli",
  "version": "1.0.0",
  "description": "CLI tool for Workflow Automation Platform",
  "bin": {
    "workflow": "./bin/workflow.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "commander": "^11.1.0",
    "axios": "^1.6.0",
    "chalk": "^5.3.0",
    "inquirer": "^9.2.12",
    "ora": "^7.0.1",
    "conf": "^12.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0"
  }
}`;

  const cliIndexCode = `#!/usr/bin/env node

import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import Conf from 'conf';

const config = new Conf({ projectName: 'workflow-cli' });
const API_BASE = '${import.meta.env.VITE_SUPABASE_URL}/functions/v1';

const program = new Command();

program
  .name('workflow')
  .description('CLI tool for Workflow Automation Platform')
  .version('1.0.0');

// Login command
program
  .command('login')
  .description('Authenticate with API key')
  .action(async () => {
    const { apiKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your API key:',
        mask: '*'
      }
    ]);

    config.set('apiKey', apiKey);
    console.log(chalk.green('✓ Successfully authenticated!'));
  });

// List workflows command
program
  .command('list')
  .description('List all workflows')
  .action(async () => {
    const apiKey = config.get('apiKey');
    if (!apiKey) {
      console.log(chalk.red('✗ Not authenticated. Run: workflow login'));
      return;
    }

    const spinner = ora('Fetching workflows...').start();

    try {
      const response = await axios.get(\`\${API_BASE}/api-workflows\`, {
        headers: { 'X-API-Key': apiKey }
      });

      spinner.succeed('Workflows loaded');

      const workflows = response.data.data;
      console.log(\`\\n\${chalk.bold('Workflows:')}\`);
      workflows.forEach((wf: any) => {
        console.log(\`  \${chalk.cyan(wf.id)} - \${wf.name} (\${wf.status})\`);
      });
    } catch (error: any) {
      spinner.fail('Failed to fetch workflows');
      console.log(chalk.red(\`Error: \${error.response?.data?.error || error.message}\`));
    }
  });

// Deploy workflow command
program
  .command('deploy <file>')
  .description('Deploy workflow from JSON file')
  .action(async (file: string) => {
    const apiKey = config.get('apiKey');
    if (!apiKey) {
      console.log(chalk.red('✗ Not authenticated. Run: workflow login'));
      return;
    }

    const spinner = ora('Deploying workflow...').start();

    try {
      const fs = await import('fs/promises');
      const workflow = JSON.parse(await fs.readFile(file, 'utf-8'));

      const response = await axios.post(
        \`\${API_BASE}/api-workflows\`,
        workflow,
        { headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' } }
      );

      spinner.succeed(\`Workflow deployed: \${response.data.data.id}\`);
    } catch (error: any) {
      spinner.fail('Deployment failed');
      console.log(chalk.red(\`Error: \${error.response?.data?.error || error.message}\`));
    }
  });

// Execute workflow command
program
  .command('execute <workflow-id>')
  .description('Execute a workflow')
  .option('-d, --data <json>', 'Input data as JSON')
  .action(async (workflowId: string, options: any) => {
    const apiKey = config.get('apiKey');
    if (!apiKey) {
      console.log(chalk.red('✗ Not authenticated. Run: workflow login'));
      return;
    }

    const spinner = ora('Executing workflow...').start();

    try {
      const inputData = options.data ? JSON.parse(options.data) : {};
      
      const response = await axios.post(
        \`\${API_BASE}/api-execute\`,
        { workflow_id: workflowId, input_data: inputData },
        { headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' } }
      );

      spinner.succeed('Workflow executed');
      console.log(chalk.green(\`Execution ID: \${response.data.data.id}\`));
      console.log(chalk.green(\`Status: \${response.data.data.status}\`));
    } catch (error: any) {
      spinner.fail('Execution failed');
      console.log(chalk.red(\`Error: \${error.response?.data?.error || error.message}\`));
    }
  });

// Logout command
program
  .command('logout')
  .description('Remove stored credentials')
  .action(() => {
    config.delete('apiKey');
    console.log(chalk.green('✓ Logged out successfully'));
  });

program.parse();`;

  const installSteps = [
    { step: "1", title: "Create a new directory", command: "mkdir workflow-cli && cd workflow-cli" },
    { step: "2", title: "Initialize npm package", command: "npm init -y" },
    { step: "3", title: "Install dependencies", command: "npm install commander axios chalk inquirer ora conf" },
    { step: "4", title: "Install dev dependencies", command: "npm install -D @types/node typescript" },
    { step: "5", title: "Create TypeScript config", command: "npx tsc --init" },
    { step: "6", title: "Copy the CLI code to src/index.ts" },
    { step: "7", title: "Build the CLI", command: "npm run build" },
    { step: "8", title: "Link globally (optional)", command: "npm link" }
  ];

  const usageExamples = [
    {
      title: "Login",
      command: "workflow login",
      description: "Authenticate with your API key"
    },
    {
      title: "List Workflows",
      command: "workflow list",
      description: "View all workflows in your workspace"
    },
    {
      title: "Deploy Workflow",
      command: "workflow deploy workflow.json",
      description: "Deploy a workflow from a JSON file"
    },
    {
      title: "Execute Workflow",
      command: "workflow execute <workflow-id> --data '{\"key\":\"value\"}'",
      description: "Execute a workflow with custom input data"
    },
    {
      title: "Logout",
      command: "workflow logout",
      description: "Remove stored credentials"
    }
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center px-6 gap-4">
            <SidebarTrigger />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Workflows
            </Button>
          </header>

          <div className="flex-1 overflow-auto p-6">
            <div className="container mx-auto max-w-7xl">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <Terminal className="w-8 h-8" />
                  <h1 className="text-4xl font-bold">CLI Tool</h1>
                  <Badge>Phase 2 Complete</Badge>
                </div>
                <p className="text-muted-foreground">
                  Command-line interface for workflow management
                </p>
              </div>

              <Alert className="mb-6">
                <CheckCircle className="w-4 h-4" />
                <AlertDescription>
                  The CLI tool connects to your API endpoints and requires an API key. Generate one from the API Keys page first.
                </AlertDescription>
              </Alert>

              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="install">Installation</TabsTrigger>
                  <TabsTrigger value="code">Source Code</TabsTrigger>
                  <TabsTrigger value="usage">Usage</TabsTrigger>
                  <TabsTrigger value="examples">Examples</TabsTrigger>
                </TabsList>

                <TabsContent value="install">
                  <Card>
                    <CardHeader>
                      <CardTitle>Installation Steps</CardTitle>
                      <CardDescription>
                        Set up the CLI tool on your local machine
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {installSteps.map((item) => (
                        <div key={item.step} className="flex gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                            {item.step}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium mb-2">{item.title}</p>
                            {item.command && (
                              <div className="relative">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="absolute top-2 right-2 z-10"
                                  onClick={() => copyCode(item.command)}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                                <pre className="p-4 bg-muted rounded text-sm overflow-x-auto">
                                  <code>{item.command}</code>
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      <div className="pt-4 border-t">
                        <Button onClick={() => setSelectedTab("code")} className="gap-2">
                          <Download className="w-4 h-4" />
                          View Source Code
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="code" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>package.json</CardTitle>
                          <CardDescription>NPM package configuration</CardDescription>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyCode(cliPackageJson)}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <pre className="p-4 bg-muted rounded text-sm overflow-x-auto">
                        <code>{cliPackageJson}</code>
                      </pre>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>src/index.ts</CardTitle>
                          <CardDescription>Main CLI implementation</CardDescription>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyCode(cliIndexCode)}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <pre className="p-4 bg-muted rounded text-sm overflow-x-auto max-h-[600px]">
                        <code>{cliIndexCode}</code>
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="usage">
                  <Card>
                    <CardHeader>
                      <CardTitle>Available Commands</CardTitle>
                      <CardDescription>
                        Complete list of CLI commands and their usage
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {usageExamples.map((example, idx) => (
                          <div key={idx} className="border-b last:border-0 pb-4 last:pb-0">
                            <h3 className="font-semibold mb-2">{example.title}</h3>
                            <p className="text-sm text-muted-foreground mb-3">
                              {example.description}
                            </p>
                            <div className="relative">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="absolute top-2 right-2"
                                onClick={() => copyCode(example.command)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <pre className="p-4 bg-muted rounded text-sm overflow-x-auto">
                                <code>$ {example.command}</code>
                              </pre>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="examples">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Workflow Deployment Example</CardTitle>
                        <CardDescription>
                          Example workflow.json file for deployment
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <pre className="p-4 bg-muted rounded text-sm overflow-x-auto">
{`{
  "name": "Email Notification Workflow",
  "description": "Send notifications on form submission",
  "nodes": [
    {
      "id": "1",
      "type": "trigger",
      "title": "Form Submitted",
      "x": 100,
      "y": 100
    },
    {
      "id": "2",
      "type": "action",
      "title": "Send Email",
      "x": 100,
      "y": 280
    }
  ],
  "connections": []
}`}
                        </pre>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Complete Workflow</CardTitle>
                        <CardDescription>
                          Typical CLI workflow from start to finish
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <pre className="p-4 bg-muted rounded text-sm overflow-x-auto">
{`# 1. Login with your API key
$ workflow login
? Enter your API key: ************************************
✓ Successfully authenticated!

# 2. List existing workflows
$ workflow list
⠋ Fetching workflows...
✓ Workflows loaded

Workflows:
  abc-123 - Email Automation (active)
  def-456 - Data Sync (draft)
  ghi-789 - Notification System (active)

# 3. Deploy a new workflow
$ workflow deploy workflow.json
⠋ Deploying workflow...
✓ Workflow deployed: jkl-012

# 4. Execute a workflow
$ workflow execute jkl-012 --data '{"email":"user@example.com"}'
⠋ Executing workflow...
✓ Workflow executed
Execution ID: exec-xyz-789
Status: completed

# 5. Logout when done
$ workflow logout
✓ Logged out successfully`}
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>

              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>Next Steps</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p>✅ CLI tool complete with authentication & workflow management</p>
                  <p>✅ Deploy, execute, and manage workflows from terminal</p>
                  <p>✅ Secure credential storage with config file</p>
                  <p>✅ Colored output & loading spinners for better UX</p>
                  <div className="pt-4 flex gap-4">
                    <Button onClick={() => navigate("/api-keys")}>
                      Generate API Key
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/api-docs")}>
                      View API Docs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
