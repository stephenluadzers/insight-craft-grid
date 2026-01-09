# FlowFuse: AI-Powered Workflow Automation Platform

## Master Prompt for IDE Integration

---

## 🎯 Project Overview

Build **FlowFuse**, an enterprise-grade AI-powered workflow automation platform with visual workflow builder, real-time collaboration, and comprehensive analytics. Think Zapier meets n8n meets AI-native design.

### Core Value Proposition
- **Visual Workflow Builder**: Drag-and-drop canvas with node-based editing
- **AI-Powered Generation**: Natural language to workflow, image-to-workflow, document analysis
- **Enterprise Security**: Guardrails, RLS policies, audit logging, SSO support
- **Real-time Collaboration**: Multi-user editing with cursor presence and node locking
- **Deep Analytics**: ROI reporting, cost tracking, health scores, predictive alerts

---

## 🛠 Technology Stack

### Frontend
```
- React 18.3+ with TypeScript
- Vite for build tooling
- Tailwind CSS with custom design system
- shadcn/ui component library
- TanStack Query for data fetching
- React Router v6 for navigation
- Recharts for data visualization
- Framer Motion for animations (optional)
```

### Backend
```
- PostgreSQL database
- Supabase for auth, storage, realtime
- Deno-based Edge Functions
- Row Level Security (RLS) policies
```

### AI Integration
```
- Google Gemini 2.5 (Pro/Flash variants)
- OpenAI GPT-5 (via AI gateway)
- Vision capabilities for image analysis
- Structured output via tool calling
```

---

## 📐 Architecture Philosophy

Inspired by **OpenDevin**, **LangGraph**, and **Autogen Studio**:

1. **Hybrid Event + State Architecture**: Event-driven with checkpoint support
2. **Defensive Architecture**: Circuit breakers, rate limiting, dead letter queues
3. **Visual-First Design**: Everything representable on canvas
4. **Security by Default**: Guardrails auto-injected, RLS everywhere

---

## 🗄 Database Schema

### Core Tables

```sql
-- Workspaces (multi-tenant)
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Workflows
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  nodes JSONB NOT NULL DEFAULT '[]',
  connections JSONB NOT NULL DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow Executions
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows NOT NULL,
  workspace_id UUID REFERENCES workspaces NOT NULL,
  status execution_status DEFAULT 'pending',
  execution_data JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  triggered_by UUID REFERENCES profiles
);

-- Workflow Versions
CREATE TABLE workflow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows NOT NULL,
  version_number INTEGER NOT NULL,
  nodes JSONB NOT NULL,
  connections JSONB NOT NULL,
  change_summary TEXT,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Guardrails
CREATE TABLE guardrails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'input_validation', 'output_filter', 'rate_limit', 'pii_detection'
  config JSONB NOT NULL,
  is_global BOOLEAN DEFAULT false,
  workspace_id UUID REFERENCES workspaces,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow Templates
CREATE TABLE workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  nodes JSONB NOT NULL,
  connections JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  downloads_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow Health Scores
CREATE TABLE workflow_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows NOT NULL,
  workspace_id UUID REFERENCES workspaces NOT NULL,
  overall_score NUMERIC NOT NULL,
  reliability_score NUMERIC NOT NULL,
  efficiency_score NUMERIC NOT NULL,
  security_score NUMERIC NOT NULL,
  cost_score NUMERIC NOT NULL,
  recommendations JSONB DEFAULT '[]',
  calculated_at TIMESTAMPTZ DEFAULT now()
);

-- Collaboration Sessions
CREATE TABLE workflow_collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows NOT NULL,
  user_id UUID NOT NULL,
  user_color TEXT NOT NULL,
  cursor_x NUMERIC,
  cursor_y NUMERIC,
  selected_node_id TEXT,
  is_editing BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMPTZ DEFAULT now()
);

-- Node Edit Locks
CREATE TABLE workflow_edit_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows NOT NULL,
  node_id TEXT NOT NULL,
  locked_by UUID NOT NULL,
  locked_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + interval '5 minutes'
);
```

### Enums

