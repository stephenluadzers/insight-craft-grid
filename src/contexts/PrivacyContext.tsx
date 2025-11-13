import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ConsentPreferences {
  essential: boolean;
  analytics: boolean;
  aiFeatures: boolean;
  crashReporting: boolean;
  marketing: boolean;
  thirdParty: boolean;
  version: string;
  timestamp: string;
}

export type ConsentType = keyof Omit<ConsentPreferences, 'version' | 'timestamp'>;

interface DeletionOptions {
  deleteExecutionHistory?: boolean;
  deleteWorkflows?: boolean;
  deleteAccount?: boolean;
}

interface PrivacyContextType {
  consent: ConsentPreferences | null;
  hasConsent: (type: ConsentType) => boolean;
  updateConsent: (preferences: Partial<ConsentPreferences>) => Promise<void>;
  isAgeVerified: boolean;
  setAgeVerified: (verified: boolean) => void;
  showConsentDialog: boolean;
  setShowConsentDialog: (show: boolean) => void;
  showAgeGate: boolean;
  setShowAgeGate: (show: boolean) => void;
  showAIDisclosure: boolean;
  setShowAIDisclosure: (show: boolean) => void;
  deleteUserData: (options: DeletionOptions) => Promise<void>;
  exportUserData: () => Promise<Blob>;
  retentionDays: number;
  setRetentionDays: (days: number) => Promise<void>;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

const CONSENT_VERSION = '1.0.0';
const STORAGE_KEY = 'flowfuse_privacy_consent';
const AGE_VERIFIED_KEY = 'flowfuse_age_verified';
const RETENTION_DAYS_KEY = 'flowfuse_retention_days';

const defaultConsent: ConsentPreferences = {
  essential: true,
  analytics: false,
  aiFeatures: false,
  crashReporting: false,
  marketing: false,
  thirdParty: false,
  version: CONSENT_VERSION,
  timestamp: new Date().toISOString(),
};

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentPreferences | null>(null);
  const [isAgeVerified, setIsAgeVerified] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [showAIDisclosure, setShowAIDisclosure] = useState(false);
  const [retentionDays, setRetentionDaysState] = useState(30);

  useEffect(() => {
    // Load consent from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ConsentPreferences;
      // Check if consent version matches
      if (parsed.version === CONSENT_VERSION) {
        setConsent(parsed);
      } else {
        // Version mismatch, request new consent
        setShowConsentDialog(true);
      }
    } else {
      // No consent found, show consent dialog
      setShowConsentDialog(true);
    }

    // Load age verification status
    const ageVerified = localStorage.getItem(AGE_VERIFIED_KEY);
    if (ageVerified === 'true') {
      setIsAgeVerified(true);
    } else {
      setShowAgeGate(true);
    }

    // Load retention days
    const retention = localStorage.getItem(RETENTION_DAYS_KEY);
    if (retention) {
      setRetentionDaysState(parseInt(retention, 10));
    }
  }, []);

  const hasConsent = (type: ConsentType): boolean => {
    if (!consent) return type === 'essential';
    return consent[type] === true;
  };

  const updateConsent = async (preferences: Partial<ConsentPreferences>) => {
    const updated: ConsentPreferences = {
      ...(consent || defaultConsent),
      ...preferences,
      essential: true, // Always required
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
    };

    setConsent(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Store in database if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (user && hasConsent('essential')) {
      await (supabase as any).from('user_consent').upsert({
        user_id: user.id,
        consent_data: updated,
        updated_at: new Date().toISOString(),
      });
    }
  };

  const setAgeVerified = (verified: boolean) => {
    setIsAgeVerified(verified);
    localStorage.setItem(AGE_VERIFIED_KEY, verified.toString());
    if (verified) {
      setShowAgeGate(false);
    }
  };

  const deleteUserData = async (options: DeletionOptions) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    if (options.deleteExecutionHistory) {
      await (supabase as any).from('workflow_executions').delete().eq('user_id', user.id);
    }

    if (options.deleteWorkflows) {
      await (supabase as any).from('workflows').delete().eq('user_id', user.id);
    }

    if (options.deleteAccount) {
      // Mark account for deletion
      await (supabase as any).from('user_deletion_requests').insert({
        user_id: user.id,
        requested_at: new Date().toISOString(),
        status: 'pending',
      });

      // Clear local storage
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(AGE_VERIFIED_KEY);
      localStorage.removeItem(RETENTION_DAYS_KEY);

      // Sign out
      await supabase.auth.signOut();
    }
  };

  const exportUserData = async (): Promise<Blob> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Fetch all user data
    const [workflowsData, executionsData, profileData] = await Promise.all([
      (supabase as any).from('workflows').select('*').eq('user_id', user.id),
      (supabase as any).from('workflow_executions').select('*').eq('user_id', user.id),
      (supabase as any).from('profiles').select('*').eq('id', user.id).single(),
    ]);

    const exportData = {
      user: {
        id: user.id,
        email: user.email,
      },
      profile: profileData.data,
      workflows: workflowsData.data,
      executions: executionsData.data,
      consent: consent,
      exportedAt: new Date().toISOString(),
    };

    return new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
  };

  const setRetentionDays = async (days: number) => {
    setRetentionDaysState(days);
    localStorage.setItem(RETENTION_DAYS_KEY, days.toString());

    // Store in database if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await (supabase as any).from('user_settings').upsert({
        user_id: user.id,
        retention_days: days,
        updated_at: new Date().toISOString(),
      });
    }
  };

  return (
    <PrivacyContext.Provider
      value={{
        consent,
        hasConsent,
        updateConsent,
        isAgeVerified,
        setAgeVerified,
        showConsentDialog,
        setShowConsentDialog,
        showAgeGate,
        setShowAgeGate,
        showAIDisclosure,
        setShowAIDisclosure,
        deleteUserData,
        exportUserData,
        retentionDays,
        setRetentionDays,
      }}
    >
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (context === undefined) {
    throw new Error('usePrivacy must be used within a PrivacyProvider');
  }
  return context;
}
