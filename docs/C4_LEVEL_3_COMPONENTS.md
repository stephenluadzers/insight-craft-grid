# C4 Model - Level 3: Component Diagram
## FlowFuse Service Components

### Overview
This diagram zooms into individual containers to show their internal components and how they collaborate.

---

## Workflow Engine Service Components

<lov-mermaid>
graph TB
    subgraph WorkflowEngine["Workflow Engine Service"]
        ExecutionController["Execution Controller<br/>---<br/>Orchestrates workflow runs<br/>Manages state transitions"]
        
        NodeExecutor["Node Executor<br/>---<br/>Executes individual nodes<br/>Handles retries"]
        
        StateManager["State Manager<br/>---<br/>Checkpointing<br/>State persistence"]
        
        SchedulerService["Scheduler Service<br/>---<br/>Cron jobs<br/>Delayed execution"]
        
        CircuitBreaker["Circuit Breaker<br/>---<br/>Failure detection<br/>Auto-recovery"]
        
        QueueManager["Queue Manager<br/>---<br/>Priority queues<br/>Dead letter queue"]
        
        ValidationEngine["Validation Engine<br/>---<br/>Schema validation<br/>Cycle detection"]
        
        DebugSession["Debug Session Handler<br/>---<br/>Step-through execution<br/>Snapshot management"]
    end

    subgraph DataAccess["Data Access"]
        WorkflowRepo["Workflow Repository<br/>---<br/>CRUD operations<br/>Query optimization"]
        
        ExecutionRepo["Execution Repository<br/>---<br/>Save executions<br/>Fetch history"]
        
        CacheService["Cache Service<br/>---<br/>Redis wrapper<br/>TTL management"]
    end

    ExecutionController -->|"Validates"| ValidationEngine
    ExecutionController -->|"Executes nodes"| NodeExecutor
    ExecutionController -->|"Manages state"| StateManager
    ExecutionController -->|"Schedules"| SchedulerService
    ExecutionController -->|"Checks health"| CircuitBreaker
    ExecutionController -->|"Enqueues"| QueueManager
    
    NodeExecutor -->|"Reads workflows"| WorkflowRepo
    NodeExecutor -->|"Saves logs"| ExecutionRepo
    NodeExecutor -->|"Caches results"| CacheService
    
    DebugSession -->|"Replays execution"| ExecutionController
    DebugSession -->|"Fetches snapshots"| StateManager
    
    SchedulerService -->|"Triggers execution"| ExecutionController
    QueueManager -->|"Retries failed"| ExecutionController
    
    classDef controllerStyle fill:#4A90E2,stroke:#2E5C8A,stroke-width:2px,color:#fff
    classDef serviceStyle fill:#7B68EE,stroke:#4B3A9E,stroke-width:2px,color:#fff
    classDef dataStyle fill:#FF6B6B,stroke:#CC5555,stroke-width:2px,color:#fff
    
    class ExecutionController controllerStyle
    class NodeExecutor,StateManager,SchedulerService,CircuitBreaker,QueueManager,ValidationEngine,DebugSession serviceStyle
    class WorkflowRepo,ExecutionRepo,CacheService dataStyle
</lov-mermaid>

### Component Responsibilities

#### Execution Controller
**Purpose:** Central orchestrator for workflow execution  
**Key Methods:**
- `executeWorkflow(workflowId, input)` - Start execution
- `pauseExecution(executionId)` - Pause running workflow
- `resumeExecution(executionId)` - Resume paused workflow
- `cancelExecution(executionId)` - Stop execution

**State Machine:**
```
pending → running → [completed | failed | cancelled]
         ↓
      paused → running
```

---

#### Node Executor
**Purpose:** Execute individual workflow nodes  
**Node Types:**
- Trigger nodes (webhook, schedule, manual)
- Action nodes (API call, database query, email)
- Condition nodes (if/else, switch)
- Loop nodes (for-each, while)
- Integration nodes (custom connectors)
- Guardrail nodes (security validation)

**Execution Strategy:**
1. Load node configuration
2. Resolve input variables
3. Execute node logic
4. Validate output
5. Store result
6. Emit event

