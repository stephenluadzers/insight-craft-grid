/**
 * Government Compliance Documentation Generator
 * Generates ATO package, SSP excerpts, PIA, change requests,
 * NIST/FISMA/FedRAMP mappings, and records management metadata
 */

import { WorkflowNodeData } from "@/types/workflow";
import JSZip from "jszip";

interface GovComplianceContext {
  workflowName: string;
  nodes: WorkflowNodeData[];
  hasAI: boolean;
  hasIntegrations: boolean;
  hasPII: boolean;
  dataTypes: string[];
  externalServices: string[];
}

function detectContext(nodes: WorkflowNodeData[], workflowName: string): GovComplianceContext {
  const hasAI = nodes.some(n => n.type === 'ai');
  const hasIntegrations = nodes.some(n => n.type === 'action');

  // Detect PII-related nodes
  const piiKeywords = ['email', 'user', 'name', 'address', 'phone', 'ssn', 'social', 'dob', 'birth', 'patient', 'citizen', 'employee', 'personnel', 'applicant'];
  const allText = nodes.map(n => `${n.title} ${n.description} ${JSON.stringify(n.config || {})}`).join(' ').toLowerCase();
  const hasPII = piiKeywords.some(k => allText.includes(k));

  // Detect data types
  const dataTypes: string[] = [];
  if (hasPII) dataTypes.push('Personally Identifiable Information (PII)');
  if (allText.includes('health') || allText.includes('hipaa') || allText.includes('patient')) dataTypes.push('Protected Health Information (PHI)');
  if (allText.includes('financial') || allText.includes('payment') || allText.includes('bank')) dataTypes.push('Financial Data');
  if (allText.includes('classified') || allText.includes('secret') || allText.includes('confidential')) dataTypes.push('Controlled Unclassified Information (CUI)');
  if (hasAI) dataTypes.push('AI/ML Model Input/Output Data');
  if (dataTypes.length === 0) dataTypes.push('General Business Data');

  // Detect external services from node titles/configs
  const serviceKeywords: Record<string, string> = {
    'slack': 'Slack (Salesforce)', 'gmail': 'Google Workspace', 'google': 'Google Cloud Platform',
    'aws': 'Amazon Web Services', 'azure': 'Microsoft Azure', 'openai': 'OpenAI',
    'stripe': 'Stripe', 'twilio': 'Twilio', 'sendgrid': 'SendGrid (Twilio)',
    'github': 'GitHub (Microsoft)', 'jira': 'Atlassian Jira', 'salesforce': 'Salesforce',
    'sharepoint': 'Microsoft SharePoint', 'teams': 'Microsoft Teams',
    'dropbox': 'Dropbox', 'box': 'Box', 'servicenow': 'ServiceNow',
  };
  const externalServices: string[] = [];
  for (const [keyword, service] of Object.entries(serviceKeywords)) {
    if (allText.includes(keyword) && !externalServices.includes(service)) {
      externalServices.push(service);
    }
  }

  return { workflowName, nodes, hasAI, hasIntegrations, hasPII, dataTypes, externalServices };
}

