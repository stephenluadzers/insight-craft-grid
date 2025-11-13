# C4 Model - Level 2: Container Diagram
## FlowFuse Technical Architecture

### Overview
This diagram shows the major containers (applications, data stores, microservices) that make up FlowFuse and how they interact.

---

## Container Diagram

<lov-mermaid>
graph TB
    subgraph Users["👥 Users"]
        WebUser["Web Browser<br/>(Workflow Creators)"]
        MobileUser["Mobile App<br/>(iOS/Android)"]
        APIClient["API Client<br/>(Developers)"]
        EmbeddedUser["Embedded Widget<br/>(End Users)"]
    end

    subgraph FlowFuse_Containers["🎯 FlowFuse Platform"]
        
        subgraph Frontend["Frontend Layer"]
            WebApp["Web Application<br/>---<br/>React + TypeScript<br/>Vite + Tailwind<br/>Port: 443"]
            MobileApp["Mobile PWA<br/>---<br/>React Native<br/>Offline-capable"]
            EmbedSDK["Embed SDK<br/>---<br/>JavaScript SDK<br/>White-label widgets"]
        end
        
        subgraph APIGateway["API Gateway Layer"]
            APIGatewayService["API Gateway<br/>---<br/>Rate limiting<br/>Auth validation<br/>Request routing<br/>Circuit breakers"]
        end
        
        subgraph Services["Microservices Layer"]
            WorkflowEngine["Workflow Engine Service<br/>---<br/>Execute workflows<br/>Schedule cron jobs<br/>Debug sessions<br/>Test runs<br/>Port: Functions"]
            
            IntegrationService["Integration Service<br/>---<br/>Manage connectors<br/>Store credentials<br/>Sync data<br/>Webhooks<br/>Port: Functions"]
            
            AnalyticsService["Analytics Service<br/>---<br/>Real-time metrics<br/>Health scoring<br/>Cost analysis<br/>ROI calculation<br/>Port: Functions"]
            
            MarketplaceService["Marketplace Service<br/>---<br/>Template discovery<br/>Reviews & ratings<br/>Installations<br/>Billing integration<br/>Port: Functions"]
            
            AIService["AI Service<br/>---<br/>Workflow generation<br/>Insights engine<br/>Recommendations<br/>NL to workflow<br/>Port: Functions"]
            
            ComplianceService["Compliance Service<br/>---<br/>Security scans<br/>Audit logs<br/>GDPR reports<br/>Data residency<br/>Port: Functions"]
        end
        
        subgraph DataLayer["Data Layer"]
            PostgreSQL["PostgreSQL Database<br/>---<br/>Workflows<br/>Executions<br/>Users & Workspaces<br/>Audit logs<br/>Port: 5432"]
            
            RedisCache["Redis Cache<br/>---<br/>Session store<br/>Rate limits<br/>Workflow defs<br/>TTL: 5-60min<br/>Port: 6379"]
            
            BlobStorage["Blob Storage<br/>---<br/>File uploads<br/>Workflow exports<br/>Compliance docs<br/>S3-compatible"]
            
            TimeSeries["Time-Series DB<br/>---<br/>Metrics<br/>Traces<br/>Performance data<br/>InfluxDB/Prometheus"]
        end
        
        subgraph MessageQueue["Event/Message Queue"]
            EventBus["Event Bus<br/>---<br/>Workflow events<br/>Pub/Sub pattern<br/>Dead letter queue<br/>Realtime updates"]
        end
    end

    subgraph ExternalServices["🔌 External Services"]
        SupabaseAuth["Supabase Auth<br/>---<br/>JWT tokens<br/>OAuth providers<br/>MFA<br/>Port: 443"]
        
        LovableAI["Lovable AI Gateway<br/>---<br/>GPT-5 & Gemini<br/>Streaming responses<br/>Rate limited<br/>Port: 443"]
        
        StripeAPI["Stripe API<br/>---<br/>Payments<br/>Subscriptions<br/>Invoices<br/>Port: 443"]
        
        Integrations["Integration APIs<br/>---<br/>500+ connectors<br/>OAuth flows<br/>Webhooks<br/>Port: 443"]
        
        ObservabilityPlatform["Observability Platform<br/>---<br/>OpenTelemetry<br/>Distributed tracing<br/>Sentry errors<br/>Port: 443"]
    end

    %% User to Frontend
    WebUser -->|"HTTPS"| WebApp
    MobileUser -->|"HTTPS"| MobileApp
    APIClient -->|"REST/GraphQL<br/>API Keys"| APIGatewayService
    EmbeddedUser -->|"JavaScript"| EmbedSDK

    %% Frontend to API Gateway
    WebApp -->|"REST/GraphQL<br/>JWT Auth"| APIGatewayService
    MobileApp -->|"REST/GraphQL<br/>JWT Auth"| APIGatewayService
    EmbedSDK -->|"REST API<br/>White-label keys"| APIGatewayService

    %% API Gateway to Services
    APIGatewayService -->|"Internal RPC"| WorkflowEngine
    APIGatewayService -->|"Internal RPC"| IntegrationService
    APIGatewayService -->|"Internal RPC"| AnalyticsService
    APIGatewayService -->|"Internal RPC"| MarketplaceService
    APIGatewayService -->|"Internal RPC"| AIService
    APIGatewayService -->|"Internal RPC"| ComplianceService

    %% Services to Data Layer
    WorkflowEngine -->|"SQL<br/>Connection pool"| PostgreSQL
    IntegrationService -->|"SQL<br/>Connection pool"| PostgreSQL
    AnalyticsService -->|"SQL<br/>Read replicas"| PostgreSQL
    MarketplaceService -->|"SQL<br/>Connection pool"| PostgreSQL
    AIService -->|"SQL<br/>Connection pool"| PostgreSQL
    ComplianceService -->|"SQL<br/>Connection pool"| PostgreSQL

    %% Services to Cache
    WorkflowEngine -->|"GET/SET<br/>Workflow defs"| RedisCache
    IntegrationService -->|"GET/SET<br/>OAuth tokens"| RedisCache
    APIGatewayService -->|"INCR<br/>Rate limits"| RedisCache
    AnalyticsService -->|"GET/SET<br/>Aggregations"| RedisCache

    %% Services to Storage
    WorkflowEngine -->|"PUT/GET<br/>Exports"| BlobStorage
    ComplianceService -->|"PUT/GET<br/>Audit docs"| BlobStorage
    IntegrationService -->|"PUT/GET<br/>File uploads"| BlobStorage

    %% Services to Time-Series
    WorkflowEngine -->|"Write metrics"| TimeSeries
    AnalyticsService -->|"Query metrics"| TimeSeries
    APIGatewayService -->|"Write traces"| TimeSeries

    %% Services to Event Bus
    WorkflowEngine -->|"Publish events"| EventBus
    IntegrationService -->|"Subscribe events"| EventBus
    AnalyticsService -->|"Subscribe events"| EventBus
    WebApp -->|"WebSocket<br/>Subscribe"| EventBus

    %% Services to External
    WorkflowEngine -->|"HTTPS<br/>Execute actions"| Integrations
    IntegrationService -->|"HTTPS<br/>OAuth"| Integrations
    AIService -->|"HTTPS<br/>Streaming"| LovableAI
    MarketplaceService -->|"HTTPS<br/>Payments"| StripeAPI
    APIGatewayService -->|"HTTPS<br/>Verify JWT"| SupabaseAuth
    WorkflowEngine -->|"OTLP<br/>Traces"| ObservabilityPlatform
    ComplianceService -->|"HTTPS<br/>Errors"| ObservabilityPlatform

    classDef frontendStyle fill:#4A90E2,stroke:#2E5C8A,stroke-width:2px,color:#fff
    classDef serviceStyle fill:#7B68EE,stroke:#4B3A9E,stroke-width:2px,color:#fff
    classDef dataStyle fill:#FF6B6B,stroke:#CC5555,stroke-width:2px,color:#fff
    classDef externalStyle fill:#50C878,stroke:#2E7D52,stroke-width:2px,color:#fff
    classDef gatewayStyle fill:#FFD700,stroke:#B8860B,stroke-width:3px,color:#000
    
    class WebApp,MobileApp,EmbedSDK frontendStyle
    class WorkflowEngine,IntegrationService,AnalyticsService,MarketplaceService,AIService,ComplianceService serviceStyle
    class PostgreSQL,RedisCache,BlobStorage,TimeSeries,EventBus dataStyle
    class SupabaseAuth,LovableAI,StripeAPI,Integrations,ObservabilityPlatform externalStyle
    class APIGatewayService gatewayStyle
