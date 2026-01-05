/**
 * Workflow Utilities
 * Re-exports from workflowNaming for backward compatibility
 */

export { 
  generateSmartWorkflowName as generateWorkflowName,
  generateSmartWorkflowName,
  generateExportPackageNames,
  generateWorkflowDescription,
  analyzeWorkflowSignature,
  type NamingContext
} from "./workflowNaming";
