import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  PlayCircle, 
  FileJson, 
  Youtube, 
  Image as ImageIcon,
  ArrowRight,
  CheckCircle,
  X,
  Lightbulb,
  Zap
} from "lucide-react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: () => void;
  completed?: boolean;
}

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
  onAction: (action: string) => void;
}

export const OnboardingWizard = ({ onComplete, onSkip, onAction }: OnboardingWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isVisible, setIsVisible] = useState(true);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to FlowFuse',
      description: 'Build powerful AI workflows visually. No coding required.',
      icon: <Sparkles className="h-8 w-8 text-primary" />
    },
    {
      id: 'create-first',
      title: 'Create Your First Workflow',
      description: 'Describe what you want to automate in plain English, and AI will build it.',
      icon: <Zap className="h-8 w-8 text-yellow-500" />,
      action: () => onAction('open-ai-generator')
    },
    {
      id: 'input-types',
      title: 'Multiple Input Types',
      description: 'Import from YouTube videos, images, documents, or GitHub repos.',
      icon: <Youtube className="h-8 w-8 text-red-500" />,
      action: () => onAction('show-input-types')
    },
    {
      id: 'templates',
      title: 'Start from Templates',
      description: 'Browse 100+ pre-built workflows for common automation tasks.',
      icon: <FileJson className="h-8 w-8 text-blue-500" />,
      action: () => onAction('open-templates')
    },
    {
      id: 'keyboard',
      title: 'Keyboard Shortcuts',
      description: 'Speed up your workflow with keyboard shortcuts.',
      icon: <Lightbulb className="h-8 w-8 text-orange-500" />
    }
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    const step = steps[currentStep];
    setCompletedSteps(prev => new Set([...prev, step.id]));
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem('flowfuse_onboarding_complete', 'true');
    setIsVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('flowfuse_onboarding_complete', 'true');
    setIsVisible(false);
    onSkip();
  };

  useEffect(() => {
    const completed = localStorage.getItem('flowfuse_onboarding_complete');
    if (completed === 'true') {
      setIsVisible(false);
    }
  }, []);

  if (!isVisible) return null;

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-6 space-y-6 animate-in fade-in-0 zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Badge variant="secondary">Step {currentStep + 1} of {steps.length}</Badge>
          <Button variant="ghost" size="icon" onClick={handleSkip}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress */}
        <Progress value={progress} className="h-2" />

        {/* Step indicators */}
        <div className="flex justify-center gap-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep
                  ? 'bg-primary'
                  : completedSteps.has(step.id)
                  ? 'bg-green-500'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-center space-y-4 py-6">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-muted">
              {currentStepData.icon}
            </div>
          </div>
          <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            {currentStepData.description}
          </p>

          {/* Keyboard shortcuts display */}
          {currentStepData.id === 'keyboard' && (
            <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span>New Node</span>
                <kbd className="px-2 py-1 bg-background rounded text-xs">N</kbd>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span>Delete</span>
                <kbd className="px-2 py-1 bg-background rounded text-xs">Del</kbd>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span>Undo</span>
                <kbd className="px-2 py-1 bg-background rounded text-xs">⌘Z</kbd>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span>Save</span>
                <kbd className="px-2 py-1 bg-background rounded text-xs">⌘S</kbd>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span>AI Generate</span>
                <kbd className="px-2 py-1 bg-background rounded text-xs">⌘K</kbd>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span>Run Workflow</span>
                <kbd className="px-2 py-1 bg-background rounded text-xs">⌘⏎</kbd>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={handleSkip}>
            Skip Tutorial
          </Button>
          <Button className="flex-1 gap-2" onClick={() => {
            if (currentStepData.action) {
              currentStepData.action();
            }
            handleNext();
          }}>
            {currentStep === steps.length - 1 ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Get Started
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};
