import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for getting started",
    features: [
      "5 workflows per month",
      "100 executions per month",
      "Basic integrations",
      "Community support",
    ],
    current: true,
  },
  {
    name: "Pro",
    price: "$29",
    description: "For professional automation",
    features: [
      "Unlimited workflows",
      "10,000 executions per month",
      "All integrations",
      "Priority support",
      "Advanced analytics",
      "Custom webhooks",
    ],
    priceId: "price_pro", // Replace with actual Stripe price ID
  },
  {
    name: "Enterprise",
    price: "$99",
    description: "For large-scale operations",
    features: [
      "Unlimited everything",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantee",
      "Advanced security",
      "Team collaboration",
    ],
    priceId: "price_enterprise", // Replace with actual Stripe price ID
  },
];

export default function Billing() {
  const [loading, setLoading] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    // Handle success/cancel redirects from Stripe
    if (searchParams.get('success')) {
      toast({
        title: "Subscription activated!",
        description: "Your payment was successful.",
      });
    }
    if (searchParams.get('canceled')) {
      toast({
        title: "Checkout canceled",
        description: "You can subscribe anytime.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

  const handleSubscribe = async (priceId: string, planName: string) => {
    setLoading(priceId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId, userId: user.id },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout process",
        variant: "destructive",
      });
      setLoading(null);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center gap-4 mb-8">
              <SidebarTrigger />
              <div>
                <h1 className="text-3xl font-bold">Billing & Subscriptions</h1>
                <p className="text-muted-foreground">
                  Choose the perfect plan for your automation needs
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((plan) => (
                <Card
                  key={plan.name}
                  className={plan.current ? "border-primary shadow-lg" : ""}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{plan.name}</CardTitle>
                      {plan.current && (
                        <Badge variant="default">Current Plan</Badge>
                      )}
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-primary" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {plan.priceId ? (
                      <Button
                        className="w-full"
                        onClick={() => handleSubscribe(plan.priceId!, plan.name)}
                        disabled={loading === plan.priceId}
                      >
                        {loading === plan.priceId ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Subscribe"
                        )}
                      </Button>
                    ) : (
                      <Button className="w-full" variant="outline" disabled>
                        Current Plan
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>View your recent transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">
                  No payment history yet. Subscribe to a plan to get started!
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
