# Privacy Compliance Documentation

## Overview
This document outlines FlowFuse's comprehensive privacy compliance implementation for Apple App Store and Google Play Store requirements.

## Compliance Framework

### Apple App Store Guidelines

#### 1.2.1(a) - Data Collection and Storage
- **Requirement**: Apps must be upfront about what data is collected and how it's used
- **Implementation**: 
  - Consent dialog on first launch requesting explicit permission
  - Clear disclosure of data types collected (workflows, executions, user profiles)
  - No data collection before consent is granted
  - All data collection purposes clearly stated

#### 4.7 - HTML5 Games, Bots, etc.
- **Requirement**: Apps using AI must disclose AI capabilities
- **Implementation**:
  - AI Usage Disclosure module shown before AI features are used
  - Clear labeling of all AI-generated content
  - Explanation of how AI processes user data
  - Option to opt-out of AI features

#### 4.7.2 - AI-Generated Content
- **Requirement**: Apps must disclose when content is AI-generated
- **Implementation**:
  - All AI-generated workflows labeled with "AI Generated" badge
  - AI workflow generation shows disclosure before processing
  - Users can review and approve AI suggestions before application
  - Clear attribution of AI vs. human-created content

#### 5.1.1 - Privacy Policy
- **Requirement**: All apps must have a clear and accessible privacy policy
- **Implementation**:
  - Privacy policy accessible from multiple locations (settings, footer, consent dialog)
  - Policy written in clear, non-technical language
  - Updated date clearly displayed
  - Contact information for privacy inquiries

#### 5.1.2(i) - Data Minimization
- **Requirement**: Collect only data necessary for app functionality
- **Implementation**:
  - Optional analytics (disabled by default)
  - Workflow execution logs retention configurable (7-90 days or never)
  - User profiles contain only essential information
  - No third-party analytics without explicit consent

### Google Play Policies

#### Data Safety Requirements
- **Requirement**: Declare all data collection in Data Safety section
- **Data Types Collected**:
  - User account information (email, profile)
  - Workflow definitions (user-created content)
  - Execution history (performance metrics)
  - Optional: Usage analytics (only if user opts in)

#### Families Policy Compliance
- **Requirement**: Age-appropriate content and age-gating
- **Implementation**:
  - Age gate on first launch (13+ required)
  - Content filtering for sensitive workflows
  - Parental consent flow for users under 18
  - No targeted advertising to minors

#### Permissions Policy
- **Requirement**: Request only necessary permissions with clear explanation
- **Implementation**:
  - Runtime permission requests with context
  - No permissions requested on app launch
  - Clear explanation before each permission request
  - Graceful degradation if permissions denied

## Data Handling Principles

### 1. Data Minimization
**Principle**: Collect only what is necessary for core functionality.

**Implementation**:
- Workflows: Required for core functionality
- Execution history: Optional, user-configurable retention
- Analytics: Opt-in only, disabled by default
- Crash reports: Anonymous, opt-in only

### 2. On-Device Processing
**Principle**: Process data locally when possible.

**Implementation**:
- Workflow validation: Client-side
- Basic analytics: Client-side aggregation before upload
- Search/filtering: Client-side operations
- Draft workflows: Local storage only

### 3. Encryption in Transit
**Principle**: All data transmission must be encrypted.

**Implementation**:
- HTTPS/TLS 1.3 for all API calls
- Supabase connection uses SSL
- Edge functions enforce HTTPS
- No fallback to unencrypted connections

### 4. User Consent
**Principle**: No data collection without explicit, informed consent.

**Implementation**:
- Consent dialog on first launch
- Granular consent options:
  - Essential (required for app to function)
  - Analytics (optional, disabled by default)
  - AI features (optional, separate consent)
  - Crash reporting (optional)
- Consent can be withdrawn at any time
- Consent choices stored locally and respected

### 5. Data Retention
**Principle**: Retain data only as long as necessary.

**Implementation**:
- Default retention: 30 days for execution history
- User-configurable: 7, 30, 90 days, or indefinite
- Option to disable all retention
- Automatic purging of expired data
- Manual purge available anytime

## Implementation Details

### Consent Management System

**ConsentDialog Component**:
- Shown on first app launch
- Cannot be dismissed without making choices
- Clear explanation of each data type
- "Accept All" and "Essential Only" quick options
- Granular control for advanced users
- Consent choices stored in localStorage and Supabase

**Consent Types**:
```typescript
interface ConsentPreferences {
  essential: boolean;        // Always true (required)
  analytics: boolean;        // Optional
  aiFeatures: boolean;       // Optional
  crashReporting: boolean;   // Optional
  marketing: boolean;        // Optional (future use)
  thirdParty: boolean;       // Optional (future use)
  version: string;           // Track consent version
  timestamp: string;         // When consent was given
}
```

### Age Gating System

**AgeGate Component**:
- Shown before consent dialog
- Requires user to confirm age 13+
- Blocks access if under 13
- For users 13-17: Additional parental consent flow
- Age verification stored securely
- Re-verification required annually

**Age Verification Levels**:
- Level 1: Self-declaration (13+)
- Level 2: Parental email verification (13-17)
- Level 3: Age verification service (enterprise only)

### AI Usage Disclosure

