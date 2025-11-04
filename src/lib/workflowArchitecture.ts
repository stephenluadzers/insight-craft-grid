/**
 * FlowFuse Enhanced Architecture
 * Inspired by OpenDevin, LangGraph, and Autogen Studio
 */

// Event System (OpenDevin-inspired)
export type WorkflowEvent =
  | { type: 'action.started'; nodeId: string; timestamp: number; input?: any }
  | { type: 'action.completed'; nodeId: string; timestamp: number; output: any }
  | { type: 'action.failed'; nodeId: string; timestamp: number; error: Error }
  | { type: 'observation.received'; nodeId: string; data: any }
  | { type: 'checkpoint.created'; checkpointId: string; state: any }
  | { type: 'handoff.initiated'; from: string; to: string; context: any }
  | { type: 'circuit.opened'; connector: string; reason: string }
  | { type: 'circuit.closed'; connector: string };

// State Management (LangGraph-inspired)
export interface WorkflowState {
  nodes: Record<string, NodeState>;
  checkpoints: Checkpoint[];
  context: Record<string, any>;
  currentNode: string;
  startTime: number;
  lastUpdate: number;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
}

export interface NodeState {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  input?: any;
  output?: any;
  error?: Error;
  attempts: number;
  startTime?: number;
  endTime?: number;
}

export interface Checkpoint {
  id: string;
  timestamp: number;
  state: WorkflowState;
  nodeId: string;
  encrypted: boolean;
}

// Multi-Agent Handoffs (Autogen-inspired)
export interface AgentHandoff {
  from: string;
  to: string;
  condition: LLMCondition | RuleCondition;
  contextCarryover: string[];
  fallback?: string;
  priority: number;
}

export interface LLMCondition {
  type: 'llm';
  prompt: string;
  model?: string;
  threshold?: number;
}

export interface RuleCondition {
  type: 'rule';
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'regex';
  value: any;
}

// Circuit Breaker (Defensive Architecture)
export interface CircuitBreakerState {
  status: 'closed' | 'open' | 'half-open';
  failureCount: number;
  failureThreshold: number;
  lastFailure?: number;
  resetTimeout: number;
  successCount?: number;
}

export interface CircuitBreaker {
  connector: string;
  state: CircuitBreakerState;
  execute: <T>(fn: () => Promise<T>) => Promise<T>;
  reset: () => void;
  getMetrics: () => CircuitBreakerMetrics;
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  circuitOpenCount: number;
  averageResponseTime: number;
}

// Rate Limiter
export interface RateLimiter {
  connector: string;
  maxRequests: number;
  windowMs: number;
  currentCount: number;
  windowStart: number;
  canMakeRequest: () => boolean;
  recordRequest: () => void;
  reset: () => void;
}

// Health Monitor
export interface HealthStatus {
  connector: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: number;
  responseTime: number;
  errorRate: number;
  uptime: number;
}

// Enhanced Connector
export interface EnhancedConnector {
  id: string;
  name: string;
  type: string;
  group: 'Core' | 'Optional Connectors' | 'System Services';
  priority: number;
  optional: boolean;
  systemService: boolean;
  health: HealthStatus;
  circuitBreaker: CircuitBreaker;
  rateLimiter: RateLimiter;
  credentials?: any;
  config: ConnectorConfig;
}

export interface ConnectorConfig {
  retries: number;
  retryStrategy: 'fixed' | 'exponential' | 'linear';
  timeout: number;
  fallback?: string;
  dependencies: string[];
  triggerConditions?: string;
  justification?: string;
}

// Event Stream Manager (OpenDevin-inspired)
export class EventStreamManager {
  private listeners: Map<string, Set<(event: WorkflowEvent) => void>> = new Map();
  private eventHistory: WorkflowEvent[] = [];
  private maxHistory = 1000;

  subscribe(eventType: string, callback: (event: WorkflowEvent) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    return () => this.unsubscribe(eventType, callback);
  }

  unsubscribe(eventType: string, callback: (event: WorkflowEvent) => void): void {
    this.listeners.get(eventType)?.delete(callback);
  }

  publish(event: WorkflowEvent): void {
    // Add to history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.shift();
    }

    // Notify specific listeners
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      typeListeners.forEach(callback => callback(event));
    }

    // Notify wildcard listeners
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach(callback => callback(event));
    }
  }

  getHistory(filterType?: string): WorkflowEvent[] {
    if (!filterType) return [...this.eventHistory];
    return this.eventHistory.filter(e => e.type === filterType);
  }

  clear(): void {
    this.eventHistory = [];
  }
}

// Circuit Breaker Implementation
export class CircuitBreakerImpl implements CircuitBreaker {
  connector: string;
  state: CircuitBreakerState;
  private metrics: CircuitBreakerMetrics;

  constructor(connector: string, failureThreshold = 5, resetTimeout = 60000) {
    this.connector = connector;
    this.state = {
      status: 'closed',
      failureCount: 0,
      failureThreshold,
      resetTimeout,
      successCount: 0,
    };
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      circuitOpenCount: 0,
      averageResponseTime: 0,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state.status === 'open') {
      // Check if we should attempt reset
      if (
        this.state.lastFailure &&
        Date.now() - this.state.lastFailure > this.state.resetTimeout
      ) {
        this.state.status = 'half-open';
        this.state.successCount = 0;
      } else {
        throw new Error(`Circuit breaker open for ${this.connector}`);
      }
    }

    this.metrics.totalRequests++;
    const startTime = Date.now();

    try {
      const result = await fn();
      const responseTime = Date.now() - startTime;

      // Update metrics
      this.metrics.successfulRequests++;
      this.metrics.averageResponseTime =
        (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) +
          responseTime) /
        this.metrics.totalRequests;

      // Handle success
      if (this.state.status === 'half-open') {
        this.state.successCount = (this.state.successCount || 0) + 1;
        if (this.state.successCount >= 3) {
          this.reset();
        }
      } else {
        this.state.failureCount = 0;
      }

      return result;
    } catch (error) {
      this.metrics.failedRequests++;
      this.state.failureCount++;
      this.state.lastFailure = Date.now();

      if (this.state.failureCount >= this.state.failureThreshold) {
        this.state.status = 'open';
        this.metrics.circuitOpenCount++;
      }

      throw error;
    }
  }

  reset(): void {
    this.state = {
      ...this.state,
      status: 'closed',
      failureCount: 0,
      successCount: 0,
    };
  }

  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }
}

// Rate Limiter Implementation
export class RateLimiterImpl implements RateLimiter {
  connector: string;
  maxRequests: number;
  windowMs: number;
  currentCount: number;
  windowStart: number;

  constructor(connector: string, maxRequests = 60, windowMs = 60000) {
    this.connector = connector;
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.currentCount = 0;
    this.windowStart = Date.now();
  }

  canMakeRequest(): boolean {
    this.checkWindow();
    return this.currentCount < this.maxRequests;
  }

  recordRequest(): void {
    this.checkWindow();
    this.currentCount++;
  }

  reset(): void {
    this.currentCount = 0;
    this.windowStart = Date.now();
  }

  private checkWindow(): void {
    const now = Date.now();
    if (now - this.windowStart >= this.windowMs) {
      this.reset();
    }
  }
}