function generateSystemSecurityPlan(ctx: GovComplianceContext): string {
  const date = new Date().toLocaleDateString();
  return `# System Security Plan (SSP) — Excerpt
## Automated Workflow: ${ctx.workflowName}

**Document Date:** ${date}
**Classification:** Unclassified // For Official Use Only (U//FOUO)
**Prepared By:** FlowFuse Enterprise (Automated)

---

## 1. System Identification

| Field | Value |
|-------|-------|
| **System Name** | ${ctx.workflowName} |
| **System Type** | Automated Workflow / Robotic Process Automation |
| **FIPS 199 Category** | ${ctx.hasPII ? 'MODERATE' : 'LOW'} |
| **Deployment Model** | Cloud-hosted SaaS |
| **Node Count** | ${ctx.nodes.length} |
| **Contains AI/ML** | ${ctx.hasAI ? 'Yes — requires AI-specific controls per EO 14110' : 'No'} |

## 2. Information Types Processed

${ctx.dataTypes.map(d => `- ${d}`).join('\n')}

## 3. System Boundary

### 3.1 Internal Components
${ctx.nodes.map((n, i) => `${i + 1}. **${n.title}** (${n.type}) — ${n.description || 'No description'}`).join('\n')}

### 3.2 External Interconnections
${ctx.externalServices.length > 0
    ? ctx.externalServices.map(s => `- ${s} — API integration, encrypted in transit (TLS 1.2+)`).join('\n')
    : '- No external service connections detected'}

## 4. Security Controls (NIST SP 800-53 Rev. 5)

### 4.1 Access Control (AC)
- **AC-2:** Workflow execution requires authenticated user session
- **AC-3:** Role-based access enforced via workspace membership
- **AC-6:** Least privilege — credentials scoped per-node, per-service
${ctx.hasAI ? '- **AC-6(9):** AI model access restricted to authorized workflow nodes\n- **AC-22:** AI outputs reviewed before external distribution' : ''}

### 4.2 Audit & Accountability (AU)
- **AU-2:** All executions logged with timestamp, user, input/output hash
- **AU-3:** Logs include node-level execution detail
- **AU-6:** Execution logs available for review via analytics dashboard
- **AU-12:** Audit records generated automatically per execution

### 4.3 Configuration Management (CM)
- **CM-2:** Baseline configuration captured in exported JSON/YAML
- **CM-3:** Version history maintained for all workflow modifications
- **CM-6:** Node configurations locked after approval
- **CM-8:** Component inventory maintained (this document)

### 4.4 Identification & Authentication (IA)
- **IA-2:** Multi-factor authentication supported
- **IA-5:** API credentials stored encrypted, rotatable
- **IA-8:** Service-to-service authentication via API keys/OAuth

### 4.5 System & Communications Protection (SC)
- **SC-8:** Data encrypted in transit (TLS 1.2+)
- **SC-12:** Cryptographic key management via platform vault
- **SC-13:** FIPS 140-2 validated cryptographic modules (platform level)
- **SC-28:** Data at rest encrypted (AES-256)

${ctx.hasAI ? `### 4.6 AI-Specific Controls (per EO 14110 & NIST AI RMF)
- **AI-1:** AI model provenance documented
- **AI-2:** Input/output logging enabled for audit trail
- **AI-3:** Guardrails applied to prevent harmful outputs
- **AI-4:** Human-in-the-loop review configurable per node
- **AI-5:** Bias monitoring recommended for production deployment` : ''}

## 5. Authorization Boundary Diagram

\`\`\`
┌─────────────────────────────────────────────┐
│          ${ctx.workflowName.substring(0, 30).padEnd(30)}     │
│  ┌──────────┐    ┌──────────┐               │
│  │ Trigger  │───▶│ Process  │──▶ [Output]   │
│  └──────────┘    └──────────┘               │
│       │               │                     │
│       ▼               ▼                     │
│  [Auth Layer]    [Guardrails]               │
│       │               │                     │
└───────┼───────────────┼─────────────────────┘
        │               │
        ▼               ▼
   [Identity         [External
    Provider]         Services]
\`\`\`

## 6. Continuous Monitoring

- Execution success/failure rates tracked
- Error aggregation with alerting
- Credential rotation logging
- Anomaly detection on execution patterns

---
*This SSP excerpt is auto-generated. It must be reviewed and supplemented by your ISSO/ISSM before inclusion in an official ATO package.*
`;
}