**AIUsageDisclosure Component**:
- Shown before first use of AI features
- Explains what AI does with user data
- Lists AI model providers (Lovable AI)
- Option to opt-out of AI features
- "Learn More" link to detailed AI policy
- Must be acknowledged before AI features work

**AI Disclosure Content**:
- What data is sent to AI models
- How AI processes the data
- Data retention by AI providers
- User control over AI features
- How to disable AI features

### Data Deletion System

**DataDeletionDialog Component**:
- Accessible from Privacy Settings
- Clear warning about irreversibility
- Options for partial or complete deletion:
  - Delete execution history only
  - Delete all workflows
  - Delete entire account
- Confirmation required
- Progress indicator during deletion
- Confirmation email sent after deletion

**Deletion Process**:
1. User initiates deletion request
2. Confirmation dialog with warnings
3. Re-authentication required
4. Data deletion executed:
   - Mark user data for deletion
   - Queue deletion jobs
   - Remove from active databases
   - Purge from backups (within 30 days)
5. Confirmation sent to user email
6. Account locked immediately
7. Complete removal within 30 days

### Privacy Settings Page

**Privacy Page Features**:
- View and modify consent preferences
- Configure data retention periods
- Export all user data (GDPR right to portability)
- Delete account or specific data
- View privacy policy
- Contact privacy team
- Download data deletion certificate

### Logging and Analytics

**Privacy-Compliant Logging**:
- No logging before consent
- Respect user's analytics consent
- No PII in logs
- Anonymized identifiers only
- Log retention: 30 days maximum
- User can request log deletion

**Analytics Implementation**:
- Disabled by default
- Opt-in through consent dialog
- Anonymous user IDs only
- No cross-site tracking
- No third-party analytics without consent
- User can view collected analytics data

## Technical Implementation

### Privacy Context Provider

```typescript
interface PrivacyContextType {
  consent: ConsentPreferences | null;
  hasConsent: (type: ConsentType) => boolean;
  updateConsent: (preferences: Partial<ConsentPreferences>) => Promise<void>;
  isAgeVerified: boolean;
  deleteUserData: (options: DeletionOptions) => Promise<void>;
  exportUserData: () => Promise<void>;
}
```

### Data Flow with Privacy Controls

1. **User Action** → Check consent for action type
2. **Consent Granted** → Proceed with action
3. **Consent Not Granted** → Show consent dialog or block action
4. **Data Generated** → Check retention settings
5. **Data Stored** → Apply retention policy
6. **Data Used** → Respect encryption and access controls

### Encryption Standards

- **In Transit**: TLS 1.3
- **At Rest**: AES-256 (Supabase default)
- **End-to-End**: Optional for sensitive workflows
- **Key Management**: Supabase managed keys

## Compliance Checklist

### Apple App Store Review
- [ ] Privacy policy linked in app and App Store listing
- [ ] Consent dialog shown on first launch
- [ ] All data collection disclosed
- [ ] AI features clearly labeled
- [ ] AI-generated content marked
- [ ] Data deletion available
- [ ] Age-gating implemented
- [ ] No data collection before consent
- [ ] Privacy controls accessible

### Google Play Store Review
- [ ] Data Safety section completed accurately
- [ ] Privacy policy accessible
- [ ] Age-gating for 13+
- [ ] Permissions requested with context
- [ ] No excessive permissions
- [ ] Data retention disclosed
- [ ] Deletion mechanism provided
- [ ] Families Policy compliant (if applicable)

## Testing and Validation

### Privacy Testing Checklist
- [ ] Consent dialog shows on first launch
- [ ] App functions with minimal consent (essential only)
- [ ] Analytics disabled when consent not given
- [ ] AI features disabled when consent not given
- [ ] Age gate blocks underage users
- [ ] Data deletion removes all user data
- [ ] Data export provides complete data set
- [ ] Consent can be withdrawn
- [ ] Privacy settings persist across sessions

### Automated Tests
- Unit tests for privacy context
- Integration tests for consent flows
- E2E tests for data deletion
- Privacy compliance verification scripts

## Maintenance and Updates

### Regular Reviews
- Quarterly privacy policy review
- Annual consent version update
- Continuous monitoring of guideline changes
- Regular security audits

### Incident Response
- Data breach notification within 72 hours
- User notification for privacy incidents
- Incident logging and review
- Post-incident policy updates

## Contact Information

**Privacy Team**: privacy@remora.dev  
**Data Protection Officer**: dpo@remora.dev  
**Security Team**: security@remora.dev

## Document History

- **Version 1.0** (2025-01-13): Initial privacy compliance implementation
- Apple App Store Guidelines: 1.2.1(a), 4.7, 4.7.2, 5.1.1, 5.1.2(i)
- Google Play: Data Safety, Families Policy, Permissions Policy

## Appendix

### Relevant Apple Guidelines
- 1.2.1(a): Data Collection and Storage
- 4.7: HTML5 Games, Bots, etc.
- 4.7.2: AI-Generated Content
- 5.1.1: Privacy Policy
- 5.1.2(i): Data Minimization

### Relevant Google Policies
- Data Safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Families Policy: https://support.google.com/googleplay/android-developer/answer/9893335
- Permissions: https://support.google.com/googleplay/android-developer/answer/9888170

### Additional Resources
- GDPR Compliance: https://gdpr.eu/
- COPPA Compliance: https://www.ftc.gov/coppa
- CalOPPA: https://oag.ca.gov/privacy/ccpa
