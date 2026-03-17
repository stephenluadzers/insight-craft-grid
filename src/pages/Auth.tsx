import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Workflow, Zap, Shield, Bot, ArrowRight } from "lucide-react";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  password: z.string().min(12, "Password must be at least 12 characters").max(100, "Password must be less than 100 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

const signInSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const features = [
  { icon: Zap, label: "Parallel Execution", desc: "Run branches simultaneously" },
  { icon: Bot, label: "AI Agents", desc: "Autonomous goal-driven workflows" },
  { icon: Shield, label: "Auto-Guardrails", desc: "Built-in compliance & security" },
];

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) navigate("/");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ title: "Email required", description: "Please enter your email address first.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: "Check your email", description: "We've sent you a password reset link." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not send reset email.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const validation = signUpSchema.safeParse({ fullName, email, password });
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: validation.data.email,
        password: validation.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: validation.data.fullName },
        },
      });
      if (error) throw error;
      toast({ title: "Account created!", description: "Check your email to verify your account." });
    } catch (error: any) {
      toast({ title: "Sign up failed", description: error.message || "An error occurred during sign up", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const validation = signInSchema.safeParse({ email, password });
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setIsLoading(true);
    try {
      // Sign in directly — don't block on rate limit edge function
      const { error } = await supabase.auth.signInWithPassword({
        email: validation.data.email,
        password: validation.data.password,
      });

      // Fire-and-forget: record the attempt (don't await)
      supabase.functions.invoke('record-login-attempt', {
        body: { email: validation.data.email, success: !error },
      }).catch(() => {});

      if (error) {
        toast({
          title: "Authentication Failed",
          description: "Invalid email or password. Please try again.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Welcome back!", description: "You have successfully signed in." });
    } catch {
      // handled above
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background overflow-hidden">
      {/* Left panel — Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-hero items-center justify-center p-12">
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute w-96 h-96 rounded-full bg-accent/20 blur-3xl"
            animate={{ x: [0, 60, 0], y: [0, -40, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            style={{ top: "10%", left: "10%" }}
          />
          <motion.div
            className="absolute w-80 h-80 rounded-full bg-primary-glow/30 blur-3xl"
            animate={{ x: [0, -50, 0], y: [0, 60, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            style={{ bottom: "10%", right: "10%" }}
          />
        </div>

        <div className="relative z-10 max-w-md text-primary-foreground">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center">
                <Workflow className="w-7 h-7" />
              </div>
              <span className="text-xl font-bold tracking-tight">Remora Flow</span>
            </div>

            <h1 className="text-4xl font-extrabold leading-tight mb-4">
              Orchestrate anything.
              <br />
              <span className="text-accent-glow">Ship faster.</span>
            </h1>
            <p className="text-primary-foreground/80 text-lg mb-10 leading-relaxed">
              Build, run, and monitor AI-powered workflows with real-time execution, auto-guardrails, and multi-agent orchestration.
            </p>
          </motion.div>

          <div className="space-y-4">
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.15, duration: 0.5 }}
                className="flex items-center gap-4 bg-primary-foreground/10 backdrop-blur-sm rounded-xl px-5 py-3.5 border border-primary-foreground/10"
              >
                <f.icon className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">{f.label}</p>
                  <p className="text-xs text-primary-foreground/60">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Workflow className="w-8 h-8 text-primary" />
            <span className="text-lg font-bold text-foreground">Remora Flow</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-muted-foreground mb-8">
            {mode === "signin"
              ? "Sign in to continue building workflows"
              : "Start automating in under 2 minutes"}
          </p>

          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, x: mode === "signin" ? -10 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === "signin" ? 10 : -10 }}
              transition={{ duration: 0.25 }}
              onSubmit={mode === "signin" ? handleSignIn : handleSignUp}
              className="space-y-5"
            >
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="Jane Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="h-11"
                  />
                  {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={mode === "signup" ? 12 : undefined}
                  className="h-11"
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                {mode === "signup" && (
                  <p className="text-xs text-muted-foreground">
                    12+ chars · uppercase · lowercase · number · special character
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-gradient-hero hover:opacity-90 transition-opacity text-primary-foreground font-semibold"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                {isLoading
                  ? mode === "signin" ? "Signing in..." : "Creating account..."
                  : mode === "signin" ? "Sign In" : "Create Account"}
              </Button>
            </motion.form>
          </AnimatePresence>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setErrors({}); }}
              className="text-primary font-semibold hover:underline"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
