import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";

interface EnterpriseFeature {
  title: string;
  status: "implemented" | "partial" | "missing";
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  implementation?: string[];
}

const enterpriseFeatures: EnterpriseFeature[] = [
  {
    title: "Multi-Tenancy & Workspace Isolation",
    status: "implemented",
    priority: "critical",
    description: "Strict data isolation between workspaces with RLS policies",
    implementation: [
      "✅ Workspace-based data segregation",
      "✅ Role-based access control (Owner, Admin, Editor, Viewer)",
      "✅ Row Level Security policies on all tables",
      "⚠️ Need: Cross-workspace data sharing controls",
    ]
  },
  {
    title: "Audit Logging & Compliance",
    status: "partial",
    priority: "critical",
    description: "Complete audit trail of all workflow operations",
    implementation: [
      "✅ Audit logs table with user actions",
      "✅ Webhook access logs with IP tracking",
      "✅ Execution history tracking",
      "❌ Missing: GDPR data export functionality",
      "❌ Missing: SOC2 compliance reports",
      "❌ Missing: Data retention policies automation",
    ]
  },
  {
    title: "Version Control & Rollback",
    status: "implemented",
    priority: "high",
    description: "Track workflow changes and enable rollback",
    implementation: [
      "✅ Workflow versions table",
      "✅ Version history with timestamps",
      "⚠️ Need: Diff visualization between versions",
      "⚠️ Need: One-click rollback mechanism",
      "❌ Missing: Branch/merge workflow paradigm",
    ]
  },
  {
    title: "Advanced Error Handling",
    status: "partial",
    priority: "critical",
    description: "Comprehensive error recovery and resilience",
    implementation: [
      "✅ Pre-flight validation",
      "✅ Runtime error reporting",
      "✅ Execution logs with detailed errors",
      "❌ Missing: Automatic retry with exponential backoff",
      "❌ Missing: Circuit breaker pattern",
      "❌ Missing: Dead letter queue for failed executions",
      "❌ Missing: Error aggregation dashboard",
    ]
  },
  {
    title: "Performance Monitoring & Observability",
    status: "missing",
    priority: "high",
    description: "Real-time monitoring and performance analytics",
    implementation: [
      "❌ Missing: Execution time tracking dashboard",
      "❌ Missing: Node performance metrics",
      "❌ Missing: Bottleneck detection",
      "❌ Missing: Resource usage monitoring",
      "❌ Missing: APM integration (DataDog, New Relic)",
      "❌ Missing: Custom alerting rules",
    ]
  },
  {
    title: "Workflow Execution Queue & Rate Limiting",
    status: "missing",
    priority: "high",
    description: "Scalable execution with concurrency controls",
    implementation: [
      "❌ Missing: Redis-based job queue",
      "❌ Missing: Priority-based execution",
      "❌ Missing: Concurrency limits per workspace",
      "❌ Missing: Rate limiting per integration",
      "❌ Missing: Queue monitoring dashboard",
      "❌ Missing: Auto-scaling based on queue depth",
    ]
  },
  {
    title: "Advanced Scheduling & Triggers",
    status: "partial",
    priority: "medium",
    description: "Sophisticated workflow triggering mechanisms",
    implementation: [
      "✅ Cron-based scheduling",
      "✅ Webhook triggers",
      "❌ Missing: Event-driven triggers (database changes)",
      "❌ Missing: Conditional triggers",
      "❌ Missing: Time zone support",
      "❌ Missing: Holiday/business day awareness",
    ]
  },
  {
    title: "Security & Secrets Management",
    status: "partial",
    priority: "critical",
    description: "Enterprise-grade secrets and credential management",
    implementation: [
      "✅ Encrypted credentials storage",
      "✅ Workspace-level credential isolation",
      "✅ Sensitive execution data with expiry",
      "❌ Missing: Secrets rotation automation",
      "❌ Missing: HashiCorp Vault integration",
      "❌ Missing: Per-node encryption keys",
      "❌ Missing: Credential usage audit trail",
    ]
  },
  {
    title: "Template Marketplace & Approval Workflow",
    status: "implemented",
    priority: "medium",
    description: "Curated workflow templates with governance",
    implementation: [
      "✅ Template approval system (draft/approved/rejected)",
      "✅ Template audit logging",
      "✅ Public/private template visibility",
      "⚠️ Need: Template rating system",
      "⚠️ Need: Template categories and search",
      "❌ Missing: Template monetization",
    ]
  },
  {
    title: "API & Integration Framework",
    status: "partial",
    priority: "high",
    description: "Extensible integration architecture",
    implementation: [
      "✅ Integration templates",
      "✅ Integration library UI",
      "❌ Missing: REST API for workflow management",
      "❌ Missing: GraphQL API",
      "❌ Missing: Webhook signature verification",
      "❌ Missing: OAuth 2.0 provider support",
      "❌ Missing: Custom integration SDK",
    ]
  },
  {
    title: "Testing & Quality Assurance",
    status: "missing",
    priority: "medium",
    description: "Automated testing framework for workflows",
    implementation: [
      "❌ Missing: Workflow test mode",
      "❌ Missing: Mock data injection",
      "❌ Missing: Integration test fixtures",
      "❌ Missing: Regression test suite",
      "❌ Missing: CI/CD pipeline integration",
    ]
  },
  {
    title: "Disaster Recovery & Backup",
    status: "missing",
    priority: "critical",
    description: "Data protection and business continuity",
    implementation: [
      "❌ Missing: Automated daily backups",
      "❌ Missing: Point-in-time recovery",
      "❌ Missing: Cross-region replication",
      "❌ Missing: Backup verification testing",
      "❌ Missing: Disaster recovery runbooks",
    ]
  },
  {
    title: "Advanced Analytics & Reporting",
    status: "missing",
    priority: "medium",
    description: "Business intelligence and insights",
    implementation: [
      "❌ Missing: Execution success/failure rates",
      "❌ Missing: Cost per execution tracking",
      "❌ Missing: ROI analytics",
      "❌ Missing: Custom report builder",
      "❌ Missing: Scheduled report delivery",
      "❌ Missing: Data export (CSV, PDF, Excel)",
    ]
  },
  {
    title: "Collaboration Features",
    status: "partial",
    priority: "medium",
    description: "Team collaboration and communication",
    implementation: [
      "✅ Workspace members management",
      "✅ Role-based permissions",
      "✅ Workflow comments (basic)",
      "❌ Missing: Real-time collaborative editing",
      "❌ Missing: @mention notifications",
      "❌ Missing: Workflow change notifications",
      "❌ Missing: Slack/Teams integration",
    ]
  },
];

