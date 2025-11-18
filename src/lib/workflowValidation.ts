import { WorkflowNodeData } from "@/types/workflow";

export interface NodeValidation {
  nodeId: string;
  nodeTitle: string;
  nodeType: string;
  status: 'valid' | 'warning' | 'error';
  message?: string;
  requirements?: {
    name: string;
    status: 'missing' | 'configured';
    actionLabel?: string;
    actionType?: 'credential' | 'permission' | 'config';
  }[];
  suggestedFixes?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  canRunAnyway: boolean;
  validations: NodeValidation[];
}

// Check if a node has required credentials configured
const checkNodeRequirements = (node: WorkflowNodeData): NodeValidation => {
  const validation: NodeValidation = {
    nodeId: node.id,
    nodeTitle: node.title,
    nodeType: node.type,
    status: 'valid',
    requirements: []
  };

  // Check based on node type and configuration
  switch (node.type) {
    case 'trigger':
      if (node.config?.event_source === 'computer_activity_monitor') {
        validation.requirements?.push({
          name: 'RescueTime API key',
          status: 'missing',
          actionLabel: 'Configure RescueTime',
          actionType: 'credential'
        });
        validation.status = 'error';
        validation.message = 'Requires RescueTime API key';
      } else if (node.config?.event_source === 'sms_inbound') {
        validation.requirements?.push({
          name: 'Twilio account + phone number',
          status: 'missing',
          actionLabel: 'Connect Twilio',
          actionType: 'credential'
        });
        validation.status = 'error';
        validation.message = 'Requires Twilio account';
      }
      break;

    case 'action':
      const service = node.config?.service;
      if (service === 'sms_provider') {
        validation.requirements?.push({
          name: 'Twilio credentials',
          status: 'missing',
          actionLabel: 'Connect Twilio',
          actionType: 'credential'
        });
        validation.status = 'error';
        validation.message = 'Requires SMS service configuration';
      } else if (service === 'email') {
        validation.requirements?.push({
          name: 'Email service',
          status: 'missing',
          actionLabel: 'Configure Email',
          actionType: 'credential'
        });
        validation.status = 'error';
        validation.message = 'Requires email service configuration';
      } else if (service === 'notification_provider') {
        validation.requirements?.push({
          name: 'Push notification permissions',
          status: 'missing',
          actionLabel: 'Enable Notifications',
          actionType: 'permission'
        });
        validation.status = 'warning';
        validation.message = 'Requires push notification permissions';
      } else if (service === 'webhook') {
        if (!node.config?.url) {
          validation.status = 'error';
          validation.message = 'Webhook URL not configured';
          validation.requirements?.push({
            name: 'Webhook URL',
            status: 'missing',
            actionLabel: 'Set Webhook URL',
            actionType: 'config'
          });
        }
      } else if (!service || service === 'log') {
        // Log actions are always valid
        validation.status = 'valid';
      }
      break;

    case 'condition':
    case 'data':
      // These typically don't require external services
      validation.status = 'valid';
      break;

    case 'ai':
      // Check if AI prompt is configured
      if (!node.config?.prompt) {
        validation.status = 'warning';
        validation.message = 'AI prompt not configured';
        validation.requirements?.push({
          name: 'AI prompt',
          status: 'missing',
          actionLabel: 'Set AI Prompt',
          actionType: 'config'
        });
      }
      break;
  }

  return validation;
};

export const validateWorkflow = (nodes: WorkflowNodeData[]): ValidationResult => {
  if (nodes.length === 0) {
    return {
      isValid: false,
      canRunAnyway: false,
      validations: []
    };
  }

  const validations = nodes.map(checkNodeRequirements);
  
  const hasErrors = validations.some(v => v.status === 'error');
  const hasWarnings = validations.some(v => v.status === 'warning');

  return {
    isValid: !hasErrors,
    canRunAnyway: !hasErrors && hasWarnings, // Can run if only warnings
    validations
  };
};

export const generateErrorFixes = (error: string, nodeType: string): string[] => {
  const fixes: string[] = [];

  // Check for common error patterns
  if (error.includes('Twilio') || error.includes('SMS')) {
    fixes.push('Check your Twilio API key is correct');
    fixes.push('Verify phone number is registered with Twilio');
    fixes.push('Check Twilio account balance');
  }

  if (error.includes('email') || error.includes('SMTP')) {
    fixes.push('Verify email service credentials');
    fixes.push('Check SMTP server configuration');
    fixes.push('Ensure sender email is verified');
  }

  if (error.includes('webhook') || error.includes('HTTP')) {
    fixes.push('Verify webhook URL is correct and accessible');
    fixes.push('Check if the target service is online');
    fixes.push('Review webhook authentication settings');
  }

  if (error.includes('authentication') || error.includes('unauthorized')) {
    fixes.push('Verify API credentials are correct');
    fixes.push('Check if credentials have expired');
    fixes.push('Ensure account has necessary permissions');
  }

  if (error.includes('rate limit') || error.includes('429')) {
    fixes.push('Wait a few minutes before retrying');
    fixes.push('Review service rate limits');
    fixes.push('Consider upgrading service plan');
  }

  // Generic fixes if no specific pattern matched
  if (fixes.length === 0) {
    fixes.push('Review node configuration settings');
    fixes.push('Check error logs for more details');
    fixes.push('Try running the workflow again');
  }

  return fixes;
};
