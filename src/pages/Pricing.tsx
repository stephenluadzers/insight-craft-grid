import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Shield, Zap, Users, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    icon: Zap,
    color: 'text-blue-500',
    features: [
      '3 workflows',
      '100 executions/month',
      '1 team member',
      '7-day audit logs',
      'Community support'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 99,
    icon: Shield,
    color: 'text-purple-500',
    popular: true,
    features: [
      '25 workflows',
      '10K executions/month',
      '5 team members',
      'Custom guardrails',
      '30-day audit logs',
      'Priority support',
      'Advanced analytics'
    ]
  },
  {
    id: 'business',
    name: 'Business',
    price: 499,
    icon: Users,
    color: 'text-orange-500',
    features: [
      '100 workflows',
      '100K executions/month',
      '25 team members',
      'SSO authentication',
      '90-day audit logs',
      '99.9% SLA guarantee',
      'Custom branding',
      'Dedicated support'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 2999,
    icon: Crown,
    color: 'text-yellow-500',
    features: [
      'Unlimited workflows',
      'Unlimited executions',
      'Unlimited team members',
      'SSO + Advanced auth',
      '365-day audit logs',
      '99.99% SLA guarantee',
      'Custom branding',
      'Dedicated support',
      'Custom contracts',
      'On-premise deployment'
    ]
  }
];

export default function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubscribe = async (tierId: string) => {
    if (tierId === 'free') {
      toast({
        title: "Already on Free Plan",
        description: "You're currently using the free tier",
      });
      return;
    }

    setLoading(tierId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { tier: tierId }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Checkout Failed",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <Badge variant="outline" className="border-primary/50">
            Pricing
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold">
            Choose Your Enterprise Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Scale from prototype to millions of workflows with enterprise-grade security and compliance
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            return (
              <Card 
                key={tier.id}
                className={tier.popular ? 'border-primary shadow-lg scale-105' : ''}
              >
                <CardHeader>
                  {tier.popular && (
                    <Badge className="w-fit mb-2">Most Popular</Badge>
                  )}
                  <div className="flex items-center gap-3">
                    <Icon className={`w-8 h-8 ${tier.color}`} />
                    <div>
                      <CardTitle>{tier.name}</CardTitle>
                    </div>
                  </div>
                  <div className="pt-4">
                    <span className="text-4xl font-bold">${tier.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <CardDescription>
                    {tier.id === 'free' && 'Perfect for getting started'}
                    {tier.id === 'professional' && 'For growing teams'}
                    {tier.id === 'business' && 'For established companies'}
                    {tier.id === 'enterprise' && 'For large organizations'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={tier.popular ? 'default' : 'outline'}
                    onClick={() => handleSubscribe(tier.id)}
                    disabled={loading === tier.id}
                  >
                    {loading === tier.id ? 'Processing...' : 
                     tier.id === 'free' ? 'Current Plan' : 'Upgrade Now'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader>
            <CardTitle>Enterprise Features</CardTitle>
            <CardDescription>Advanced capabilities for mission-critical workflows</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Shield className="w-8 h-8 text-primary" />
                <h3 className="font-semibold">Enterprise Security</h3>
                <p className="text-sm text-muted-foreground">
                  SOC2, GDPR, HIPAA, PCI-DSS compliance built-in with automatic guardrails
                </p>
              </div>
              <div className="space-y-2">
                <Users className="w-8 h-8 text-primary" />
                <h3 className="font-semibold">Team Collaboration</h3>
                <p className="text-sm text-muted-foreground">
                  Real-time collaboration, role-based access control, and approval workflows
                </p>
              </div>
              <div className="space-y-2">
                <Zap className="w-8 h-8 text-primary" />
                <h3 className="font-semibold">99.99% Uptime SLA</h3>
                <p className="text-sm text-muted-foreground">
                  Enterprise-grade reliability with dedicated support and guaranteed uptime
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