---

#### State Manager
**Purpose:** Persistent checkpointing for resumable workflows  
**Features:**
- Checkpoint every N nodes (configurable)
- Encrypt sensitive state data
- Garbage collection for old checkpoints
- State rollback for debugging

**Storage:**
```json
{
  "execution_id": "uuid",
  "checkpoint_index": 5,
  "timestamp": "2025-11-13T10:30:00Z",
  "state": {
    "variables": { "user_email": "user@example.com" },
    "completed_nodes": ["node1", "node2", "node3"],
    "current_node": "node4"
  }
}
```

---

#### Scheduler Service
**Purpose:** Cron-based workflow scheduling  
**Features:**
- Parse cron expressions
- Timezone support
- One-time scheduled runs
- Recurring schedules
- Schedule conflict detection

**Cron Examples:**
```
0 9 * * 1-5    → Weekdays at 9 AM
*/15 * * * *   → Every 15 minutes
0 0 1 * *      → First day of month
```

---

#### Circuit Breaker
**Purpose:** Prevent cascading failures  
**States:**
```
Closed: All requests allowed
  │
  ├─ (50 failures in 5 min) → Open
  │
Open: All requests blocked
  │
  ├─ (5 min timeout) → Half-Open
  │
Half-Open: Allow 1 request
  │
  ├─ (Success) → Closed
  └─ (Failure) → Open
```

**Per-Workspace Tracking:**
- Each workspace has its own circuit breaker
- Failure threshold: 50 errors
- Timeout: 5 minutes
- Recovery check: 1 test request

---

## Integration Service Components

<lov-mermaid>
graph TB
    subgraph IntegrationService["Integration Service"]
        ConnectorRegistry["Connector Registry<br/>---<br/>500+ integrations<br/>Plugin system"]
        
        OAuth2Handler["OAuth 2.0 Handler<br/>---<br/>Authorization flows<br/>Token refresh"]
        
        CredentialVault["Credential Vault<br/>---<br/>Encrypted storage<br/>AES-256-GCM"]
        
        WebhookManager["Webhook Manager<br/>---<br/>Register webhooks<br/>Retry logic"]
        
        RateLimiter["Rate Limiter<br/>---<br/>Per-integration limits<br/>Token bucket"]
        
        DataTransformer["Data Transformer<br/>---<br/>Field mapping<br/>Type conversion"]
        
        APIClient["API Client<br/>---<br/>HTTP requests<br/>Timeout handling"]
    end

    ConnectorRegistry -->|"Load connector"| APIClient
    OAuth2Handler -->|"Store tokens"| CredentialVault
    WebhookManager -->|"Execute"| APIClient
    APIClient -->|"Check limits"| RateLimiter
    APIClient -->|"Transform data"| DataTransformer
    
    classDef coreStyle fill:#4A90E2,stroke:#2E5C8A,stroke-width:2px,color:#fff
    classDef securityStyle fill:#FF6B6B,stroke:#CC5555,stroke-width:2px,color:#fff
    
    class ConnectorRegistry,WebhookManager,APIClient coreStyle
    class OAuth2Handler,CredentialVault,RateLimiter securityStyle
</lov-mermaid>

### Component Responsibilities

#### Connector Registry
**Purpose:** Central repository of integration connectors  
**Connector Structure:**
```typescript
interface Connector {
  id: string;
  name: string;
  category: string;
  auth_type: 'oauth2' | 'api_key' | 'basic';
  actions: Action[];
  triggers: Trigger[];
  icon_url: string;
}

interface Action {
  id: string;
  name: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  input_schema: JSONSchema;
  output_schema: JSONSchema;
}
```

---

#### OAuth 2.0 Handler
**Flow:**
```
1. User clicks "Connect Stripe"
2. Redirect to Stripe OAuth page
3. User authorizes
4. Stripe redirects back with code
5. Exchange code for tokens
6. Encrypt and store tokens
7. Schedule token refresh (before expiry)
```

**Token Refresh:**
- Background job checks expiring tokens
- Refresh 1 hour before expiry
- Retry 3 times if refresh fails
- Alert user if all retries fail