```sql
CREATE TYPE execution_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE queue_priority AS ENUM ('low', 'normal', 'high', 'critical');
```

### RLS Policies Pattern

```sql
-- Enable RLS
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- Workspace member access
CREATE POLICY "Users can view workflows in their workspace"
ON workflows FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create workflows in their workspace"
ON workflows FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);
```

---

## 🎨 Design System

### Color Tokens (HSL)

```css
:root {
  /* Core */
  --background: 222 47% 11%;
  --foreground: 213 31% 91%;
  
  /* Primary - Electric Blue */
  --primary: 217 91% 60%;
  --primary-foreground: 222 47% 11%;
  
  /* Secondary */
  --secondary: 215 28% 17%;
  --secondary-foreground: 213 31% 91%;
  
  /* Accent */
  --accent: 263 70% 50%;
  --accent-foreground: 210 40% 98%;
  
  /* Semantic */
  --destructive: 0 63% 31%;
  --muted: 215 28% 17%;
  --muted-foreground: 215 20% 65%;
  
  /* Borders */
  --border: 215 28% 17%;
  --ring: 217 91% 60%;
  
  /* Node Types */
  --node-trigger: 142 76% 36%;
  --node-action: 217 91% 60%;
  --node-condition: 45 93% 47%;
  --node-ai: 263 70% 50%;
  --node-guardrail: 0 84% 60%;
}
```

### Component Patterns

```tsx
// Container Pattern
const WorkflowCanvas = ({ children }) => (
  <div className="relative w-full h-full bg-background overflow-hidden">
    <div className="absolute inset-0 bg-grid-pattern opacity-5" />
    {children}
  </div>
);

// Node Component Pattern
const WorkflowNode = ({ node, isSelected, onSelect }) => (
  <div 
    className={cn(
      "absolute rounded-lg border-2 p-4 cursor-pointer transition-all",
      "bg-card hover:shadow-lg",
      isSelected && "ring-2 ring-primary border-primary",
      nodeTypeStyles[node.type]
    )}
    style={{ left: node.x, top: node.y }}
    onClick={() => onSelect(node.id)}
  >
    <div className="flex items-center gap-2">
      <NodeIcon type={node.type} />
      <span className="font-medium">{node.title}</span>
    </div>
  </div>
);
```

---

## 🔧 Core Components

### 1. WorkflowCanvas (Main Editor)

```tsx
interface WorkflowCanvasProps {
  initialNodes?: WorkflowNode[];
  onWorkflowChange?: (nodes: WorkflowNode[]) => void;
}

// Features:
// - Drag-and-drop node positioning
// - Pan and zoom (mouse wheel + drag)
// - Node selection and multi-select
// - Connection drawing between nodes
// - Mini-map for navigation
// - Keyboard shortcuts (Delete, Ctrl+S, etc.)
// - Touch support for tablets
```

### 2. WorkflowNode Types

```typescript
type NodeType = 
  | 'trigger'      // Entry points (webhook, schedule, manual)
  | 'action'       // Operations (HTTP, database, file)
  | 'condition'    // Branching logic (if/else, switch)
  | 'ai'           // AI operations (LLM, vision, embeddings)
  | 'guardrail'    // Security (validation, PII filter, rate limit)
  | 'integration'  // Third-party (Slack, Email, Stripe)
  | 'data'         // Transform (map, filter, aggregate)
  | 'loop'         // Iteration (forEach, while)
  | 'delay'        // Timing (wait, schedule)
  | 'error'        // Error handling (try/catch, retry)
  | 'subflow';     // Nested workflow reference

interface WorkflowNode {
  id: string;
  type: NodeType;
  title: string;
  description?: string;
  x: number;
  y: number;
  config: Record<string, any>;
  inputs: string[];   // Connected node IDs
  outputs: string[];  // Connected node IDs
  metadata?: {
    guardrails?: string[];
    estimatedDuration?: number;
    costPerExecution?: number;
  };
}
```

### 3. AI Workflow Generation

