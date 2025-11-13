import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { PrivacyProvider } from "@/contexts/PrivacyContext";
import { ConsentDialog } from "@/components/ConsentDialog";
import { AgeGate } from "@/components/AgeGate";
import { AIUsageDisclosure } from "@/components/AIUsageDisclosure";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Templates from "./pages/Templates";
import Settings from "./pages/Settings";
import Webhooks from "./pages/Webhooks";
import Billing from "./pages/Billing";
import APIKeys from "./pages/APIKeys";
import APIDocs from "./pages/APIDocs";
import CLITool from "./pages/CLITool";
import Analytics from "./pages/Analytics";
import Versions from "./pages/Versions";
import Pricing from "./pages/Pricing";
import Enterprise from "./pages/Enterprise";
import Schedules from "./pages/Schedules";
import Legal from "./pages/Legal";
import Privacy from "./pages/Privacy";
import WhiteLabel from "./pages/WhiteLabel";
import Marketplace from "./pages/Marketplace";
import TransactionUsage from "./pages/TransactionUsage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SubscriptionProvider>
      <PrivacyProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AgeGate />
          <ConsentDialog />
          <AIUsageDisclosure />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
              <Route path="/webhooks" element={<ProtectedRoute><Webhooks /></ProtectedRoute>} />
              <Route path="/api-keys" element={<ProtectedRoute><APIKeys /></ProtectedRoute>} />
              <Route path="/api-docs" element={<ProtectedRoute><APIDocs /></ProtectedRoute>} />
              <Route path="/cli" element={<ProtectedRoute><CLITool /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/versions" element={<ProtectedRoute><Versions /></ProtectedRoute>} />
              <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/privacy" element={<ProtectedRoute><Privacy /></ProtectedRoute>} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/schedules" element={<ProtectedRoute><Schedules /></ProtectedRoute>} />
              <Route path="/enterprise" element={<ProtectedRoute><Enterprise /></ProtectedRoute>} />
              <Route path="/white-label" element={<ProtectedRoute><WhiteLabel /></ProtectedRoute>} />
              <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
              <Route path="/transaction-usage" element={<ProtectedRoute><TransactionUsage /></ProtectedRoute>} />
              <Route path="/legal" element={<Legal />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </PrivacyProvider>
    </SubscriptionProvider>
  </QueryClientProvider>
);

export default App;