---

#### Credential Vault
**Encryption:**
```typescript
// Encrypt credentials
function encrypt(plaintext: string, workspace_id: string): string {
  const key = deriveKey(MASTER_KEY, workspace_id);
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${authTag.toString('hex')}`;
}
```

**Key Rotation:**
- Master key rotated quarterly
- Re-encrypt all credentials in background
- Zero downtime migration

---

## Analytics Service Components

<lov-mermaid>
graph TB
    subgraph AnalyticsService["Analytics Service"]
        MetricsCollector["Metrics Collector<br/>---<br/>Gather execution data<br/>Real-time aggregation"]
        
        HealthScorer["Health Scorer<br/>---<br/>Calculate health score<br/>Trend analysis"]
        
        CostCalculator["Cost Calculator<br/>---<br/>Estimate costs<br/>Transaction pricing"]
        
        ROIEngine["ROI Engine<br/>---<br/>Time saved analysis<br/>Business value"]
        
        AnomalyDetector["Anomaly Detector<br/>---<br/>Pattern recognition<br/>Alert generation"]
        
        ReportGenerator["Report Generator<br/>---<br/>PDF/CSV export<br/>Scheduled reports"]
    end

    MetricsCollector -->|"Feeds data"| HealthScorer
    MetricsCollector -->|"Feeds data"| CostCalculator
    MetricsCollector -->|"Feeds data"| AnomalyDetector
    
    HealthScorer -->|"Used by"| ReportGenerator
    CostCalculator -->|"Used by"| ROIEngine
    AnomalyDetector -->|"Triggers"| ReportGenerator
    
    classDef collectorStyle fill:#4A90E2,stroke:#2E5C8A,stroke-width:2px,color:#fff
    classDef analyzerStyle fill:#7B68EE,stroke:#4B3A9E,stroke-width:2px,color:#fff
    
    class MetricsCollector collectorStyle
    class HealthScorer,CostCalculator,ROIEngine,AnomalyDetector,ReportGenerator analyzerStyle
</lov-mermaid>

### Component Responsibilities

#### Metrics Collector
**Collected Metrics:**
- Execution count (success/failure)
- Duration (p50, p95, p99)
- Error rate
- API call count
- Data transferred
- Cost per execution

**Aggregation Windows:**
- 1-minute (realtime dashboard)
- 5-minute (recent activity)
- 1-hour (trend analysis)
- 1-day (business metrics)

---

#### Health Scorer
**Algorithm:**
```typescript
function calculateHealthScore(workflow: Workflow): number {
  const reliability = successRate * 0.3;     // 30% weight
  const efficiency = (1 / avgDuration) * 0.25; // 25% weight
  const cost = (1 / avgCost) * 0.2;            // 20% weight
  const security = securityScore * 0.25;       // 25% weight
  
  return Math.round((reliability + efficiency + cost + security) * 100);
}
```

**Score Ranges:**
- 90-100: Excellent 🟢
- 70-89: Good 🟡
- 50-69: Needs Improvement 🟠
- 0-49: Critical 🔴

---

#### Cost Calculator
**Cost Model:**
```
Transaction Cost = Base Cost + (Node Count * $0.0001) + (Duration * $0.00001/sec)
Storage Cost = (Execution History Size) * $0.10/GB/month
API Cost = (External API Calls) * $0.001/call
AI Cost = (Token Count) * $0.002/1K tokens
```

**Optimization Suggestions:**
- Reduce redundant nodes
- Cache frequent API calls
- Archive old executions
- Use cheaper AI models

---

## AI Service Components

<lov-mermaid>
graph TB
    subgraph AIService["AI Service"]
        PromptEngine["Prompt Engine<br/>---<br/>Template management<br/>Context injection"]
        
        WorkflowParser["Workflow Parser<br/>---<br/>JSON validation<br/>Guardrail insertion"]
        
        InsightsGenerator["Insights Generator<br/>---<br/>Pattern detection<br/>Recommendation AI"]
        
        AICache["AI Cache<br/>---<br/>Response caching<br/>Semantic similarity"]
        
        TokenTracker["Token Tracker<br/>---<br/>Usage monitoring<br/>Cost attribution"]
        
        RateLimitManager["Rate Limit Manager<br/>---<br/>429 handling<br/>Exponential backoff"]
    end

    PromptEngine -->|"Generates"| WorkflowParser
    WorkflowParser -->|"Validates"| InsightsGenerator
    InsightsGenerator -->|"Checks cache"| AICache
    InsightsGenerator -->|"Tracks"| TokenTracker
    InsightsGenerator -->|"Manages limits"| RateLimitManager
    
    classDef aiStyle fill:#9B59B6,stroke:#6C3483,stroke-width:2px,color:#fff
    
    class PromptEngine,WorkflowParser,InsightsGenerator,AICache,TokenTracker,RateLimitManager aiStyle
</lov-mermaid>

### Component Responsibilities

#### Prompt Engine
**Prompt Templates:**
```typescript
const WORKFLOW_GENERATION_PROMPT = `
You are a workflow automation expert. Convert the following natural language description into a FlowFuse workflow JSON.

Requirements:
- Use only these node types: trigger, action, condition, loop
- Include guardrails for data validation
- Add error handling
- Optimize for performance

User Input: {user_input}

Output a valid JSON workflow following this schema: {schema}
`;
```

**Context Injection:**
- User's existing workflows (for pattern learning)
- Available integrations
- Workspace preferences
- Industry best practices

---

#### Workflow Parser
**Validation Steps:**
1. Parse JSON structure
2. Validate against schema (Zod)
3. Check for cycles
4. Verify node connections
5. Insert missing guardrails
6. Add error handling nodes
7. Optimize node order

---

#### Insights Generator
**Insight Types:**
- Performance bottlenecks
- Cost optimization opportunities
- Security vulnerabilities
- Redundant workflows
- Integration suggestions
- Automation candidates

**Example Insight:**
```json
{
  "type": "cost_optimization",
  "severity": "medium",
  "title": "Reduce API calls by 40%",
  "description": "Workflow 'Process Orders' makes 5 identical API calls. Cache the response.",
  "estimated_savings": "$120/month",
  "implementation_effort": "low"
}
```

---

## Web Application Components

<lov-mermaid>
graph TB
    subgraph WebApp["Web Application (React)"]
        WorkflowCanvas["Workflow Canvas<br/>---<br/>Visual node editor<br/>Drag & drop<br/>React Flow"]
        
        CodeEditor["Code Editor<br/>---<br/>Custom node logic<br/>Monaco Editor"]
        
        DashboardUI["Dashboard UI<br/>---<br/>Metrics & charts<br/>Recharts"]
        
        SettingsPanel["Settings Panel<br/>---<br/>Config management<br/>Form validation"]
        
        AuthManager["Auth Manager<br/>---<br/>JWT handling<br/>Session mgmt"]
        
        StateStore["State Store<br/>---<br/>React Query<br/>Global state"]
        
        WebSocketClient["WebSocket Client<br/>---<br/>Realtime updates<br/>Auto-reconnect"]
    end

    WorkflowCanvas -->|"Saves changes"| StateStore
    CodeEditor -->|"Validates syntax"| WorkflowCanvas
    DashboardUI -->|"Fetches data"| StateStore
    SettingsPanel -->|"Updates config"| StateStore
    AuthManager -->|"Protects routes"| WorkflowCanvas
    WebSocketClient -->|"Updates"| StateStore
    
    classDef uiStyle fill:#3498DB,stroke:#2471A3,stroke-width:2px,color:#fff
    classDef stateStyle fill:#E74C3C,stroke:#C0392B,stroke-width:2px,color:#fff
    
    class WorkflowCanvas,CodeEditor,DashboardUI,SettingsPanel uiStyle
    class AuthManager,StateStore,WebSocketClient stateStyle
</lov-mermaid>

---

## Next Level: Code Diagram
See [C4_LEVEL_4_CODE.md](./C4_LEVEL_4_CODE.md) for code-level implementation details.
