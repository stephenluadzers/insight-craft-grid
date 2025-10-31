export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          user_id: string
          workspace_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_rate_limit: {
        Row: {
          attempt_count: number
          created_at: string
          email: string
          id: string
          last_attempt: string
          locked_until: string | null
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          email: string
          id?: string
          last_attempt?: string
          locked_until?: string | null
        }
        Update: {
          attempt_count?: number
          created_at?: string
          email?: string
          id?: string
          last_attempt?: string
          locked_until?: string | null
        }
        Relationships: []
      }
      backup_metadata: {
        Row: {
          backup_type: string
          completed_at: string
          created_by: string | null
          error_message: string | null
          execution_count: number
          id: string
          size_bytes: number
          started_at: string
          status: string
          storage_path: string
          verified: boolean
          verified_at: string | null
          workflow_count: number
          workspace_id: string
        }
        Insert: {
          backup_type: string
          completed_at: string
          created_by?: string | null
          error_message?: string | null
          execution_count: number
          id?: string
          size_bytes: number
          started_at: string
          status: string
          storage_path: string
          verified?: boolean
          verified_at?: string | null
          workflow_count: number
          workspace_id: string
        }
        Update: {
          backup_type?: string
          completed_at?: string
          created_by?: string | null
          error_message?: string | null
          execution_count?: number
          id?: string
          size_bytes?: number
          started_at?: string
          status?: string
          storage_path?: string
          verified?: boolean
          verified_at?: string | null
          workflow_count?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_metadata_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      credential_rotation_log: {
        Row: {
          credential_id: string
          id: string
          old_credential_hash: string
          reason: string | null
          rotated_at: string
          rotated_by: string
          rotation_type: string
          success: boolean
          workspace_id: string
        }
        Insert: {
          credential_id: string
          id?: string
          old_credential_hash: string
          reason?: string | null
          rotated_at?: string
          rotated_by: string
          rotation_type: string
          success?: boolean
          workspace_id: string
        }
        Update: {
          credential_id?: string
          id?: string
          old_credential_hash?: string
          reason?: string | null
          rotated_at?: string
          rotated_by?: string
          rotation_type?: string
          success?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credential_rotation_log_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "workflow_credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_rotation_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dangerous_operations_log: {
        Row: {
          action_taken: Database["public"]["Enums"]["operation_action"]
          detected_at: string
          execution_id: string | null
          id: string
          operation_details: Json
          operation_type: string
          reason: string
          risk_level: Database["public"]["Enums"]["security_risk_level"]
          user_id: string | null
          workflow_id: string | null
          workspace_id: string
        }
        Insert: {
          action_taken: Database["public"]["Enums"]["operation_action"]
          detected_at?: string
          execution_id?: string | null
          id?: string
          operation_details: Json
          operation_type: string
          reason: string
          risk_level: Database["public"]["Enums"]["security_risk_level"]
          user_id?: string | null
          workflow_id?: string | null
          workspace_id: string
        }
        Update: {
          action_taken?: Database["public"]["Enums"]["operation_action"]
          detected_at?: string
          execution_id?: string | null
          id?: string
          operation_details?: Json
          operation_type?: string
          reason?: string
          risk_level?: Database["public"]["Enums"]["security_risk_level"]
          user_id?: string | null
          workflow_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dangerous_operations_log_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dangerous_operations_log_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dangerous_operations_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      error_aggregation: {
        Row: {
          error_message: string
          error_type: string
          fingerprint: string
          first_seen_at: string
          id: string
          last_seen_at: string
          node_ids: string[] | null
          occurrence_count: number
          resolution_notes: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          workflow_ids: string[] | null
          workspace_id: string
        }
        Insert: {
          error_message: string
          error_type: string
          fingerprint: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          node_ids?: string[] | null
          occurrence_count?: number
          resolution_notes?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          workflow_ids?: string[] | null
          workspace_id: string
        }
        Update: {
          error_message?: string
          error_type?: string
          fingerprint?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          node_ids?: string[] | null
          occurrence_count?: number
          resolution_notes?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          workflow_ids?: string[] | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "error_aggregation_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_circuit_breakers: {
        Row: {
          created_at: string
          failure_count: number
          failure_threshold: number
          half_open_at: string | null
          id: string
          integration_type: string
          last_failure_at: string | null
          opened_at: string | null
          state: Database["public"]["Enums"]["circuit_state"]
          success_count: number
          timeout_duration_seconds: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          failure_count?: number
          failure_threshold?: number
          half_open_at?: string | null
          id?: string
          integration_type: string
          last_failure_at?: string | null
          opened_at?: string | null
          state?: Database["public"]["Enums"]["circuit_state"]
          success_count?: number
          timeout_duration_seconds?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          failure_count?: number
          failure_threshold?: number
          half_open_at?: string | null
          id?: string
          integration_type?: string
          last_failure_at?: string | null
          opened_at?: string | null
          state?: Database["public"]["Enums"]["circuit_state"]
          success_count?: number
          timeout_duration_seconds?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_circuit_breakers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_templates: {
        Row: {
          category: string
          config_schema: Json
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          category: string
          config_schema?: Json
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          category?: string
          config_schema?: Json
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_workspace_id: string | null
          email: string
          full_name: string | null
          id: string
          lifetime_access: boolean | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_workspace_id?: string | null
          email: string
          full_name?: string | null
          id: string
          lifetime_access?: boolean | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_workspace_id?: string | null
          email?: string
          full_name?: string | null
          id?: string
          lifetime_access?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_workspace_id_fkey"
            columns: ["default_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      security_rules: {
        Row: {
          auto_block: boolean
          created_at: string
          description: string
          enabled: boolean
          id: string
          pattern: string
          remediation: string
          risk_level: Database["public"]["Enums"]["security_risk_level"]
          rule_name: string
          rule_type: string
          updated_at: string
        }
        Insert: {
          auto_block?: boolean
          created_at?: string
          description: string
          enabled?: boolean
          id?: string
          pattern: string
          remediation: string
          risk_level: Database["public"]["Enums"]["security_risk_level"]
          rule_name: string
          rule_type: string
          updated_at?: string
        }
        Update: {
          auto_block?: boolean
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          pattern?: string
          remediation?: string
          risk_level?: Database["public"]["Enums"]["security_risk_level"]
          rule_name?: string
          rule_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      suspicious_activity_log: {
        Row: {
          activity_details: Json
          activity_type: string
          detected_at: string
          id: string
          investigated: boolean
          investigation_notes: string | null
          ip_address: unknown
          severity: Database["public"]["Enums"]["security_risk_level"]
          triggered_rules: string[] | null
          user_agent: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          activity_details: Json
          activity_type: string
          detected_at?: string
          id?: string
          investigated?: boolean
          investigation_notes?: string | null
          ip_address?: unknown
          severity: Database["public"]["Enums"]["security_risk_level"]
          triggered_rules?: string[] | null
          user_agent?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          activity_details?: Json
          activity_type?: string
          detected_at?: string
          id?: string
          investigated?: boolean
          investigation_notes?: string | null
          ip_address?: unknown
          severity?: Database["public"]["Enums"]["security_risk_level"]
          triggered_rules?: string[] | null
          user_agent?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suspicious_activity_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_access_logs: {
        Row: {
          accessed_at: string | null
          accessed_by: string | null
          action: string
          expires_at: string | null
          id: string
          ip_address: unknown
          webhook_id: string | null
        }
        Insert: {
          accessed_at?: string | null
          accessed_by?: string | null
          action: string
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          webhook_id?: string | null
        }
        Update: {
          accessed_at?: string | null
          accessed_by?: string | null
          action?: string
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_access_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "workflow_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_approval_queue: {
        Row: {
          id: string
          requested_at: string
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          risk_assessment: string | null
          security_scan_id: string | null
          status: string
          workflow_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          requested_at?: string
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          risk_assessment?: string | null
          security_scan_id?: string | null
          status?: string
          workflow_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          requested_at?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          risk_assessment?: string | null
          security_scan_id?: string | null
          status?: string
          workflow_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_approval_queue_security_scan_id_fkey"
            columns: ["security_scan_id"]
            isOneToOne: false
            referencedRelation: "workflow_security_scans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_approval_queue_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_approval_queue_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          node_id: string | null
          updated_at: string
          user_id: string
          workflow_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          node_id?: string | null
          updated_at?: string
          user_id: string
          workflow_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          node_id?: string | null
          updated_at?: string
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_comments_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_credentials: {
        Row: {
          created_at: string | null
          created_by: string
          encrypted_data: Json
          id: string
          name: string
          type: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          encrypted_data?: Json
          id?: string
          name: string
          type: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          encrypted_data?: Json
          id?: string
          name?: string
          type?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_credentials_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_dead_letter_queue: {
        Row: {
          execution_data: Json | null
          failed_at: string
          failure_count: number
          id: string
          investigated: boolean
          last_error: string
          queue_item_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          workflow_id: string
          workspace_id: string
        }
        Insert: {
          execution_data?: Json | null
          failed_at?: string
          failure_count: number
          id?: string
          investigated?: boolean
          last_error: string
          queue_item_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          workflow_id: string
          workspace_id: string
        }
        Update: {
          execution_data?: Json | null
          failed_at?: string
          failure_count?: number
          id?: string
          investigated?: boolean
          last_error?: string
          queue_item_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          workflow_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_dead_letter_queue_queue_item_id_fkey"
            columns: ["queue_item_id"]
            isOneToOne: false
            referencedRelation: "workflow_execution_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_dead_letter_queue_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_dead_letter_queue_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_execution_logs: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          error_message: string | null
          execution_id: string
          id: string
          input_data: Json | null
          node_id: string
          node_type: string
          output_data: Json | null
          retry_count: number | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_id: string
          id?: string
          input_data?: Json | null
          node_id: string
          node_type: string
          output_data?: Json | null
          retry_count?: number | null
          started_at?: string | null
          status: string
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_id?: string
          id?: string
          input_data?: Json | null
          node_id?: string
          node_type?: string
          output_data?: Json | null
          retry_count?: number | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_execution_logs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_execution_queue: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          error_message: string | null
          execution_data: Json | null
          id: string
          max_retries: number
          next_retry_at: string | null
          priority: Database["public"]["Enums"]["queue_priority"]
          retry_count: number
          scheduled_at: string
          started_at: string | null
          status: Database["public"]["Enums"]["queue_status"]
          workflow_id: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          error_message?: string | null
          execution_data?: Json | null
          id?: string
          max_retries?: number
          next_retry_at?: string | null
          priority?: Database["public"]["Enums"]["queue_priority"]
          retry_count?: number
          scheduled_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["queue_status"]
          workflow_id: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          error_message?: string | null
          execution_data?: Json | null
          id?: string
          max_retries?: number
          next_retry_at?: string | null
          priority?: Database["public"]["Enums"]["queue_priority"]
          retry_count?: number
          scheduled_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["queue_status"]
          workflow_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_execution_queue_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_execution_queue_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_execution_secrets: {
        Row: {
          created_at: string | null
          created_by: string | null
          execution_id: string
          expires_at: string | null
          id: string
          sensitive_data: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          execution_id: string
          expires_at?: string | null
          id?: string
          sensitive_data?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          execution_id?: string
          expires_at?: string | null
          id?: string
          sensitive_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_execution_secrets_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_execution_secrets_audit: {
        Row: {
          access_type: string
          accessed_at: string
          accessed_by: string
          execution_id: string
          id: string
          ip_address: unknown
          user_agent: string | null
        }
        Insert: {
          access_type: string
          accessed_at?: string
          accessed_by: string
          execution_id: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Update: {
          access_type?: string
          accessed_at?: string
          accessed_by?: string
          execution_id?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_execution_secrets_audit_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          error_message: string | null
          execution_data: Json | null
          id: string
          started_at: string
          status: Database["public"]["Enums"]["execution_status"]
          triggered_by: string | null
          workflow_id: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_data?: Json | null
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["execution_status"]
          triggered_by?: string | null
          workflow_id: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_data?: Json | null
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["execution_status"]
          triggered_by?: string | null
          workflow_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_performance_metrics: {
        Row: {
          api_calls: number | null
          cpu_usage_percent: number | null
          data_transferred_kb: number | null
          execution_id: string | null
          execution_time_ms: number
          id: string
          memory_usage_mb: number | null
          node_id: string
          node_type: string
          recorded_at: string
          workflow_id: string
          workspace_id: string
        }
        Insert: {
          api_calls?: number | null
          cpu_usage_percent?: number | null
          data_transferred_kb?: number | null
          execution_id?: string | null
          execution_time_ms: number
          id?: string
          memory_usage_mb?: number | null
          node_id: string
          node_type: string
          recorded_at?: string
          workflow_id: string
          workspace_id: string
        }
        Update: {
          api_calls?: number | null
          cpu_usage_percent?: number | null
          data_transferred_kb?: number | null
          execution_id?: string | null
          execution_time_ms?: number
          id?: string
          memory_usage_mb?: number | null
          node_id?: string
          node_type?: string
          recorded_at?: string
          workflow_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_performance_metrics_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_performance_metrics_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_performance_metrics_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_schedules: {
        Row: {
          created_at: string | null
          cron_expression: string
          enabled: boolean | null
          id: string
          last_run_at: string | null
          next_run_at: string | null
          updated_at: string | null
          workflow_id: string
        }
        Insert: {
          created_at?: string | null
          cron_expression: string
          enabled?: boolean | null
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          updated_at?: string | null
          workflow_id: string
        }
        Update: {
          created_at?: string | null
          cron_expression?: string
          enabled?: boolean | null
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          updated_at?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_schedules_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_security_scans: {
        Row: {
          approval_notes: string | null
          approved: boolean
          approved_at: string | null
          approved_by: string | null
          id: string
          issues_found: number
          risk_level: Database["public"]["Enums"]["security_risk_level"]
          scan_results: Json
          scan_status: Database["public"]["Enums"]["scan_status"]
          scanned_at: string
          scanned_by: string | null
          workflow_id: string
          workspace_id: string
        }
        Insert: {
          approval_notes?: string | null
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          id?: string
          issues_found?: number
          risk_level?: Database["public"]["Enums"]["security_risk_level"]
          scan_results?: Json
          scan_status?: Database["public"]["Enums"]["scan_status"]
          scanned_at?: string
          scanned_by?: string | null
          workflow_id: string
          workspace_id: string
        }
        Update: {
          approval_notes?: string | null
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          id?: string
          issues_found?: number
          risk_level?: Database["public"]["Enums"]["security_risk_level"]
          scan_results?: Json
          scan_status?: Database["public"]["Enums"]["scan_status"]
          scanned_at?: string
          scanned_by?: string | null
          workflow_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_security_scans_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_security_scans_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          nodes: Json
          rejection_reason: string | null
          use_count: number | null
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          nodes: Json
          rejection_reason?: string | null
          use_count?: number | null
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          nodes?: Json
          rejection_reason?: string | null
          use_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates_audit: {
        Row: {
          change_reason: string | null
          changed_at: string
          changed_by: string
          id: string
          new_is_public: boolean | null
          new_status: string | null
          old_is_public: boolean | null
          old_status: string | null
          template_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string
          changed_by: string
          id?: string
          new_is_public?: boolean | null
          new_status?: string | null
          old_is_public?: boolean | null
          old_status?: string | null
          template_id: string
        }
        Update: {
          change_reason?: string | null
          changed_at?: string
          changed_by?: string
          id?: string
          new_is_public?: boolean | null
          new_status?: string | null
          old_is_public?: boolean | null
          old_status?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_audit_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_versions: {
        Row: {
          created_at: string
          created_by: string
          id: string
          nodes: Json
          notes: string | null
          version_number: number
          workflow_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          nodes: Json
          notes?: string | null
          version_number: number
          workflow_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          nodes?: Json
          notes?: string | null
          version_number?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_versions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_webhooks: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          last_triggered_at: string | null
          webhook_key: string
          workflow_id: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          last_triggered_at?: string | null
          webhook_key: string
          workflow_id: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          last_triggered_at?: string | null
          webhook_key?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_webhooks_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_template: boolean | null
          name: string
          nodes: Json
          published_at: string | null
          status: Database["public"]["Enums"]["workflow_status"]
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_template?: boolean | null
          name: string
          nodes?: Json
          published_at?: string | null
          status?: Database["public"]["Enums"]["workflow_status"]
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_template?: boolean | null
          name?: string
          nodes?: Json
          published_at?: string | null
          status?: Database["public"]["Enums"]["workflow_status"]
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_execution_limits: {
        Row: {
          allow_external_urls: boolean
          allowed_domains: string[] | null
          blocked_domains: string[] | null
          created_at: string
          id: string
          max_api_calls_per_execution: number
          max_concurrent_executions: number
          max_data_size_kb: number
          max_execution_time_seconds: number
          max_memory_mb: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          allow_external_urls?: boolean
          allowed_domains?: string[] | null
          blocked_domains?: string[] | null
          created_at?: string
          id?: string
          max_api_calls_per_execution?: number
          max_concurrent_executions?: number
          max_data_size_kb?: number
          max_execution_time_seconds?: number
          max_memory_mb?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          allow_external_urls?: boolean
          allowed_domains?: string[] | null
          blocked_domains?: string[] | null
          created_at?: string
          id?: string
          max_api_calls_per_execution?: number
          max_concurrent_executions?: number
          max_data_size_kb?: number
          max_execution_time_seconds?: number
          max_memory_mb?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_execution_limits_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_rate_limits: {
        Row: {
          current_day_count: number
          current_hour_count: number
          current_minute_count: number
          day_reset_at: string
          hour_reset_at: string
          id: string
          limit_per_day: number
          limit_per_hour: number
          limit_per_minute: number
          minute_reset_at: string
          resource_type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          current_day_count?: number
          current_hour_count?: number
          current_minute_count?: number
          day_reset_at?: string
          hour_reset_at?: string
          id?: string
          limit_per_day?: number
          limit_per_hour?: number
          limit_per_minute?: number
          minute_reset_at?: string
          resource_type: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          current_day_count?: number
          current_hour_count?: number
          current_minute_count?: number
          day_reset_at?: string
          hour_reset_at?: string
          id?: string
          limit_per_day?: number
          limit_per_hour?: number
          limit_per_minute?: number
          minute_reset_at?: string
          resource_type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_rate_limits_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          plan: Database["public"]["Enums"]["workspace_plan"]
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          plan?: Database["public"]["Enums"]["workspace_plan"]
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          plan?: Database["public"]["Enums"]["workspace_plan"]
          settings?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_next_retry: {
        Args: { base_delay_seconds?: number; retry_count: number }
        Returns: string
      }
      cleanup_auth_rate_limits: { Args: never; Returns: undefined }
      get_webhook_logs: {
        Args: { _limit?: number; _webhook_id: string }
        Returns: {
          accessed_at: string
          accessed_by: string
          action: string
          id: string
          ip_address: unknown
          webhook_id: string
        }[]
      }
      get_workspace_member_profile: {
        Args: { _profile_id: string }
        Returns: {
          avatar_url: string
          created_at: string
          default_workspace_id: string
          full_name: string
          id: string
          updated_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_workspace_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      purge_old_webhook_logs: { Args: never; Returns: undefined }
      requires_security_approval: {
        Args: { _workflow_id: string }
        Returns: boolean
      }
      sanitize_execution_data: {
        Args: { execution_data: Json; workspace_id: string }
        Returns: Json
      }
      validate_workflow_node_data: {
        Args: { node_data: Json }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "editor" | "viewer"
      circuit_state: "closed" | "open" | "half_open"
      execution_status:
        | "pending"
        | "running"
        | "success"
        | "failed"
        | "cancelled"
      operation_action: "allowed" | "blocked" | "flagged"
      queue_priority: "low" | "normal" | "high" | "critical"
      queue_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "dead_letter"
      scan_status: "pending" | "scanning" | "completed" | "failed"
      security_risk_level: "safe" | "low" | "medium" | "high" | "critical"
      workflow_status: "draft" | "published" | "archived"
      workspace_plan: "free" | "pro" | "enterprise"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "editor", "viewer"],
      circuit_state: ["closed", "open", "half_open"],
      execution_status: [
        "pending",
        "running",
        "success",
        "failed",
        "cancelled",
      ],
      operation_action: ["allowed", "blocked", "flagged"],
      queue_priority: ["low", "normal", "high", "critical"],
      queue_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "dead_letter",
      ],
      scan_status: ["pending", "scanning", "completed", "failed"],
      security_risk_level: ["safe", "low", "medium", "high", "critical"],
      workflow_status: ["draft", "published", "archived"],
      workspace_plan: ["free", "pro", "enterprise"],
    },
  },
} as const