```typescript
// Edge Function: generate-workflow-from-text
const generateWorkflow = async (description: string) => {
  const response = await fetch(AI_GATEWAY_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: WORKFLOW_GENERATION_PROMPT },
        { role: 'user', content: description }
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'generate_workflow',
          parameters: {
            type: 'object',
            properties: {
              nodes: { type: 'array', items: { /* node schema */ } },
              connections: { type: 'array', items: { /* connection schema */ } },
              metadata: { type: 'object' }
            }
          }
        }
      }],
      tool_choice: { type: 'function', function: { name: 'generate_workflow' } }
    })
  });
  
  return parseWorkflowResponse(response);
};
```

### 4. Guardrail System

```typescript
interface Guardrail {
  id: string;
  type: 'input_validation' | 'output_filter' | 'rate_limit' | 'pii_detection' | 'content_filter';
  config: {
    rules?: ValidationRule[];
    maxRequests?: number;
    windowMs?: number;
    piiTypes?: ('email' | 'phone' | 'ssn' | 'credit_card')[];
    blockedPatterns?: string[];
  };
  action: 'block' | 'warn' | 'sanitize' | 'log';
}

// Auto-inject guardrails based on workflow analysis
const injectGuardrails = (workflow: Workflow): Workflow => {
  const guardrails: GuardrailNode[] = [];
  
  // Add PII detection before any AI node
  workflow.nodes.filter(n => n.type === 'ai').forEach(aiNode => {
    guardrails.push(createPiiGuardrail(aiNode.id));
  });
  
  // Add rate limiting to trigger nodes
  workflow.nodes.filter(n => n.type === 'trigger').forEach(trigger => {
    guardrails.push(createRateLimitGuardrail(trigger.id));
  });
  
  return { ...workflow, nodes: [...workflow.nodes, ...guardrails] };
};
```

### 5. Real-time Collaboration

```typescript
// Subscribe to collaboration events
const useCollaboration = (workflowId: string) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [lockedNodes, setLockedNodes] = useState<Map<string, string>>();
  
  useEffect(() => {
    const channel = supabase
      .channel(`workflow:${workflowId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setCollaborators(Object.values(state).flat());
      })
      .on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
        updateCursor(payload.userId, payload.x, payload.y);
      })
      .on('broadcast', { event: 'node_lock' }, ({ payload }) => {
        setLockedNodes(prev => new Map(prev).set(payload.nodeId, payload.userId));
      })
      .subscribe();
      
    return () => channel.unsubscribe();
  }, [workflowId]);
  
  return { collaborators, lockedNodes, broadcastCursor, lockNode };
};
```

---

## 📊 Analytics & Monitoring

### Workflow Health Score

```typescript
interface HealthScore {
  overall: number;      // 0-100
  reliability: number;  // Based on success rate
  efficiency: number;   // Based on execution time
  security: number;     // Based on guardrail coverage
  cost: number;         // Based on cost optimization
  recommendations: Recommendation[];
}

const calculateHealthScore = (workflow: Workflow, executions: Execution[]) => {
  const successRate = executions.filter(e => e.status === 'completed').length / executions.length;
  const avgDuration = mean(executions.map(e => e.duration_ms));
  const hasGuardrails = workflow.nodes.some(n => n.type === 'guardrail');
  
  return {
    overall: weightedAverage([successRate * 100, speedScore, hasGuardrails ? 100 : 50]),
    reliability: successRate * 100,
    efficiency: calculateSpeedScore(avgDuration),
    security: calculateSecurityScore(workflow),
    cost: calculateCostScore(workflow, executions)
  };
};
```

### ROI Reporting

```typescript
interface ROIMetrics {
  timeSavedHours: number;
  costSavings: number;
  executionCount: number;
  errorReduction: number;
  productivityGain: number;
}

const calculateROI = (workflow: Workflow, period: DateRange): ROIMetrics => {
  const executions = getExecutions(workflow.id, period);
  const manualTimeEstimate = workflow.metadata.manualTimeMinutes || 15;
  
  return {
    timeSavedHours: (executions.length * manualTimeEstimate) / 60,
    costSavings: calculateLaborSavings(executions, manualTimeEstimate),
    executionCount: executions.length,
    errorReduction: calculateErrorReduction(executions),
    productivityGain: calculateProductivityGain(executions)
  };
};
```

---

## 🔌 Edge Functions

### Standard Pattern

```typescript
// supabase/functions/[function-name]/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { data } = await req.json();
    
    // Validate input
    if (!data) {
      throw new Error("Missing required data");
    }
    
    // Process
    const result = await processData(data);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### Key Functions to Implement