</lov-mermaid>

---

## Container Details

### Frontend Layer

#### Web Application
**Technology:** React 18 + TypeScript + Vite  
**Purpose:** Primary user interface for workflow creation and management  
**Key Features:**
- Visual workflow canvas (React Flow)
- Real-time collaboration
- Code editor (Monaco)
- Analytics dashboards
- Settings & configuration

**Responsibilities:**
- Render UI components
- Handle user interactions
- Manage client-side state (React Query)
- WebSocket connections for realtime
- Offline-first PWA capabilities

**Scale:** Served via CDN, globally distributed

---

#### Mobile PWA
**Technology:** React Native + Expo  
**Purpose:** Mobile access to workflows and monitoring  
**Key Features:**
- Workflow execution triggers
- Push notifications
- Execution history
- Quick actions
- Offline mode

**Responsibilities:**
- Native mobile experience
- Background sync
- Biometric authentication
- Deep linking

**Scale:** App stores + web PWA

---

#### Embed SDK
**Technology:** Vanilla JavaScript + TypeScript  
**Purpose:** White-label workflow widgets for customer apps  
**Key Features:**
- Customizable branding
- Single workflow execution
- Minimal bundle size (< 50KB)
- Framework-agnostic

**Responsibilities:**
- Sandboxed iframe rendering
- Secure communication (postMessage)
- Theme customization
- Analytics tracking

