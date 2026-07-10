# n8n Compatibility Overlay

Insight Craft Grid should act as the private intake and design layer for automation work:

- Intake prompts, JSON files, screenshots, photos, APIs, GitHub repos, and workflow sketches.
- Convert those inputs into an internal Insight workflow canvas.
- Export a strict n8n import file only at the boundary.

## Why n8n Rejected Some Exports

Older/generated workflow files sometimes mixed two shapes:

- Insight/Remora canvas shape: `type`, `title`, `config`, `{ x, y }` positions.
- n8n import shape: `name`, `type: "n8n-nodes-base.*"`, `parameters`, `[x, y]` positions, and named `connections`.

n8n expects the second shape. It does not know what to do with Insight-only node types like `trigger`, `manual_trigger`, `agent_handoff`, `guardrail`, or object-style positions unless they are translated first.

## Compatibility Contract

The n8n export adapter in `src/lib/workflowExport.ts` now:

- Preserves real n8n node types when a node already has `n8n-nodes-base.*`.
- Converts Insight trigger/manual nodes into `n8n-nodes-base.manualTrigger` or webhook nodes.
- Converts AI/action/connector/media nodes into import-safe HTTP Request nodes.
- Converts data/storage/checkpoint nodes into Set nodes.
- Converts guardrail/security/circuit breaker nodes into IF nodes.
- Falls back to `n8n-nodes-base.noOp` for architectural placeholders.
- Normalizes positions from either `[x, y]` arrays or `{ x, y }` objects.
- Preserves role contracts and agent metadata as node notes instead of leaking them into invalid n8n fields.

## Recommended Product Shape

Use a three-layer stack:

1. **Insight Craft Grid**: visual intake, prompt/image/API/github ingestion, workflow design, governance, exports.
2. **Remora/Jerry**: private AI brain, workflow scoring, business memory, approval queue.
3. **n8n**: execution runtime for the final approved workflow JSON.

## Next Steps

- Add a dedicated n8n validation panel that checks exports before download.
- Add a local n8n import test that posts exported JSON to a private n8n instance.
- Add Remora/Jerry as the generation backend instead of Supabase-only edge functions.
- Optionally maintain a tiny overlay branch/fork of n8n for import helpers, but keep most product logic in Insight Craft Grid so n8n stays easy to update.
