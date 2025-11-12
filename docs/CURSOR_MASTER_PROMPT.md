# FlowFuse Master Prompt for Cursor

## Project Overview
FlowFuse is an enterprise-grade, AI-powered workflow automation platform that combines visual workflow building with intelligent automation, security guardrails, and comprehensive analytics.

## Core Value Proposition
- **Visual Workflow Builder**: Drag-and-drop interface for creating complex automation workflows
- **AI-Powered Generation**: Create workflows from text descriptions, images, or YouTube videos
- **Enterprise Security**: Automatic guardrail injection, compliance tracking (HIPAA, GDPR, SOC2, PCI-DSS)
- **Real-time Collaboration**: Multi-user editing with live cursors and activity feeds
- **Analytics & Monitoring**: Comprehensive dashboards for performance, health, and ROI tracking

## Technology Stack

### Frontend
- **Framework**: React 18.3+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React Context + TanStack Query
- **Routing**: React Router v6
- **UI Components**: Radix UI primitives via shadcn/ui
- **Charts**: Recharts
- **Icons**: Lucide React

### Backend (Lovable Cloud/Supabase)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Auth**: Supabase Auth with email/Google sign-in
- **Storage**: Supabase Storage for file uploads
- **Edge Functions**: Deno-based serverless functions
- **Real-time**: Supabase Realtime for collaboration

### AI Integration
- **Primary**: Lovable AI Gateway (Google Gemini 2.5, OpenAI GPT-5)
- **Use Cases**: Workflow generation, optimization, image analysis, YouTube video analysis
- **Models**: 
  - `google/gemini-2.5-flash` (default)
  - `google/gemini-2.5-pro` (advanced reasoning)
  - `openai/gpt-5` (complex tasks)

## Architecture Philosophy

### Inspired By
1. **OpenDevin**: Event-driven pub/sub architecture, sandbox execution
2. **LangGraph**: State management with persistent checkpointing
3. **Autogen Studio**: Multi-agent patterns with LLM-based routing

### Core Architectural Principles
- **Hybrid Event + State Architecture**: Combine event streaming with persistent state
- **Defensive Architecture**: Circuit breakers, rate limiting, dead letter queues
- **Visual-First Design**: Everything configurable through UI, no code required
- **Security by Default**: Automatic guardrail injection, compliance-aware

## Database Schema

### Core Tables

#### `workflows`
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  definition JSONB NOT NULL, -- Workflow graph structure
  status TEXT DEFAULT 'draft', -- draft, active, archived
  version INTEGER DEFAULT 1,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `workflow_executions`
```sql
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id),
  user_id UUID NOT NULL,
  status TEXT NOT NULL, -- pending, running, completed, failed
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `workflow_nodes`
```sql
CREATE TABLE workflow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id),
  type TEXT NOT NULL, -- trigger, action, condition, transform, guardrail
  config JSONB NOT NULL,
  position JSONB, -- { x, y }
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `workflow_versions`
```sql
CREATE TABLE workflow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id),
  version INTEGER NOT NULL,
  definition JSONB NOT NULL,
  changes_summary TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `guardrails`
```sql
CREATE TABLE guardrails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  trigger_condition TEXT,
  action TEXT,
  applies_to TEXT[], -- ['database', 'api', 'workflow']
  compliance_tags TEXT[], -- ['HIPAA', 'GDPR', 'SOC2', 'PCI-DSS']
  severity TEXT, -- critical, high, medium, low
  explanation TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `workflow_analytics`
```sql
CREATE TABLE workflow_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id),
  execution_id UUID REFERENCES workflow_executions(id),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC,
  dimensions JSONB,
  recorded_at TIMESTAMPTZ DEFAULT now()
);
```

#### `collaboration_locks`
```sql
CREATE TABLE collaboration_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id),
  node_id UUID,
  user_id UUID NOT NULL,
  user_email TEXT,
  acquired_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
```