**Scale:** NPM package + CDN

---

### API Gateway Layer

#### API Gateway Service
**Technology:** Supabase Edge Functions (Deno)  
**Purpose:** Unified entry point for all API requests  
**Port:** Functions endpoint

**Responsibilities:**
1. **Authentication & Authorization**
   - Validate JWT tokens
   - Verify API keys
   - Check workspace membership
   - Enforce RBAC policies

2. **Rate Limiting**
   - Per-workspace limits (5000 req/hour)
   - Per-API-key limits
   - Circuit breaker patterns
   - Graceful degradation

3. **Request Routing**
   - Route to appropriate service
   - Load balancing
   - Retry logic with exponential backoff
   - Timeout management

4. **Observability**
   - Request logging
   - Distributed tracing
   - Metrics collection
   - Error aggregation

**Scale:** Auto-scaling Deno workers

---

### Microservices Layer

#### Workflow Engine Service
**Technology:** Deno + TypeScript  
**Purpose:** Core workflow orchestration and execution  
**Endpoints:**
- `POST /execute` - Execute workflow
- `POST /schedule` - Schedule cron job
- `POST /debug` - Start debug session
- `POST /test` - Run test suite

**Responsibilities:**
- Parse workflow JSON
- Execute nodes in correct order
- Handle branching/loops
- Manage state checkpoints
- Error handling & retries
- Circuit breaker integration
- Dead letter queue for failures

**Data Access:**
- workflows, workflow_executions (read/write)
- workflow_execution_logs (write)
- workflow_queue (read/write)
- workflow_dead_letter_queue (write)

**Scale:** Stateless, horizontal scaling

---

#### Integration Service
**Technology:** Deno + TypeScript  
**Purpose:** Manage third-party integrations and credentials  
**Endpoints:**
- `POST /integrations` - Create integration
- `GET /integrations` - List integrations
- `POST /oauth/authorize` - Start OAuth flow
- `POST /webhooks` - Register webhook

**Responsibilities:**
- OAuth 2.0 flows
- Credential encryption (AES-256-GCM)
- Webhook registration
- API versioning
- Rate limit coordination
- Token refresh

**Data Access:**
- integration_templates (read)
- workspace_credentials (read/write, encrypted)
- workflow_webhooks (read/write)
- webhook_delivery_logs (write)