const StatusIcon = ({ status }: { status: EnterpriseFeature["status"] }) => {
  switch (status) {
    case "implemented":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case "partial":
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    case "missing":
      return <Circle className="h-5 w-5 text-muted-foreground" />;
  }
};

const PriorityBadge = ({ priority }: { priority: EnterpriseFeature["priority"] }) => {
  const variants = {
    critical: "destructive",
    high: "default",
    medium: "secondary",
    low: "outline",
  } as const;
  
  return (
    <Badge variant={variants[priority]} className="ml-2">
      {priority.toUpperCase()}
    </Badge>
  );
};

export const EnterpriseReadinessGuide = () => {
  const stats = {
    implemented: enterpriseFeatures.filter(f => f.status === "implemented").length,
    partial: enterpriseFeatures.filter(f => f.status === "partial").length,
    missing: enterpriseFeatures.filter(f => f.status === "missing").length,
    total: enterpriseFeatures.length,
  };

  const completionPercentage = Math.round(
    ((stats.implemented + stats.partial * 0.5) / stats.total) * 100
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Enterprise Readiness Assessment</CardTitle>
          <CardDescription>
            Current maturity level: {completionPercentage}% enterprise-ready
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 border rounded-lg bg-green-50 dark:bg-green-950">
              <div className="text-3xl font-bold text-green-600">{stats.implemented}</div>
              <div className="text-sm text-muted-foreground">Implemented</div>
            </div>
            <div className="text-center p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950">
              <div className="text-3xl font-bold text-yellow-600">{stats.partial}</div>
              <div className="text-sm text-muted-foreground">Partial</div>
            </div>
            <div className="text-center p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
              <div className="text-3xl font-bold text-gray-600">{stats.missing}</div>
              <div className="text-sm text-muted-foreground">Missing</div>
            </div>
            <div className="text-center p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
              <div className="text-3xl font-bold text-blue-600">{completionPercentage}%</div>
              <div className="text-sm text-muted-foreground">Complete</div>
            </div>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {enterpriseFeatures.map((feature, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <StatusIcon status={feature.status} />
                    <span className="font-medium">{feature.title}</span>
                    <PriorityBadge priority={feature.priority} />
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pl-8 space-y-4">
                    <p className="text-muted-foreground">{feature.description}</p>
                    {feature.implementation && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm">Implementation Status:</h4>
                        <ul className="space-y-1 text-sm">
                          {feature.implementation.map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="mt-1">{item.startsWith("✅") ? "✅" : item.startsWith("⚠️") ? "⚠️" : "❌"}</span>
                              <span>{item.slice(2)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Priority Roadmap</CardTitle>
          <CardDescription>Recommended implementation order</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-red-600 mb-2">🔴 Critical Priority</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {enterpriseFeatures
                  .filter(f => f.priority === "critical" && f.status !== "implemented")
                  .map((f, i) => (
                    <li key={i}>{f.title}</li>
                  ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-orange-600 mb-2">🟠 High Priority</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {enterpriseFeatures
                  .filter(f => f.priority === "high" && f.status !== "implemented")
                  .map((f, i) => (
                    <li key={i}>{f.title}</li>
                  ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