function generatePrivacyImpactAssessment(ctx: GovComplianceContext): string {
  const date = new Date().toLocaleDateString();
  return `# Privacy Impact Assessment (PIA)
## Automated Workflow: ${ctx.workflowName}

**Document Date:** ${date}
**Prepared By:** FlowFuse Enterprise (Automated)

---

## Section 1: System Overview

**1.1 System Name:** ${ctx.workflowName}
**1.2 System Description:** Automated workflow consisting of ${ctx.nodes.length} processing nodes.
**1.3 Legal Authority:** [Insert applicable authority — e.g., 5 U.S.C. § 301, agency-specific statute]

## Section 2: Data in the System

**2.1 What information is collected or processed?**

${ctx.dataTypes.map(d => `- ${d}`).join('\n')}

**2.2 Sources of information:**
${ctx.nodes.filter(n => n.type === 'trigger').map(n => `- ${n.title}: ${n.description || 'Automated trigger'}`).join('\n') || '- Automated system triggers'}

**2.3 Why is the information collected?**
To support automated business process execution as defined by the workflow configuration.

**2.4 How is the information used?**
- Routed through workflow nodes for processing
- Transformed and/or enriched at each step
${ctx.hasAI ? '- Analyzed by AI/ML models for classification, generation, or decision support' : ''}
- Output delivered to configured destinations

## Section 3: Data Minimization

**3.1 Does the system collect only the minimum necessary?**
${ctx.hasPII ? '⚠️ PII detected in workflow configuration. Review each node to confirm minimum necessary data collection.' : '✅ No PII detected in current configuration.'}

**3.2 Retention period:**
- Execution logs: Configurable (default: 90 days)
- Workflow definitions: Retained until deleted by user
- Credentials: Encrypted, rotatable, no plaintext storage

## Section 4: Information Sharing

**4.1 External parties receiving data:**
${ctx.externalServices.length > 0
    ? ctx.externalServices.map(s => `- ${s}`).join('\n')
    : '- No external data sharing detected'}

**4.2 How is data transmitted?**
- All external API calls use TLS 1.2+ encryption
- API keys/tokens scoped to minimum required permissions
- No data shared with unauthorized parties

## Section 5: Individual Rights

**5.1 Access:** Users can view all workflow data via the platform dashboard
**5.2 Correction:** Users can modify workflow inputs and configurations
**5.3 Deletion:** Data deletion available via platform controls and API
**5.4 Consent:** Workflow execution initiated by authorized users only

## Section 6: Security Controls

See accompanying System Security Plan (SSP) for detailed NIST SP 800-53 control mappings.

${ctx.hasAI ? `## Section 7: AI/ML Considerations

- AI models may process data for classification, summarization, or generation
- Model inputs/outputs logged for audit purposes
- No automated decision-making without human review (configurable)
- AI bias assessments recommended before production deployment
- Compliance with EO 14110 on Safe, Secure, and Trustworthy AI
` : ''}
---
*This PIA is auto-generated. It must be reviewed by your Privacy Officer / Senior Agency Official for Privacy (SAOP) before submission.*
`;
}

function generateChangeRequest(ctx: GovComplianceContext): string {
  const date = new Date().toLocaleDateString();
  const crNumber = `CR-${Date.now().toString(36).toUpperCase()}`;
  return `# Change Request / Change Management Form
## ${crNumber}

**Date Submitted:** ${date}
**Submitted By:** [Enter Name]
**Organization:** [Enter Organization]
**Priority:** ${ctx.nodes.length > 10 ? 'High' : ctx.nodes.length > 5 ? 'Medium' : 'Low'}

---

## 1. Change Identification

| Field | Value |
|-------|-------|
| **CR Number** | ${crNumber} |
| **System/Application** | ${ctx.workflowName} |
| **Change Type** | New Automated Workflow Deployment |
| **Urgency** | Standard |
| **Impact Level** | ${ctx.hasPII ? 'Moderate — processes PII' : 'Low — no sensitive data detected'} |

## 2. Description of Change

Deploy new automated workflow "${ctx.workflowName}" consisting of ${ctx.nodes.length} processing nodes.

### Workflow Components:
${ctx.nodes.map((n, i) => `${i + 1}. **${n.title}** (${n.type}) — ${n.description || 'N/A'}`).join('\n')}

### External Dependencies:
${ctx.externalServices.length > 0 ? ctx.externalServices.map(s => `- ${s}`).join('\n') : '- None identified'}

## 3. Justification / Business Case

[Enter business justification — reference BUSINESS_METRICS.md for ROI analysis]

## 4. Risk Assessment

| Risk Factor | Level | Notes |
|-------------|-------|-------|
| Data Sensitivity | ${ctx.hasPII ? '⚠️ Moderate' : '✅ Low'} | ${ctx.hasPII ? 'PII processing detected' : 'No PII detected'} |
| External Integrations | ${ctx.externalServices.length > 2 ? '⚠️ Moderate' : '✅ Low'} | ${ctx.externalServices.length} external service(s) |
| AI/ML Components | ${ctx.hasAI ? '⚠️ Review Required' : '✅ N/A'} | ${ctx.hasAI ? 'AI nodes require additional review per EO 14110' : 'No AI components'} |
| Complexity | ${ctx.nodes.length > 10 ? '⚠️ High' : ctx.nodes.length > 5 ? 'Moderate' : '✅ Low'} | ${ctx.nodes.length} nodes |

## 5. Implementation Plan

1. Review and approve this Change Request
2. Validate all credentials (see CREDENTIAL_SETUP.md)
3. Deploy to staging/test environment
4. Execute test runs and validate output
5. Obtain security authorization (if applicable)
6. Deploy to production
7. Monitor for 72 hours post-deployment

## 6. Rollback Plan

1. Disable workflow execution
2. Revert to previous workflow version (see version history)
3. Notify affected stakeholders
4. Document rollback reason

## 7. Approvals

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Requester | ________________ | ________ | _________ |
| Technical Lead | ________________ | ________ | _________ |
| Security (ISSO) | ________________ | ________ | _________ |
| Change Manager | ________________ | ________ | _________ |
| Authorizing Official | ________________ | ________ | _________ |

---
*Generated by FlowFuse Enterprise. All fields marked [Enter...] must be completed before submission to your Change Advisory Board (CAB).*
`;
}

