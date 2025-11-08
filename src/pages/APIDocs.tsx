import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Code, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function APIDocs() {
  const { toast } = useToast();
  const [selectedEndpoint, setSelectedEndpoint] = useState("workflows");

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied",
      description: "Code copied to clipboard"
    });
  };

  const endpoints = [
    {
      id: "workflows",
      name: "Workflows",
      endpoints: [
        {
          method: "GET",
          path: "/api-workflows",
          description: "List all workflows in your workspace",
          example: `curl -X GET "${baseUrl}/api-workflows" \\
  -H "X-API-Key: wfapi_your_key_here"`
        },
        {
          method: "GET",
          path: "/api-workflows/:id",
          description: "Get a specific workflow by ID",
          example: `curl -X GET "${baseUrl}/api-workflows/workflow-id-here" \\
  -H "X-API-Key: wfapi_your_key_here"`
        },
        {
          method: "POST",
          path: "/api-workflows",
          description: "Create a new workflow",
          example: `curl -X POST "${baseUrl}/api-workflows" \\
  -H "X-API-Key: wfapi_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My Workflow",
    "description": "Automated workflow",
    "nodes": [],
    "connections": []
  }'`
        },
        {
          method: "PUT",
          path: "/api-workflows/:id",
          description: "Update an existing workflow",
          example: `curl -X PUT "${baseUrl}/api-workflows/workflow-id-here" \\
  -H "X-API-Key: wfapi_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Updated Workflow Name",
    "status": "active"
  }'`
        },
        {
          method: "DELETE",
          path: "/api-workflows/:id",
          description: "Delete a workflow",
          example: `curl -X DELETE "${baseUrl}/api-workflows/workflow-id-here" \\
  -H "X-API-Key: wfapi_your_key_here"`
        }
      ]
    },
    {
      id: "execute",
      name: "Execute",
      endpoints: [
        {
          method: "POST",
          path: "/api-execute",
          description: "Execute a workflow with custom input data",
          example: `curl -X POST "${baseUrl}/api-execute" \\
  -H "X-API-Key: wfapi_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "workflow_id": "workflow-id-here",
    "input_data": {
      "email": "user@example.com",
      "data": "Custom data"
    }
  }'`
        }
      ]
    },
    {
      id: "analytics",
      name: "Analytics",
      endpoints: [
        {
          method: "GET",
          path: "/api-analytics",
          description: "Get analytics for workflows or API usage",
          example: `curl -X GET "${baseUrl}/api-analytics?days=7&workflow_id=optional-workflow-id" \\
  -H "X-API-Key: wfapi_your_key_here"`
        }
      ]
    }
  ];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">API Documentation</h1>
        <p className="text-muted-foreground">
          Complete REST API reference for programmatic workflow management
        </p>
      </div>

      <div className="grid gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>How to use the Workflow API</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Base URL</h3>
              <code className="block p-3 bg-muted rounded text-sm">
                {baseUrl}
              </code>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Authentication</h3>
              <p className="text-sm text-muted-foreground mb-2">
                All API requests require an API key passed in the X-API-Key header:
              </p>
              <code className="block p-3 bg-muted rounded text-sm">
                X-API-Key: wfapi_your_key_here
              </code>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Rate Limits</h3>
              <p className="text-sm text-muted-foreground">
                • 1000 requests per hour per API key<br />
                • Rate limit resets at the top of each hour<br />
                • 429 status code returned when limit exceeded
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Response Format</h3>
              <p className="text-sm text-muted-foreground mb-2">
                All responses are in JSON format:
              </p>
              <pre className="p-3 bg-muted rounded text-sm overflow-x-auto">
{`{
  "data": { /* response data */ },
  "error": null
}

// Or on error:
{
  "data": null,
  "error": "Error message"
}`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedEndpoint} onValueChange={setSelectedEndpoint}>
        <TabsList className="mb-4">
          {endpoints.map(category => (
            <TabsTrigger key={category.id} value={category.id}>
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {endpoints.map(category => (
          <TabsContent key={category.id} value={category.id}>
            <div className="space-y-6">
              {category.endpoints.map((endpoint, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={
                          endpoint.method === 'GET' ? 'secondary' :
                          endpoint.method === 'POST' ? 'default' :
                          endpoint.method === 'PUT' ? 'outline' :
                          'destructive'
                        }
                      >
                        {endpoint.method}
                      </Badge>
                      <code className="text-sm">{endpoint.path}</code>
                    </div>
                    <CardDescription className="mt-2">
                      {endpoint.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-2 right-2"
                        onClick={() => copyCode(endpoint.example)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <pre className="p-4 bg-muted rounded text-sm overflow-x-auto">
                        <code>{endpoint.example}</code>
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            SDK Examples
          </CardTitle>
          <CardDescription>
            Code examples in different languages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="javascript">
            <TabsList>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="go">Go</TabsTrigger>
            </TabsList>

            <TabsContent value="javascript" className="mt-4">
              <pre className="p-4 bg-muted rounded text-sm overflow-x-auto">
{`// List workflows
const response = await fetch('${baseUrl}/api-workflows', {
  headers: {
    'X-API-Key': 'wfapi_your_key_here'
  }
});
const data = await response.json();
console.log(data);

// Execute workflow
const execution = await fetch('${baseUrl}/api-execute', {
  method: 'POST',
  headers: {
    'X-API-Key': 'wfapi_your_key_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    workflow_id: 'workflow-id',
    input_data: { key: 'value' }
  })
});`}
              </pre>
            </TabsContent>

            <TabsContent value="python" className="mt-4">
              <pre className="p-4 bg-muted rounded text-sm overflow-x-auto">
{`import requests

# List workflows
response = requests.get(
    '${baseUrl}/api-workflows',
    headers={'X-API-Key': 'wfapi_your_key_here'}
)
data = response.json()
print(data)

# Execute workflow
execution = requests.post(
    '${baseUrl}/api-execute',
    headers={
        'X-API-Key': 'wfapi_your_key_here',
        'Content-Type': 'application/json'
    },
    json={
        'workflow_id': 'workflow-id',
        'input_data': {'key': 'value'}
    }
)`}
              </pre>
            </TabsContent>

            <TabsContent value="go" className="mt-4">
              <pre className="p-4 bg-muted rounded text-sm overflow-x-auto">
{`package main

import (
    "bytes"
    "encoding/json"
    "net/http"
)

func main() {
    // List workflows
    req, _ := http.NewRequest("GET", 
        "${baseUrl}/api-workflows", nil)
    req.Header.Set("X-API-Key", "wfapi_your_key_here")
    
    client := &http.Client{}
    resp, _ := client.Do(req)
    defer resp.Body.Close()
    
    // Execute workflow
    payload := map[string]interface{}{
        "workflow_id": "workflow-id",
        "input_data": map[string]string{"key": "value"},
    }
    jsonData, _ := json.Marshal(payload)
    
    req2, _ := http.NewRequest("POST",
        "${baseUrl}/api-execute",
        bytes.NewBuffer(jsonData))
    req2.Header.Set("X-API-Key", "wfapi_your_key_here")
    req2.Header.Set("Content-Type", "application/json")
    
    resp2, _ := client.Do(req2)
    defer resp2.Body.Close()
}`}
              </pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
