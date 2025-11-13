# C4 Architecture Model - Complete Summary

## Document Structure

1. **[Level 1: System Context](./C4_LEVEL_1_SYSTEM_CONTEXT.md)** - Big picture view showing FlowFuse's place in the enterprise ecosystem
2. **[Level 2: Containers](./C4_LEVEL_2_CONTAINERS.md)** - Technical architecture with microservices, databases, and external systems
3. **[Level 3: Components](./C4_LEVEL_3_COMPONENTS.md)** - Internal components of each service
4. **[Level 4: Code](./C4_LEVEL_4_CODE.md)** - Implementation details and key classes

## Key Architecture Highlights

### Microservices
- Workflow Engine Service
- Integration Service  
- Analytics Service
- Marketplace Service
- AI Service
- Compliance Service

### Data Layer
- PostgreSQL (partitioned, RLS-enabled)
- Redis (caching, rate limits)
- Blob Storage (S3-compatible)
- Time-Series DB (metrics)

### Security
- Multi-tenancy with workspace isolation
- Rate limiting per workspace (5000 req/hour)
- API key hashing (SHA-256)
- Encrypted credentials (AES-256-GCM)
- Circuit breakers for resilience

### Scalability
- Horizontal auto-scaling
- Database partitioning
- 80% cache hit rate
- Sub-200ms response times
- 1M+ daily executions

## Compliance
- SOC 2 Type II
- GDPR compliant
- HIPAA ready
- PCI-DSS standards