**Scale:** Stateless, horizontal scaling

---

#### Analytics Service
**Technology:** Deno + TypeScript  
**Purpose:** Real-time metrics and business intelligence  
**Endpoints:**
- `GET /metrics/realtime` - Current metrics
- `GET /metrics/historical` - Time-series data
- `GET /health-score` - Workflow health
- `GET /roi` - Cost analysis

**Responsibilities:**
- Aggregate execution metrics
- Calculate health scores
- Generate ROI reports
- Cost estimation
- SLA monitoring
- Anomaly detection

**Data Access:**
- workflow_executions (read, with indexes)
- workflow_performance_metrics (read)
- workflow_health_scores (write)
- workflow_business_metrics (read/write)

**Scale:** Read replicas for queries

---

#### Marketplace Service
**Technology:** Deno + TypeScript  
**Purpose:** Workflow template marketplace  
**Endpoints:**
- `GET /marketplace` - Browse templates
- `POST /marketplace/install` - Install template
- `POST /marketplace/review` - Add review
- `GET /marketplace/purchases` - User purchases

**Responsibilities:**
- Template discovery
- Installation flow
- Review moderation
- Payment integration (Stripe)
- Revenue share calculations
- Analytics tracking

**Data Access:**
- marketplace_workflows (read/write)
- marketplace_reviews (read/write)
- marketplace_installs (write)
- marketplace_categories (read)

**Scale:** Stateless, CDN for images

---

#### AI Service
**Technology:** Deno + TypeScript  
**Purpose:** AI-powered workflow features  
**Endpoints:**
- `POST /generate` - NL to workflow
- `POST /insights` - Generate insights
- `POST /recommendations` - Get suggestions
- `POST /optimize` - Optimize workflow

**Responsibilities:**
- Call Lovable AI Gateway
- Parse AI responses
- Validate generated workflows
- Cache AI responses
- Track AI usage/costs
- Handle rate limits

**Data Access:**
- workflows (read/write)
- workflow_ai_insights (write)
- workflow_recommendations (write)
- workflow_integration_suggestions (write)

**Scale:** Queue-based for async processing

---

#### Compliance Service
**Technology:** Deno + TypeScript  
**Purpose:** Security and compliance management  
**Endpoints:**
- `POST /scan` - Security scan
- `GET /reports` - Compliance reports
- `GET /audit-log` - Audit trail
- `POST /data-residency` - Configure residency

**Responsibilities:**
- Automated security scans
- GDPR compliance checks
- SOC 2 audit logging
- HIPAA data handling
- Data residency enforcement
- Breach detection

**Data Access:**
- workflow_security_scans (read/write)
- compliance_reports (read/write)
- workflow_compliance_logs (write, append-only)
- audit_logs (write, immutable)

**Scale:** Background jobs, cron-based

---

### Data Layer

#### PostgreSQL Database
**Technology:** Supabase-managed PostgreSQL 15  
**Port:** 5432 (internal)  
**Purpose:** Primary persistent data store

**Schema:**
- 50+ tables
- Row-level security (RLS)
- Partitioned tables (executions)
- Materialized views (analytics)
- Full-text search indexes
- Foreign key constraints

**Backup:**
- Point-in-time recovery (PITR)
- Daily snapshots (retained 30 days)
- Geo-redundant backups

**Scale:** 
- Connection pooling (PgBouncer)
- Read replicas for analytics
- Table partitioning by date

---

#### Redis Cache
**Technology:** Redis 7.x  
**Port:** 6379 (internal)  
**Purpose:** High-speed caching and session store

**Data Types:**
- Workflow definitions (string, TTL: 5min)
- OAuth tokens (string, TTL: 60min)
- Rate limit counters (number, TTL: 1hour)
- Session data (hash, TTL: 24hour)
- Pub/Sub channels (realtime events)

**Eviction:** LRU (Least Recently Used)

**Scale:**
- Redis Cluster for HA
- 80% cache hit rate
- Sub-1ms latency

---

#### Blob Storage
**Technology:** Supabase Storage (S3-compatible)  
**Purpose:** File storage for large objects