function generateNISTControlMapping(ctx: GovComplianceContext): string {
  const controls = [
    { id: 'AC-2', family: 'Access Control', title: 'Account Management', status: '✅ Implemented', impl: 'User accounts managed via platform authentication; workspace-based access control' },
    { id: 'AC-3', family: 'Access Control', title: 'Access Enforcement', status: '✅ Implemented', impl: 'Role-based access to workflows and executions' },
    { id: 'AC-6', family: 'Access Control', title: 'Least Privilege', status: '✅ Implemented', impl: 'Credentials scoped per-service with minimum permissions' },
    { id: 'AU-2', family: 'Audit', title: 'Event Logging', status: '✅ Implemented', impl: 'All workflow executions logged with full detail' },
    { id: 'AU-3', family: 'Audit', title: 'Content of Audit Records', status: '✅ Implemented', impl: 'Logs include user, timestamp, node, input/output, status' },
    { id: 'AU-6', family: 'Audit', title: 'Audit Record Review', status: '✅ Implemented', impl: 'Analytics dashboard provides execution review capabilities' },
    { id: 'CM-2', family: 'Config Mgmt', title: 'Baseline Configuration', status: '✅ Implemented', impl: 'Workflow JSON/YAML serves as configuration baseline' },
    { id: 'CM-3', family: 'Config Mgmt', title: 'Configuration Change Control', status: '✅ Implemented', impl: 'Version history tracks all changes with diff capability' },
    { id: 'CM-8', family: 'Config Mgmt', title: 'System Component Inventory', status: '✅ Implemented', impl: 'Node inventory maintained in workflow definition' },
    { id: 'IA-2', family: 'Identification', title: 'User Identification & Auth', status: '✅ Implemented', impl: 'Multi-factor authentication supported' },
    { id: 'IA-5', family: 'Identification', title: 'Authenticator Management', status: '✅ Implemented', impl: 'API keys encrypted, rotatable, with expiration' },
    { id: 'IR-4', family: 'Incident Response', title: 'Incident Handling', status: '⚠️ Partial', impl: 'Error aggregation and alerting; formal IR plan required' },
    { id: 'RA-5', family: 'Risk Assessment', title: 'Vulnerability Monitoring', status: '✅ Implemented', impl: 'Security scanning available for workflow configurations' },
    { id: 'SC-8', family: 'System Protection', title: 'Transmission Confidentiality', status: '✅ Implemented', impl: 'TLS 1.2+ for all communications' },
    { id: 'SC-28', family: 'System Protection', title: 'Protection of Data at Rest', status: '✅ Implemented', impl: 'AES-256 encryption for stored data and credentials' },
    { id: 'SI-4', family: 'System Integrity', title: 'System Monitoring', status: '✅ Implemented', impl: 'Execution monitoring, error tracking, health dashboards' },
    { id: 'SI-10', family: 'System Integrity', title: 'Information Input Validation', status: '✅ Implemented', impl: 'Guardrails validate inputs at each workflow node' },
  ];

  if (ctx.hasPII) {
    controls.push(
      { id: 'AR-1', family: 'Privacy', title: 'Governance & Compliance', status: '⚠️ Review', impl: 'PIA generated (see PIA document); agency review required' },
      { id: 'DM-1', family: 'Privacy', title: 'Minimization of PII', status: '⚠️ Review', impl: 'PII detected — verify minimum necessary collection' },
      { id: 'SE-1', family: 'Privacy', title: 'Inventory of PII', status: '✅ Generated', impl: 'Data types documented in PIA and this mapping' },
    );
  }

  if (ctx.hasAI) {
    controls.push(
      { id: 'AI-RMF-1', family: 'AI (NIST AI RMF)', title: 'Govern', status: '⚠️ Review', impl: 'AI governance policies should be established per NIST AI 100-1' },
      { id: 'AI-RMF-2', family: 'AI (NIST AI RMF)', title: 'Map', status: '✅ Documented', impl: 'AI components identified and documented in SSP' },
      { id: 'AI-RMF-3', family: 'AI (NIST AI RMF)', title: 'Measure', status: '⚠️ Partial', impl: 'Output logging enabled; bias metrics recommended' },
      { id: 'AI-RMF-4', family: 'AI (NIST AI RMF)', title: 'Manage', status: '⚠️ Review', impl: 'Guardrails in place; continuous monitoring recommended' },
    );
  }

  let md = `# NIST SP 800-53 Rev. 5 — Control Mapping\n## Workflow: ${ctx.workflowName}\n\n`;
  md += `**Date:** ${new Date().toLocaleDateString()}\n`;
  md += `**FIPS 199 Categorization:** ${ctx.hasPII ? 'MODERATE' : 'LOW'}\n`;
  md += `**Applicable Frameworks:** NIST SP 800-53r5, FISMA${ctx.hasPII ? ', Privacy Act' : ''}${ctx.hasAI ? ', NIST AI RMF, EO 14110' : ''}\n\n`;

  md += `## Control Implementation Summary\n\n`;
  md += `| Control | Family | Title | Status | Implementation |\n`;
  md += `|---------|--------|-------|--------|----------------|\n`;
  for (const c of controls) {
    md += `| ${c.id} | ${c.family} | ${c.title} | ${c.status} | ${c.impl} |\n`;
  }

  const implemented = controls.filter(c => c.status.includes('✅')).length;
  const partial = controls.filter(c => c.status.includes('⚠️')).length;

  md += `\n## Summary\n\n`;
  md += `- **Fully Implemented:** ${implemented}/${controls.length}\n`;
  md += `- **Partial / Requires Review:** ${partial}/${controls.length}\n`;
  md += `- **Coverage:** ${Math.round((implemented / controls.length) * 100)}%\n\n`;
  md += `---\n*Auto-generated control mapping. Must be validated by your ISSO/ISSM for inclusion in ATO package.*\n`;

  return md;
}

