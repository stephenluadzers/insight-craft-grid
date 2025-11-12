/**
 * LEGAL DISCLAIMER COMPONENT
 * Displays copyright and compliance information for Shadow IDE and FlowMind
 */

export const LegalFooter = () => {
  return (
    <footer className="border-t border-border/40 bg-background/50 backdrop-blur-sm py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="text-center text-sm text-muted-foreground space-y-2">
          <p className="font-medium">
            © 2025 Remora Development LLC.
          </p>
          <p>
            Shadow IDE and FlowMind are compliant with all platform terms and intellectual property laws.
          </p>
          <p className="text-xs">
            This software performs metadata analysis only — no video content is downloaded or redistributed.
          </p>
        </div>
      </div>
    </footer>
  );
};