#### `templates`
```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  definition JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  author_id UUID NOT NULL,
  downloads INTEGER DEFAULT 0,
  rating NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### RLS Policies
- All tables must have RLS enabled
- Users can only access their own workflows or workspace-shared workflows
- Public templates are readable by everyone
- Execution logs are only visible to workflow owners

## Core Features Implementation

### 1. Visual Workflow Builder (`WorkflowCanvas.tsx`)
```typescript
// Key features:
- Drag-and-drop node placement
- Connection drawing between nodes
- Real-time validation of connections
- Zoom and pan controls
- Mini-map navigation
- Keyboard shortcuts (delete, duplicate, undo/redo)
- Auto-layout algorithm for imported workflows
```

### 2. AI Workflow Generation

#### Text-to-Workflow (`generate-workflow-from-text`)
```typescript
// Edge function that:
- Accepts natural language description
- Calls Lovable AI with structured prompt
- Returns workflow definition with nodes and connections
- Automatically injects guardrail nodes
- Handles multi-workflow detection
```

#### Image-to-Workflow (`analyze-workflow-image`)
```typescript
// Edge function that:
- Accepts image file
- Uses vision-capable model (Gemini 2.5 Pro)
- Extracts workflow structure from diagrams
- Returns structured workflow definition
```

#### YouTube-to-Workflow (`analyze-youtube-video`)
```typescript
// Edge function that:
- Accepts YouTube URL
- Extracts video metadata and transcript
- Identifies distinct workflows in content
- Generates separate workflows for each
```

### 3. Guardrail System

#### Automatic Injection
```typescript
// In all workflow generation functions:
function injectGuardrailNodes(workflow: Workflow): Workflow {
  const guardrails = loadGuardrailRegistry();
  
  // Analyze workflow for compliance needs
  const requiredGuardrails = detectRequiredGuardrails(workflow);
  
  // Insert guardrail nodes at strategic points
  // - Before database operations
  // - Before external API calls
  // - Before data transformations
  
  // Add explainability metadata
  return enhancedWorkflow;
}
```

#### Registry Structure (`guardrail-registry.ts`)
```typescript
interface GuardrailRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  appliesTo: string[];
  complianceTags: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  explanation: string;
}
```

### 4. Real-time Collaboration

#### Cursor Broadcasting
```typescript
// Use Supabase Realtime channels
const channel = supabase.channel(`workflow:${workflowId}`)
  .on('presence', { event: 'sync' }, () => {
    // Update collaborator cursors
  })
  .on('broadcast', { event: 'cursor-move' }, (payload) => {
    // Update cursor position
  })
  .subscribe();
```

#### Node Locking
```typescript
// Acquire lock before editing
const acquireLock = async (nodeId: string) => {
  await supabase.from('collaboration_locks').insert({
    workflow_id: workflowId,
    node_id: nodeId,
    user_id: userId,
    expires_at: new Date(Date.now() + 60000) // 1 minute
  });
};
```

### 5. Workflow Execution Engine

#### Priority-Based Execution
```typescript
interface ExecutionContext {
  workflowId: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  state: WorkflowState;
  checkpoints: Checkpoint[];
}

// Execute nodes based on priority groups
async function executeWorkflow(context: ExecutionContext) {
  const eventStream = new EventStreamManager();
  
  for (const node of context.state.nodes) {
    // Emit action-start event
    eventStream.publish({
      type: 'action-start',
      nodeId: node.id,
      timestamp: Date.now()
    });
    
    // Execute with circuit breaker
    const result = await circuitBreaker.execute(
      () => executeNode(node, context)
    );
    
    // Create checkpoint
    context.checkpoints.push({
      nodeId: node.id,
      state: context.state,
      timestamp: Date.now()
    });
    
    // Emit action-complete event
    eventStream.publish({
      type: 'action-complete',
      nodeId: node.id,
      result,
      timestamp: Date.now()
    });
  }
}
```

### 6. Analytics & Monitoring

#### Metrics Collection
```typescript
// Track execution metrics
await supabase.from('workflow_analytics').insert({
  workflow_id: workflowId,
  execution_id: executionId,
  metric_name: 'execution_duration_ms',
  metric_value: duration,
  dimensions: {
    status: 'completed',
    node_count: nodeCount
  }
});
```

#### Health Score Calculation
```typescript
function calculateHealthScore(workflow: Workflow): number {
  const metrics = {
    successRate: getSuccessRate(workflow),
    avgDuration: getAvgDuration(workflow),
    errorCount: getErrorCount(workflow),
    lastExecution: getLastExecution(workflow)
  };
  
  // Weighted scoring algorithm
  const score = (
    metrics.successRate * 0.4 +
    (1 - metrics.avgDuration / maxDuration) * 0.3 +
    (1 - metrics.errorCount / maxErrors) * 0.2 +
    metrics.lastExecution * 0.1
  ) * 100;
  
  return Math.round(score);
}
```

## UI Component Architecture

### Design System (index.css)
```css
:root {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --accent: 217.2 32.6% 17.5%;
  --muted: 217.2 32.6% 17.5%;
  --border: 217.2 32.6% 17.5%;
  
  /* Gradients */
  --gradient-primary: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7));
  
  /* Shadows */
  --shadow-elegant: 0 10px 30px -10px hsl(var(--primary) / 0.3);
}
```

### Component Patterns

#### Container Components
- Handle data fetching and state management
- Use TanStack Query for server state
- Pass data to presentational components

#### Presentational Components
- Pure UI components
- Accept props for customization
- Use design system tokens exclusively

#### Custom Hooks
- `useWorkflowPersistence`: Auto-save workflows
- `useCollaboration`: Real-time presence and cursors
- `useEnterpriseFeatures`: Feature flag management

## Edge Functions Structure

### Standard Pattern
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request
    const body = await req.json();
    
    // Authenticate
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization');
    }
    
    // Business logic
    const result = await processRequest(body);
    
    // Return response
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

## Legal Compliance

### AI Transparency Statement
All AI-generated workflows must include:
```
🧠 AI-Generated Workflow Notice

