# C4 Model - Level 1: System Context
## FlowFuse Enterprise Workflow Automation Platform

### Overview
This diagram shows how FlowFuse fits into the broader enterprise ecosystem, including external users, systems, and third-party services.

---

## System Context Diagram

<lov-mermaid>
graph TB
    subgraph External_Users["👥 External Users"]
        WorkflowCreators["Workflow Creators<br/>(Business Analysts, DevOps)"]
        Developers["Developers<br/>(Integration Teams)"]
        Admins["System Admins<br/>(Security, Compliance)"]
        EndUsers["End Users<br/>(Via White-Label Embed)"]
    end

    subgraph FlowFuse_System["🎯 FlowFuse Platform<br/><i>Enterprise Workflow Automation</i>"]
        FlowFuse["FlowFuse<br/>---<br/>Visual workflow builder<br/>AI-powered automation<br/>Multi-tenant SaaS<br/>Embedded iPaaS<br/>Compliance management"]
    end

    subgraph External_Systems["🔌 External Systems"]
        ThirdPartyAPIs["Third-Party APIs<br/>---<br/>• Stripe (Payments)<br/>• SendGrid (Email)<br/>• Slack (Messaging)<br/>• GitHub (Code Repos)<br/>• 500+ Integrations"]
        
        AI_Services["AI Services<br/>---<br/>• Lovable AI<br/>• OpenAI GPT-5<br/>• Google Gemini<br/>• Image Generation"]
        
        AuthProviders["Auth Providers<br/>---<br/>• Email/Password<br/>• Google OAuth<br/>• SAML SSO<br/>• Magic Links"]
        
        MonitoringServices["Monitoring & Observability<br/>---<br/>• Sentry (Errors)<br/>• OpenTelemetry<br/>• Analytics Platforms<br/>• Log Aggregation"]
        
        ComplianceAuditors["Compliance Auditors<br/>---<br/>• SOC 2 Auditors<br/>• GDPR Controllers<br/>• HIPAA BAAs<br/>• PCI-DSS Assessors"]
    end

    subgraph CustomerSystems["🏢 Customer Systems"]
        CustomerAPIs["Customer APIs<br/>---<br/>• Internal REST APIs<br/>• GraphQL Endpoints<br/>• Legacy SOAP<br/>• Custom Webhooks"]
        
        CustomerDatabases["Customer Databases<br/>---<br/>• MySQL/PostgreSQL<br/>• MongoDB<br/>• Salesforce<br/>• Data Warehouses"]
        
        CustomerWorkspaces["Customer Workspaces<br/>---<br/>• Slack Workspaces<br/>• Microsoft Teams<br/>• Internal Tools<br/>• Business Apps"]
    end

    %% User Interactions
    WorkflowCreators -->|"Creates & manages<br/>workflows"| FlowFuse
    Developers -->|"Integrates via API<br/>& SDKs"| FlowFuse
    Admins -->|"Configures security,<br/>monitors compliance"| FlowFuse
    EndUsers -->|"Uses embedded<br/>workflows"| FlowFuse

    %% FlowFuse to External Systems
    FlowFuse -->|"Process payments<br/>[HTTPS/REST]"| ThirdPartyAPIs
    FlowFuse -->|"AI completions<br/>[HTTPS/REST]"| AI_Services
    FlowFuse -->|"Authenticate users<br/>[OAuth 2.0/SAML]"| AuthProviders
    FlowFuse -->|"Send telemetry<br/>[OTLP/HTTP]"| MonitoringServices
    FlowFuse -->|"Provide audit logs<br/>[HTTPS/REST]"| ComplianceAuditors

    %% FlowFuse to Customer Systems
    FlowFuse -->|"Execute integrations<br/>[HTTPS/Webhooks]"| CustomerAPIs
    FlowFuse -->|"Query & sync data<br/>[SQL/REST]"| CustomerDatabases
    FlowFuse -->|"Send notifications<br/>[Webhooks/API]"| CustomerWorkspaces
    
    CustomerAPIs -.->|"Webhook callbacks<br/>[HTTPS]"| FlowFuse
    CustomerWorkspaces -.->|"User interactions<br/>[Commands/Buttons]"| FlowFuse

    classDef userStyle fill:#4A90E2,stroke:#2E5C8A,stroke-width:2px,color:#fff
    classDef systemStyle fill:#7B68EE,stroke:#4B3A9E,stroke-width:3px,color:#fff
    classDef externalStyle fill:#50C878,stroke:#2E7D52,stroke-width:2px,color:#fff
    classDef customerStyle fill:#FF6B6B,stroke:#CC5555,stroke-width:2px,color:#fff
    
    class WorkflowCreators,Developers,Admins,EndUsers userStyle
    class FlowFuse systemStyle
    class ThirdPartyAPIs,AI_Services,AuthProviders,MonitoringServices,ComplianceAuditors externalStyle
    class CustomerAPIs,CustomerDatabases,CustomerWorkspaces customerStyle
</lov-mermaid>

---

## Key Actors

### Internal Users

