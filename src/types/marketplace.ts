export interface MarketplaceCategory {
  id: string;
  name: string;
  icon?: string;
  sort_order: number;
  created_at: string;
}

export interface MarketplaceWorkflow {
  id: string;
  title: string;
  description: string;
  category_id: string;
  workflow_data: any;
  tags?: string[];
  is_featured: boolean;
  is_approved: boolean;
  install_count: number;
  average_rating?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  marketplace_categories?: {
    name: string;
  };
}

export interface UsageQuota {
  id: string;
  workspace_id: string;
  pricing_plan_id: string;
  monthly_limit: number;
  current_usage: number;
  reset_date: string;
  created_at: string;
  updated_at: string;
  pricing_plans?: {
    name: string;
  };
}

export interface TransactionUsage {
  id: string;
  workspace_id: string;
  workflow_id?: string;
  transaction_count: number;
  date: string;
  created_at: string;
}

export interface WhiteLabelConfig {
  id: string;
  workspace_id: string;
  brand_name: string;
  primary_color: string;
  secondary_color: string;
  domain?: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