1. **execute-workflow**: Run workflow with circuit breaker + retry logic
2. **generate-workflow-from-text**: AI text-to-workflow generation
3. **analyze-workflow-image**: Vision-based workflow extraction
4. **calculate-health-score**: Compute workflow health metrics
5. **optimize-workflow**: AI-powered optimization suggestions
6. **self-heal-workflow**: Auto-recovery from failures

---

## 🔐 Security Checklist

- [ ] RLS policies on all tables
- [ ] API key hashing (never store plaintext)
- [ ] Rate limiting on all endpoints
- [ ] Input validation on all user inputs
- [ ] PII detection before AI processing
- [ ] Audit logging for sensitive operations
- [ ] Webhook signature verification
- [ ] CORS configuration
- [ ] Credential encryption at rest

---

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/                    # shadcn components
│   ├── WorkflowCanvas.tsx     # Main editor
│   ├── WorkflowNode.tsx       # Node component
│   ├── NodeConfigDialog.tsx   # Node settings
│   ├── CollaboratorCursors.tsx
│   ├── GuardrailVisualization.tsx
│   └── ...
├── hooks/
│   ├── useWorkflowPersistence.tsx
│   ├── useCollaboration.tsx
│   └── useEnterpriseFeatures.tsx
├── lib/
│   ├── workflowValidation.ts
│   ├── workflowExport.ts
│   ├── workflowNaming.ts      # Smart naming system
│   └── securityScanner.ts
├── pages/
│   ├── Index.tsx              # Canvas page
│   ├── Templates.tsx
│   ├── Analytics.tsx
│   └── ...
└── types/
    └── workflow.ts

supabase/
├── functions/
│   ├── execute-workflow/
│   ├── generate-workflow-from-text/
│   └── ...
└── config.toml
```

---

## 🚀 Implementation Steps

### Phase 1: Foundation
1. Set up project with Vite + React + TypeScript
2. Install shadcn/ui and configure Tailwind
3. Create database schema and RLS policies
4. Build basic WorkflowCanvas with drag-and-drop
5. Implement node CRUD operations

### Phase 2: Core Features
1. Add AI workflow generation (text-to-workflow)
2. Implement workflow execution engine
3. Add guardrail system
4. Build real-time collaboration
5. Create template gallery

### Phase 3: Enterprise
1. Add analytics dashboard
2. Implement health scoring
3. Build ROI reporting
4. Add version history
5. Create audit logging

### Phase 4: Advanced
1. Self-healing workflows
2. Predictive failure alerts
3. A/B testing for workflows
4. Marketplace for templates
5. White-label support

---

## 💡 Smart Workflow Naming

Never use generic names. Analyze workflow content:

```typescript
const generateSmartName = (nodes: WorkflowNode[]): string => {
  // Analyze node types for category
  const categories = detectCategories(nodes);  // ['finance', 'automation']
  
  // Extract action verbs from nodes
  const actions = extractActions(nodes);  // ['process', 'validate', 'notify']
  
  // Detect integrations
  const platforms = detectPlatforms(nodes);  // ['slack', 'stripe']
  
  // Build descriptive name
  return formatName({
    category: categories[0],
    action: actions[0],
    platform: platforms[0],
    complexity: nodes.length > 10 ? 'complex' : 'simple'
  });
  // Result: "finance-payment-processor-stripe" or "slack-notification-flow"
};
```

---

## 🎯 Key Differentiators

1. **AI-Native**: Built for AI workflows with guardrails
2. **Visual-First**: Everything editable on canvas
3. **Enterprise-Ready**: SSO, audit logs, compliance
4. **Self-Healing**: Auto-recovery from failures
5. **Cost-Aware**: Built-in ROI and cost tracking

---

*This prompt provides the complete architecture for building FlowFuse. Adapt based on your specific IDE capabilities and target platform.*
