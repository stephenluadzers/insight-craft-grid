# Remora Flow: Best-of-Breed Build Plan

Surveyed 28 platforms (n8n, Zapier, Make, Workato, Pipedream, Tray, Activepieces, Windmill, Temporal, Prefect, Dagster, Airflow, LangGraph, Flowise, Langflow, Dify, Relevance, CrewAI, AutoGen, Vellum, Gumloop, Lindy, Bardeen, Sema4, Power Automate, Bubble, Retool, Inngest, Trigger.dev). Here's what we take, what we leapfrog, and the order to ship.

## What Remora already has (skip)
Liquid-glass canvas, AI generate pipeline, integration library (170+) with favorites/pins/filters, MCP server, dual-memory, guardrails, scan framework, marketplace, RBAC, learned node cache, workflow versions, edit locks, collaboration cursors, scheduled triggers, webhooks, security scans.

## Wave 1 — Debugging & Reliability (immediate impact)
Pain point #1 across every competitor.

1. **Step Inspector drawer** — click any node mid/post-run, see input JSON, output JSON, duration, retries, errors. (Make + Pipedream + Retool combined.)
2. **Visual error-branch ports** — red "error" handle on every node, route failures on canvas instead of hidden settings. (Make's killer feature.)
3. **Step-level retry policy** — max attempts, backoff (linear/expo), retry-on-condition. (Temporal/Inngest.)
4. **Run replay** — re-run from any step with same or edited input. (Temporal/Prefect.)
5. **Failure Forensics AI** *(leapfrog)* — Gemini reads failed run + node config, explains cause, offers one-click patch.

## Wave 2 — AI-Native Authoring (our differentiator)
6. **Intent-first generator v2** — NL prompt produces full flow incl. error branches, retries, credentials placeholder. (Beats Zapier/Tray flat output.)
7. **Unified Agent + Workflow nodes** *(leapfrog)* — toggle any subgraph between deterministic and agent mode on the same canvas. Nobody does this.
8. **RAG / Knowledge node** — upload docs → pgvector → query node. (Dify/Flowise parity.)
9. **Multi-agent orchestration node** — supervisor + workers, sequential/hierarchical. (CrewAI/Relevance.)
10. **AI test-case generator** *(leapfrog)* — auto-synthesize happy + edge-case inputs, one-click run suite. (Vellum does prompts, nobody does flows.)

## Wave 3 — Power-User Canvas
11. **Sub-workflows** — "Call Subflow" node with typed input/output schema. (n8n/Gumloop.)
12. **Inline code nodes (JS + Python)** — Monaco editor, sandboxed exec. (n8n/Pipedream/Windmill.)
13. **Workflow Data Store** — flow-scoped KV with TTL. (Make's Data Stores.)
14. **Sticky notes + Groups/Frames** — canvas organization for large flows.
15. **Pause / wait-for-event / sleep nodes** — durable async. (Inngest/Temporal.)
16. **Publish-as-API** — any flow → REST endpoint with auto-generated OpenAPI spec. (Langflow/Retool.)

## Wave 4 — Governance & Observability (enterprise unlock)
17. **Environment promotion** — dev → staging → prod tagged versions. (Workato.)
18. **Version diff viewer** — side-by-side JSON diff between any two versions.
19. **Observability dashboard** — success rate, p95 latency, error breakdown per workflow.
20. **Cost attribution per step** *(leapfrog)* — token/egress/compute cost rolled up. Nobody does this.
21. **Governance timeline** *(leapfrog)* — who changed what node when, linked to runs it impacted.
22. **Cross-workflow dependency graph** *(leapfrog)* — live graph of sub-workflow + credential + data-store sharing.
23. **PII scrubbing on logs** *(leapfrog)* — auto-redact before storage. Compliance gap nobody fills.

## Technical notes
- New tables: `run_step_logs`, `workflow_step_retries`, `flow_data_stores`, `workflow_environments`, `step_cost_metrics`, `governance_events`, `workflow_test_cases`, `subworkflow_links`.
- Edge functions: `replay-run`, `failure-forensics`, `generate-test-cases`, `intent-to-flow-v2`, `publish-flow-api`, `execute-code-node` (sandboxed Deno).
- Frontend: `StepInspectorDrawer`, `ErrorPortHandle`, `RetryPolicyPanel`, `RAGNode`, `AgentOrchestratorNode`, `CodeEditorNode`, `SubflowNode`, `StickyNoteNode`, `GroupFrame`, `ObservabilityDashboard`, `DependencyGraphView`, `VersionDiffModal`.
- Constraint: zero circular imports — shared types extend `src/types/workflow.ts`.

## Recommended shipping
Wave 1 first (5 features, ~1 turn each) — biggest UX win, foundation for everything else. Pick which wave to start.
