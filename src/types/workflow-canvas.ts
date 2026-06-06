/** Wave 3: Power-user canvas shared types — kept here to avoid circular imports. */

export type CanvasAnnotationKind = "sticky" | "group";
export type StickyColor = "amber" | "rose" | "violet" | "emerald" | "sky" | "slate";

export interface CanvasAnnotation {
  id: string;
  workflow_id: string;
  kind: CanvasAnnotationKind;
  position: { x: number; y: number };
  size: { width: number; height: number };
  content: string | null;
  color: StickyColor;
  member_node_ids: string[];
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SubworkflowLink {
  id: string;
  parent_workflow_id: string;
  child_workflow_id: string;
  parent_node_id: string;
  input_mapping: Record<string, string>;
  output_mapping: Record<string, string>;
}

export interface FlowDataStoreEntry {
  id: string;
  workflow_id: string;
  store_key: string;
  value: unknown;
  ttl_seconds?: number | null;
  expires_at?: string | null;
  updated_at: string;
}

export interface PublishedWorkflowAPI {
  id: string;
  workflow_id: string;
  slug: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  auth_required: boolean;
  api_key_hash?: string | null;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  is_active: boolean;
  request_count: number;
  created_at: string;
}

export type CodeNodeLanguage = "javascript" | "typescript" | "python";

export interface CodeNodeConfig {
  language: CodeNodeLanguage;
  source: string;
  timeout_ms: number;
  inputs: string[];
}

export interface PauseNodeConfig {
  /** Duration to sleep. */
  mode: "duration" | "until" | "approval";
  duration_seconds?: number;
  until_iso?: string;
  approval_role?: string;
}
