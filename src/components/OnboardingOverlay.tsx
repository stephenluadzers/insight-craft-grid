import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Zap, Bot, Shield, Workflow,
  ArrowRight, ArrowLeft, X, Rocket, Check,
} from "lucide-react";

interface OnboardingOverlayProps {
  onComplete: () => void;
  onNavigate?: (view: string) => void;
}

const steps = [
  {
    icon: Sparkles,
    color: "text-accent",
    title: "Welcome to Remora Flow",
    desc: "The AI-powered workflow automation platform. Build, run, and scale intelligent automations in minutes.",
    tip: "Press ⌘K anytime for quick navigation",
  },
  {
    icon: Workflow,
    color: "text-primary",
    title: "Visual Workflow Canvas",
    desc: "Drag nodes onto the canvas and connect them visually. Each node represents a step in your automation.",
    tip: "Try: Click 'AI Generate' to create a workflow from a text description",
  },
  {
    icon: Bot,
    color: "text-accent",
    title: "AI Agent Nodes",
    desc: "Use AI-powered nodes for reasoning, planning, and executing complex tasks autonomously.",
    tip: "AI nodes remember context from previous steps automatically",
  },
  {
    icon: Zap,
    color: "text-primary",
    title: "Parallel Execution",
    desc: "Independent branches run simultaneously for blazing-fast workflows. Monitor progress in real-time.",
    tip: "Nodes without dependencies execute in parallel waves",
  },
  {
    icon: Shield,
    color: "text-accent",
    title: "Auto-Guardrails",
    desc: "Security, compliance, and validation nodes are automatically suggested to protect your workflows.",
    tip: "Guardrails support GDPR, HIPAA, PCI-DSS compliance",
  },
  {
    icon: Rocket,
    color: "text-primary",
    title: "You're Ready!",
    desc: "Start by creating your first workflow. Use AI generation, import from a template, or build from scratch.",
    tip: null,
  },
];

export function OnboardingOverlay({ onComplete, onNavigate }: OnboardingOverlayProps) {
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("remora-onboarding-complete");
    if (seen === "true") setDismissed(true);
  }, []);

  const handleComplete = () => {
    localStorage.setItem("remora-onboarding-complete", "true");
    setDismissed(true);
    onComplete();
  };

  if (dismissed) return null;

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md"
      >
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-lg mx-4 glass rounded-2xl border border-border/50 p-8 relative"
        >
          {/* Skip button */}
          <button
            onClick={handleComplete}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mb-8">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-8 bg-primary" : i < step ? "w-3 bg-primary/50" : "w-3 bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-float">
              <Icon className={`w-8 h-8 ${current.color}`} />
            </div>
          </div>

          {/* Content */}
          <h2 className="text-2xl font-bold text-foreground text-center mb-3">{current.title}</h2>
          <p className="text-muted-foreground text-center leading-relaxed mb-4">{current.desc}</p>

          {current.tip && (
            <div className="flex items-center justify-center mb-6">
              <Badge variant="secondary" className="text-xs font-normal">
                💡 {current.tip}
              </Badge>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>

            {isLast ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleComplete();
                    onNavigate?.("ai-builder");
                  }}
                >
                  <Bot className="w-4 h-4 mr-1" />
                  AI Builder
                </Button>
                <Button
                  size="sm"
                  onClick={handleComplete}
                  className="bg-gradient-hero text-primary-foreground gap-1"
                >
                  <Check className="w-4 h-4" />
                  Get Started
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => setStep(step + 1)} className="gap-1">
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
