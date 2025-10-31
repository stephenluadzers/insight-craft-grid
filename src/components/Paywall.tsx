import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Zap, Lock } from "lucide-react";
import { Link } from "react-router-dom";

const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/bJe00jeZI5Pnauh9Qkfbq02";

export const Paywall = () => {
  const handleSubscribe = () => {
    window.location.href = STRIPE_PAYMENT_LINK;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="w-full max-w-2xl border-primary/20 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Unlock FlowMind Pro
          </CardTitle>
          <CardDescription className="text-lg">
            Get full access to AI-powered workflow automation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid gap-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
              <Sparkles className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">AI Workflow Generation</h3>
                <p className="text-sm text-muted-foreground">
                  Generate workflows from text, images, or voice with advanced AI
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
              <Zap className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">AI Workflow Optimization</h3>
                <p className="text-sm text-muted-foreground">
                  Automatically optimize your workflows for better performance
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
              <Sparkles className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Unlimited Workflows</h3>
                <p className="text-sm text-muted-foreground">
                  Create and manage unlimited workflows with no restrictions
                </p>
              </div>
            </div>
          </div>

          <div className="text-center space-y-4">
            <div className="inline-block">
              <div className="text-5xl font-bold text-primary">$299</div>
              <div className="text-sm text-muted-foreground">per month</div>
            </div>
            <Button 
              onClick={handleSubscribe} 
              size="lg"
              className="w-full text-lg h-12"
            >
              Subscribe Now
            </Button>
            <p className="text-xs text-muted-foreground">
              Secure checkout powered by Stripe. Cancel anytime.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Already have an account?{" "}
              <Link to="/auth" className="text-primary hover:underline font-medium">
                Sign In
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