function generateATOChecklist(ctx: GovComplianceContext): string {
  return `# Authority to Operate (ATO) Package Checklist
## Workflow: ${ctx.workflowName}

**Date:** ${new Date().toLocaleDateString()}

---

## Required Documents

| # | Document | Status | Location in Package |
|---|----------|--------|---------------------|
| 1 | System Security Plan (SSP) | ✅ Generated | \`government/SYSTEM_SECURITY_PLAN.md\` |
| 2 | Privacy Impact Assessment (PIA) | ✅ Generated | \`government/PRIVACY_IMPACT_ASSESSMENT.md\` |
| 3 | NIST Control Mapping | ✅ Generated | \`government/NIST_CONTROL_MAPPING.md\` |
| 4 | Change Request Form | ✅ Generated | \`government/CHANGE_REQUEST.md\` |
| 5 | Risk Assessment | ⬜ Required | Reference SECURITY_COMPLIANCE.md |
| 6 | Contingency Plan (CP) | ⬜ Required | Agency-specific template |
| 7 | Incident Response Plan (IRP) | ⬜ Required | Agency-specific template |
| 8 | Configuration Management Plan | ⬜ Required | Reference CM controls in SSP |
| 9 | Plan of Action & Milestones (POA&M) | ⬜ Required | Address ⚠️ items from NIST mapping |
| 10 | Interconnection Security Agreements (ISAs) | ${ctx.externalServices.length > 0 ? '⬜ Required' : 'N/A'} | ${ctx.externalServices.length > 0 ? `Required for: ${ctx.externalServices.join(', ')}` : 'No external connections'} |
${ctx.hasAI ? '| 11 | AI Impact Assessment | ⬜ Required | Per EO 14110 and OMB M-24-10 |\n| 12 | AI Use Case Inventory Entry | ⬜ Required | Per OMB M-24-10 Section 5 |' : ''}

## Pre-ATO Steps

- [ ] Complete all ⬜ documents above
- [ ] Address all ⚠️ items in NIST Control Mapping
- [ ] ISSO review and sign-off
- [ ] Security Assessment (SA&A) by independent assessor
- [ ] POA&M created for any residual risks
- [ ] Authorizing Official (AO) briefing
- [ ] AO signature on Authorization Decision Letter

## Post-ATO Requirements

- [ ] Continuous monitoring plan activated
- [ ] Monthly vulnerability scans
- [ ] Quarterly access reviews
- [ ] Annual security assessment
- [ ] Ongoing POA&M management
${ctx.hasAI ? '- [ ] AI model performance monitoring\n- [ ] Quarterly AI bias assessments' : ''}

## Package Prepared By

| Role | Name | Date |
|------|------|------|
| System Owner | ________________ | ________ |
| ISSO | ________________ | ________ |
| Privacy Officer | ________________ | ________ |

---
*This checklist is auto-generated. Consult your agency's ATO process for additional requirements.*
`;
}