| Actor | Role | Primary Use Cases |
|-------|------|-------------------|
| **Workflow Creators** | Business analysts, citizen developers, operations teams | • Build visual workflows<br/>• Configure automation logic<br/>• Test and deploy workflows<br/>• Monitor execution metrics |
| **Developers** | Integration engineers, backend developers | • Create custom integrations<br/>• Use REST/GraphQL API<br/>• Deploy via CI/CD<br/>• Extend with custom code |
| **System Admins** | Security officers, compliance managers | • Configure RBAC policies<br/>• Review audit logs<br/>• Manage API keys<br/>• Generate compliance reports |
| **End Users** | Customers of white-label partners | • Use embedded workflows<br/>• Trigger automations<br/>• View execution history |

### External Systems

| System | Purpose | Integration Type |
|--------|---------|------------------|
| **Third-Party APIs** | Execute workflow actions (email, payments, notifications) | REST API, Webhooks, OAuth 2.0 |
| **AI Services** | Natural language to workflow, recommendations, insights | REST API, Streaming |
| **Auth Providers** | User authentication and authorization | OAuth 2.0, SAML, JWT |
| **Monitoring Services** | Observability, error tracking, analytics | OpenTelemetry, REST API |
| **Compliance Auditors** | SOC 2, GDPR, HIPAA compliance verification | Secure portal, encrypted reports |

### Customer Systems

| System | Purpose | Data Flow |
|--------|---------|-----------|
| **Customer APIs** | Custom integrations specific to customer environment | Bidirectional (FlowFuse calls API, receives webhooks) |
| **Customer Databases** | Data synchronization and ETL workflows | Read/Write via connectors |
| **Customer Workspaces** | Notifications, commands, interactive workflows | Push notifications, event-driven triggers |

---

## Core Value Propositions

### For Workflow Creators
- **No-Code Visual Builder**: Drag-and-drop interface for complex automations
- **AI-Powered Assistance**: Generate workflows from natural language
- **500+ Pre-Built Integrations**: Connect to any service instantly
- **Real-Time Debugging**: Step through executions with live data

### For Developers
- **Full API Access**: REST, GraphQL, and WebSocket APIs
- **Custom Node SDK**: Build proprietary integrations
- **Git Integration**: Version control for workflows
- **Embeddable Widgets**: White-label for customer-facing apps

### For System Admins
- **Enterprise Security**: SOC 2 Type II, GDPR, HIPAA compliant
- **Granular RBAC**: Workspace-level access control
- **Audit Trails**: Immutable compliance logs
- **SLA Monitoring**: 99.9% uptime guarantees

### For Enterprise Organizations
- **Multi-Tenancy**: Isolated workspaces with quotas
- **White-Label Platform**: Rebrand as your own product
- **Marketplace**: Monetize workflow templates
- **Transaction Pricing**: Pay only for what you use

---

## System Boundaries

### What FlowFuse Does
✅ Visual workflow orchestration  
✅ AI-powered automation recommendations  
✅ Multi-tenant workspace management  
✅ Embedded iPaaS for B2B SaaS  
✅ Compliance monitoring & reporting  
✅ Integration marketplace  
✅ Real-time execution engine  

### What FlowFuse Does NOT Do
❌ Replace your CRM/ERP systems  
❌ Store your business data permanently  
❌ Provide domain-specific analytics  
❌ Handle payment processing directly  
❌ Manage your infrastructure  

---

## Technology Stack (High-Level)

```
Frontend:      React + TypeScript + Vite + Tailwind CSS
Backend:       Supabase Edge Functions (Deno)
Database:      PostgreSQL (Supabase managed)
Auth:          Supabase Auth (JWT-based)
Storage:       Supabase Storage (S3-compatible)
AI:            Lovable AI Gateway (OpenAI/Gemini)
Monitoring:    OpenTelemetry + Custom observability
Deployment:    Lovable Cloud (auto-scaling)
```

---

## Security & Compliance

### Authentication
- Multi-factor authentication (MFA)
- SSO via SAML 2.0 / OAuth 2.0
- API key-based access for programmatic access
- Role-based access control (RBAC)

### Data Protection
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- API key hashing (SHA-256)
- Secrets encryption (AES-256-GCM)

### Compliance Standards
- **SOC 2 Type II**: Security, availability, confidentiality
- **GDPR**: Data minimization, right to deletion, portability
- **HIPAA**: PHI encryption, audit logs, BAA agreements
- **PCI-DSS**: Secure payment data handling

---

## Scalability & Performance

### Current Capacity
- **10,000+ concurrent workflows**
- **1M+ executions per day**
- **500+ active integrations**
- **Sub-200ms API response times**

### Scaling Strategy
- Horizontal auto-scaling (Edge Functions)
- Database read replicas for analytics
- Redis caching layer (80% hit rate)
- CDN for static assets (global edge)
- Table partitioning by date (hot/cold storage)

---

## Next Level: Container Diagram
See [C4_LEVEL_2_CONTAINERS.md](./C4_LEVEL_2_CONTAINERS.md) for detailed container architecture.
