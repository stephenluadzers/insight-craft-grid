import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionLimits {
  tier: string;
  maxWorkflows: number;
  maxExecutionsPerMonth: number;
  maxTeamMembers: number;
  maxApiCallsPerMinute: number;
  customGuardrails: boolean;
  ssoEnabled: boolean;
  prioritySupport: boolean;
  slaGuarantee: boolean;
  auditLogRetentionDays: number;
  workflowVersionHistory: number;
  customBranding: boolean;
  dedicatedSupport: boolean;
}

export const useEnterpriseFeatures = () => {
  const [tier, setTier] = useState<string>('free');
  const [limits, setLimits] = useState<SubscriptionLimits | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;

      setTier(data.tier || 'free');

      // Fetch limits for the tier
      const { data: limitsData } = await (supabase as any)
        .from('subscription_limits')
        .select('*')
        .eq('tier', data.tier || 'free')
        .single();

      if (limitsData) {
        setLimits({
          tier: limitsData.tier,
          maxWorkflows: limitsData.max_workflows,
          maxExecutionsPerMonth: limitsData.max_executions_per_month,
          maxTeamMembers: limitsData.max_team_members,
          maxApiCallsPerMinute: limitsData.max_api_calls_per_minute,
          customGuardrails: limitsData.custom_guardrails,
          ssoEnabled: limitsData.sso_enabled,
          prioritySupport: limitsData.priority_support,
          slaGuarantee: limitsData.sla_guarantee,
          auditLogRetentionDays: limitsData.audit_log_retention_days,
          workflowVersionHistory: limitsData.workflow_version_history,
          customBranding: limitsData.custom_branding,
          dedicatedSupport: limitsData.dedicated_support,
        });
      }
    } catch (error) {
      console.error('Failed to check subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();
    
    // Refresh every 5 minutes
    const interval = setInterval(checkSubscription, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const hasFeature = (feature: keyof SubscriptionLimits): boolean => {
    if (!limits) return false;
    return Boolean(limits[feature]);
  };

  const isWithinLimit = (current: number, limitKey: keyof SubscriptionLimits): boolean => {
    if (!limits) return false;
    const limit = limits[limitKey] as number;
    return limit === -1 || current < limit; // -1 means unlimited
  };

  return {
    tier,
    limits,
    loading,
    hasFeature,
    isWithinLimit,
    refresh: checkSubscription,
  };
};
