-- Self-Healing Workflows
CREATE TABLE workflow_healing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  failure_type TEXT NOT NULL,
  original_error TEXT NOT NULL,
  healing_action TEXT NOT NULL,
  healing_strategy JSONB NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  recovery_time_ms INTEGER,
  learned_pattern JSONB
);

CREATE INDEX idx_healing_logs_workflow ON workflow_healing_logs(workflow_id);
CREATE INDEX idx_healing_logs_workspace ON workflow_healing_logs(workspace_id);

ALTER TABLE workflow_healing_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view healing logs in their workspaces"
  ON workflow_healing_logs FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

-- Workflow Recommendations
CREATE TABLE workflow_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  impact_score NUMERIC(3,2) NOT NULL,
  effort_score NUMERIC(3,2) NOT NULL,
  recommendation_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMP WITH TIME ZONE,
  applied_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_recommendations_workspace ON workflow_recommendations(workspace_id);
CREATE INDEX idx_recommendations_workflow ON workflow_recommendations(workflow_id);
CREATE INDEX idx_recommendations_status ON workflow_recommendations(status);

ALTER TABLE workflow_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recommendations in their workspaces"
  ON workflow_recommendations FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update recommendations in their workspaces"
  ON workflow_recommendations FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

-- Workflow Marketplace
CREATE TABLE marketplace_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  price_cents INTEGER NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  downloads_count INTEGER NOT NULL DEFAULT 0,
  rating_avg NUMERIC(2,1) DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  revenue_share_percent INTEGER NOT NULL DEFAULT 70,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  featured BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_marketplace_featured ON marketplace_templates(featured, downloads_count DESC);
CREATE INDEX idx_marketplace_creator ON marketplace_templates(creator_id);

ALTER TABLE marketplace_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published marketplace templates"
  ON marketplace_templates FOR SELECT
  USING (true);

CREATE POLICY "Creators can manage their marketplace templates"
  ON marketplace_templates FOR ALL
  USING (creator_id = auth.uid());

CREATE TABLE marketplace_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_template_id UUID NOT NULL REFERENCES marketplace_templates(id),
  buyer_id UUID NOT NULL REFERENCES auth.users(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  price_paid_cents INTEGER NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(buyer_id, marketplace_template_id)
);

CREATE INDEX idx_purchases_buyer ON marketplace_purchases(buyer_id);
CREATE INDEX idx_purchases_template ON marketplace_purchases(marketplace_template_id);

ALTER TABLE marketplace_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases"
  ON marketplace_purchases FOR SELECT
  USING (buyer_id = auth.uid());

CREATE TABLE marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_template_id UUID NOT NULL REFERENCES marketplace_templates(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(marketplace_template_id, reviewer_id)
);

CREATE INDEX idx_reviews_template ON marketplace_reviews(marketplace_template_id);

ALTER TABLE marketplace_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
  ON marketplace_reviews FOR SELECT
  USING (true);

CREATE POLICY "Purchasers can create reviews"
  ON marketplace_reviews FOR INSERT
  WITH CHECK (
    reviewer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM marketplace_purchases
      WHERE buyer_id = auth.uid() AND marketplace_template_id = marketplace_reviews.marketplace_template_id
    )
  );

-- Autonomous Optimization
CREATE TABLE workflow_optimization_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  experiment_type TEXT NOT NULL,
  variant_a_config JSONB NOT NULL,
  variant_b_config JSONB NOT NULL,
  variant_a_executions INTEGER NOT NULL DEFAULT 0,
  variant_b_executions INTEGER NOT NULL DEFAULT 0,
  variant_a_success_rate NUMERIC(4,3),
  variant_b_success_rate NUMERIC(4,3),
  variant_a_avg_duration_ms INTEGER,
  variant_b_avg_duration_ms INTEGER,
  winner TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  auto_apply BOOLEAN NOT NULL DEFAULT false,
  applied_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_experiments_workflow ON workflow_optimization_experiments(workflow_id);
CREATE INDEX idx_experiments_status ON workflow_optimization_experiments(status);

ALTER TABLE workflow_optimization_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view experiments in their workspaces"
  ON workflow_optimization_experiments FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage experiments"
  ON workflow_optimization_experiments FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE TABLE workflow_learned_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  optimization_type TEXT NOT NULL,
  optimization_data JSONB NOT NULL,
  performance_improvement_percent NUMERIC(5,2),
  learned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  applied BOOLEAN NOT NULL DEFAULT false,
  applied_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_learned_optimizations_workflow ON workflow_learned_optimizations(workflow_id);

ALTER TABLE workflow_learned_optimizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view learned optimizations in their workspaces"
  ON workflow_learned_optimizations FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));