function generateRecordsManagement(ctx: GovComplianceContext): string {
  return `# Records Management Metadata
## Workflow: ${ctx.workflowName}

**Date:** ${new Date().toLocaleDateString()}
**Applicable Standards:** NARA GRS, 36 CFR Chapter XII, 44 U.S.C. Chapter 31

---

## Record Classification

| Field | Value |
|-------|-------|
| **Record Type** | Electronic Automated Process Record |
| **Media** | Digital / Cloud-hosted |
| **Vital Record** | ${ctx.hasPII ? 'Yes' : 'To Be Determined'} |
| **Sensitivity** | ${ctx.hasPII ? 'Sensitive PII' : 'Non-Sensitive'} |

## Retention Schedule

| Record Category | NARA GRS | Retention | Disposition |
|----------------|----------|-----------|-------------|
| Workflow Definition | GRS 3.1-010 | 3 years after superseded | Delete/Destroy |
| Execution Logs | GRS 3.1-020 | 3 years after creation | Delete/Destroy |
| Audit Records | GRS 3.2-080 | 6 years | Delete/Destroy |
| Credential Records | GRS 3.2-040 | Delete when superseded | Delete/Destroy |
| Error/Incident Logs | GRS 3.2-060 | 3 years after resolution | Delete/Destroy |
| Business Metrics | GRS 5.7-010 | 3 years | Delete/Destroy |
${ctx.hasAI ? '| AI Model Outputs | GRS 3.1-020 | 3 years or per agency policy | Delete/Destroy |' : ''}

## Data Disposition Procedures

1. **Identify** records at end of retention period
2. **Verify** no legal hold or FOIA request pending
3. **Approve** disposition with Records Manager
4. **Execute** secure deletion (NIST SP 800-88 compliant)
5. **Document** disposition in records management log

## FOIA Considerations

${ctx.hasPII
    ? `- Workflow processes PII — FOIA Exemption (b)(6) may apply
- Review all outputs for personally identifiable information before release
- Redaction procedures must be applied per agency FOIA policy`
    : `- No PII detected in current workflow configuration
- Standard FOIA processing procedures apply`}

---
*Auto-generated records management metadata. Must be reviewed by your agency Records Manager.*
`;
}

/**
 * Generate all government compliance documents and add them to the ZIP
 */
export function addGovernmentComplianceDocs(
  zip: JSZip,
  nodes: WorkflowNodeData[],
  workflowName: string
): void {
  const ctx = detectContext(nodes, workflowName);
  const govFolder = zip.folder("government")!;

  govFolder.file("SYSTEM_SECURITY_PLAN.md", generateSystemSecurityPlan(ctx));
  govFolder.file("PRIVACY_IMPACT_ASSESSMENT.md", generatePrivacyImpactAssessment(ctx));
  govFolder.file("CHANGE_REQUEST.md", generateChangeRequest(ctx));
  govFolder.file("NIST_CONTROL_MAPPING.md", generateNISTControlMapping(ctx));
  govFolder.file("ATO_CHECKLIST.md", generateATOChecklist(ctx));
  govFolder.file("RECORDS_MANAGEMENT.md", generateRecordsManagement(ctx));
}