This workflow was generated by AI analysis of publicly available content.
No copyrighted material is stored or redistributed.

Legal Compliance:
- U.S. Copyright Law (17 U.S.C. §107): Transformative use
- YouTube Developer Policies (Section 5.B): No unauthorized reuse
- GDPR (Article 5.1.c): Data minimization and transparency

© 2025 Remora Development. All rights reserved.
```

### Required Files
- `docs/LEGAL.md`: Full legal statement
- `src/pages/Legal.tsx`: Legal information page
- `src/components/LegalFooter.tsx`: Footer with legal links

## Key Implementation Guidelines

### 1. Always Use Design System
```typescript
// ❌ WRONG
<Button className="bg-blue-500 text-white">Click</Button>

// ✅ CORRECT
<Button variant="default">Click</Button>
```

### 2. Implement RLS Policies
```sql
-- Enable RLS
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- Policy for viewing own workflows
CREATE POLICY "Users can view own workflows"
ON workflows FOR SELECT
USING (auth.uid() = user_id);
```

### 3. Error Handling Pattern
```typescript
try {
  const result = await riskyOperation();
  toast.success('Operation completed');
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  toast.error(error.message || 'Operation failed');
  throw error;
}
```

### 4. Loading States
```typescript
const [isLoading, setIsLoading] = useState(false);

const handleAction = async () => {
  setIsLoading(true);
  try {
    await performAction();
  } finally {
    setIsLoading(false);
  }
};

return <Button disabled={isLoading}>
  {isLoading ? 'Processing...' : 'Submit'}
</Button>;
```

## Testing Strategy

### User Flows to Test
1. Create workflow from text description
2. Create workflow from uploaded image
3. Create workflow from YouTube URL
4. Edit workflow visually (add/remove/connect nodes)
5. Execute workflow and view results
6. Collaborate with another user (see cursors)
7. View analytics dashboard
8. Export workflow as JSON
9. Import workflow from JSON
10. Create template from workflow

### Security Tests
- RLS policies prevent unauthorized access
- Guardrails auto-inject on sensitive operations
- API rate limiting works correctly
- File upload validation prevents malicious files

## Deployment Checklist

### Environment Variables
```
VITE_SUPABASE_URL=<supabase-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
LOVABLE_API_KEY=<auto-provided>
```

### Database Setup
1. Run all migrations in order
2. Enable RLS on all tables
3. Create necessary indexes for performance
4. Set up real-time publication for collaboration tables

### Edge Functions
All functions auto-deploy, verify:
- `generate-workflow-from-text`
- `analyze-workflow-image`
- `analyze-youtube-video`
- `optimize-workflow`
- `execute-workflow`
- `suggest-integrations`

### Post-Deployment Verification
- [ ] User can sign up and log in
- [ ] Workflows can be created and saved
- [ ] AI generation functions work
- [ ] Analytics display correctly
- [ ] Real-time collaboration works
- [ ] Legal page is accessible

## Future Enhancements

### Phase 1 (Current)
- ✅ Visual workflow builder
- ✅ AI-powered generation
- ✅ Guardrail system
- ✅ Real-time collaboration
- ✅ Analytics dashboard

### Phase 2 (Planned)
- Workflow marketplace with paid templates
- Advanced AI agents with memory
- Custom integration builder
- White-label enterprise deployments
- Multi-tenant workspace management

### Phase 3 (Future)
- Mobile app for workflow monitoring
- Voice-to-workflow generation
- Blockchain-based audit trails
- Advanced ML-based optimization
- Federated learning for privacy

## Support Resources

### Documentation
- Architecture: `docs/ARCHITECTURE_ANALYSIS.md`
- Legal: `docs/LEGAL.md`
- Testing: `docs/TESTING_GUIDE.md`

### Key Libraries
- React: https://react.dev
- Tailwind CSS: https://tailwindcss.com
- shadcn/ui: https://ui.shadcn.com
- Supabase: https://supabase.com/docs
- TanStack Query: https://tanstack.com/query

---

## Cursor-Specific Instructions

When building FlowFuse in Cursor:

1. **Start with scaffolding**: Set up React + Vite + TypeScript + Tailwind
2. **Install dependencies**: Use the exact versions from package.json
3. **Create design system**: Implement index.css with HSL color tokens
4. **Build core components**: Start with Button, Card, Input from shadcn/ui
5. **Implement routing**: Set up React Router with protected routes
6. **Add Supabase**: Configure client and types
7. **Build workflow canvas**: Implement drag-and-drop with node connections
8. **Add AI integration**: Create edge functions for workflow generation
9. **Implement guardrails**: Build registry system and auto-injection
10. **Add collaboration**: Use Supabase Realtime for cursors and locks
11. **Build analytics**: Create dashboards with Recharts
12. **Add legal pages**: Implement compliance documentation

Use this prompt as a reference throughout development. All features should align with the architecture and patterns described here.

---

© 2025 Remora Development | FlowFuse v1.0