**Buckets:**
- `workflow-exports` - JSON/YAML exports
- `compliance-docs` - Audit reports (encrypted)
- `user-uploads` - File attachments
- `backups` - Database dumps

**Security:**
- Pre-signed URLs (time-limited)
- Encryption at rest
- Versioning enabled
- Lifecycle policies (auto-archive)

**Scale:** Object storage, unlimited

---

#### Time-Series Database
**Technology:** InfluxDB / Prometheus  
**Purpose:** Metrics and trace data

**Metrics:**
- Execution duration (p50, p95, p99)
- Request rate (req/s)
- Error rate (%)
- Cache hit rate (%)
- Queue depth

**Retention:**
- Raw data: 7 days
- 5-minute rollups: 30 days
- Hourly rollups: 1 year

**Scale:** Time-based partitioning

---

### Message Queue

#### Event Bus
**Technology:** Supabase Realtime + Custom Pub/Sub  
**Purpose:** Asynchronous event processing

**Channels:**
- `workflow:started` - Workflow initiated
- `workflow:completed` - Workflow finished
- `workflow:failed` - Workflow error
- `node:executed` - Node completed
- `approval:required` - Human-in-loop

**Features:**
- At-least-once delivery
- Dead letter queue for failures
- Message ordering per workflow
- Automatic retries (exponential backoff)

**Scale:** Distributed, high-throughput

---

## Data Flow Examples

### Workflow Execution Flow
```
1. User clicks "Run" in Web App
2. Web App → API Gateway [JWT Auth]
3. API Gateway → Workflow Engine [Internal RPC]
4. Workflow Engine → PostgreSQL [Save execution record]
5. Workflow Engine → Event Bus [Publish "started"]
6. Workflow Engine → Integration Service [Execute nodes]
7. Integration Service → External API [Call webhook]
8. Integration Service → PostgreSQL [Log node execution]
9. Workflow Engine → Event Bus [Publish "completed"]
10. Event Bus → Web App [WebSocket update]
11. Workflow Engine → Analytics Service [Record metrics]
12. Analytics Service → Time-Series DB [Save datapoints]
```

### AI Workflow Generation Flow
```
1. User types "Send email when Stripe payment succeeds"
2. Web App → API Gateway → AI Service
3. AI Service → Redis [Check cache, miss]
4. AI Service → Lovable AI Gateway [Stream completion]
5. AI Service parses JSON workflow definition
6. AI Service → PostgreSQL [Save generated workflow]
7. AI Service → Redis [Cache response, TTL: 60min]
8. AI Service → Web App [Return workflow JSON]
9. Web App renders workflow on canvas
```

---

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Frontend Framework** | React 18 | Large ecosystem, TypeScript support, Concurrent Mode |
| **Backend Runtime** | Deno (Edge Functions) | TypeScript-native, secure by default, fast cold starts |
| **Database** | PostgreSQL | ACID compliance, JSON support, RLS, proven at scale |
| **Cache** | Redis | Sub-millisecond latency, rich data structures, Pub/Sub |
| **Auth** | Supabase Auth | Built-in JWT, OAuth, MFA, enterprise SSO |
| **AI Gateway** | Lovable AI | Unified API for GPT-5 + Gemini, auto-scaling, cost-effective |
| **Observability** | OpenTelemetry | Vendor-neutral, distributed tracing, wide adoption |
| **Message Queue** | Supabase Realtime | Native integration, WebSocket, low latency |

---

## Security Architecture

### Defense in Depth

```
Layer 1: Network (TLS 1.3, DDoS protection)
Layer 2: API Gateway (Rate limiting, auth, validation)
Layer 3: Application (Input sanitization, RBAC)
Layer 4: Database (RLS, encrypted fields)
Layer 5: Audit (Immutable logs, compliance reports)
```

### Secrets Management
- API keys hashed (SHA-256, never stored plaintext)
- OAuth tokens encrypted (AES-256-GCM)
- Database credentials in env (rotated quarterly)
- Secrets in Supabase Vault (encrypted at rest)

---

## Next Level: Component Diagram
See [C4_LEVEL_3_COMPONENTS.md](./C4_LEVEL_3_COMPONENTS.md) for detailed component breakdowns.
