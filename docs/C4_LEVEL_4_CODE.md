# C4 Model - Level 4: Code Diagram
## Key Implementation Classes

### Workflow Execution Controller

```typescript
// supabase/functions/workflow-service/ExecutionController.ts

export class ExecutionController {
  constructor(
    private workflowRepo: WorkflowRepository,
    private executionRepo: ExecutionRepository,
    private nodeExecutor: NodeExecutor,
    private stateManager: StateManager,
    private eventBus: EventBus
  ) {}

  async executeWorkflow(workflowId: string, input: Record<string, any>): Promise<Execution> {
    // 1. Load workflow definition (with caching)
    const workflow = await this.workflowRepo.getById(workflowId);
    
    // 2. Validate workflow
    this.validateWorkflow(workflow);
    
    // 3. Create execution record
    const execution = await this.executionRepo.create({
      workflow_id: workflowId,
      status: 'running',
      input_data: input
    });
    
    // 4. Emit started event
    await this.eventBus.publish('workflow:started', { execution_id: execution.id });
    
    // 5. Execute nodes in order
    try {
      for (const node of workflow.nodes) {
        await this.nodeExecutor.execute(node, execution);
        await this.stateManager.checkpoint(execution);
      }
      
      // 6. Mark complete
      await this.executionRepo.update(execution.id, { status: 'completed' });
      await this.eventBus.publish('workflow:completed', { execution_id: execution.id });
      
      return execution;
    } catch (error) {
      await this.handleExecutionError(execution, error);
      throw error;
    }
  }
}
```

### State Manager with Checkpointing

```typescript
export class StateManager {
  async checkpoint(execution: Execution): Promise<void> {
    const checkpoint = {
      execution_id: execution.id,
      checkpoint_index: execution.completed_nodes.length,
      timestamp: new Date(),
      state: this.serializeState(execution)
    };
    
    // Encrypt sensitive data
    checkpoint.state = await this.encrypt(checkpoint.state);
    
    await this.checkpointRepo.save(checkpoint);
  }

  async restore(executionId: string, checkpointIndex: number): Promise<Execution> {
    const checkpoint = await this.checkpointRepo.get(executionId, checkpointIndex);
    const decryptedState = await this.decrypt(checkpoint.state);
    return this.deserializeState(decryptedState);
  }
}
```

### Circuit Breaker Implementation

```typescript
export class CircuitBreaker {
  private state: Map<string, CircuitState> = new Map();

  async execute<T>(workspaceId: string, fn: () => Promise<T>): Promise<T> {
    const circuit = this.getCircuit(workspaceId);
    
    if (circuit.state === 'open') {
      if (Date.now() - circuit.openedAt > circuit.timeout) {
        circuit.state = 'half_open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await fn();
      this.recordSuccess(workspaceId);
      return result;
    } catch (error) {
      this.recordFailure(workspaceId);
      throw error;
    }
  }
  
  private recordFailure(workspaceId: string): void {
    const circuit = this.getCircuit(workspaceId);
    circuit.failureCount++;
    
    if (circuit.failureCount >= circuit.threshold) {
      circuit.state = 'open';
      circuit.openedAt = Date.now();
    }
  }
}
```

## Database Schema (Selected Tables)

```sql
-- Core workflow table
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL,
  nodes JSONB NOT NULL,
  edges JSONB NOT NULL,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Partitioned executions table
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id),
  workspace_id UUID NOT NULL,
  status execution_status DEFAULT 'pending',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT
) PARTITION BY RANGE (started_at);

-- Rate limiting
CREATE TABLE workspace_rate_limits (
  workspace_id UUID PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER DEFAULT 0,
  UNIQUE(workspace_id, window_start)
);
```
