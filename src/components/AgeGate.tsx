import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { Calendar, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function AgeGate() {
  const { showAgeGate, setAgeVerified } = usePrivacy();
  const [birthYear, setBirthYear] = useState('');
  const [error, setError] = useState('');

  const handleVerify = () => {
    const year = parseInt(birthYear, 10);
    const currentYear = new Date().getFullYear();

    if (isNaN(year) || year < 1900 || year > currentYear) {
      setError('Please enter a valid birth year');
      return;
    }

    const age = currentYear - year;

    if (age < 13) {
      setError('You must be at least 13 years old to use FlowFuse');
      return;
    }

    if (age < 18) {
      setError('Users under 18 require parental consent. Please contact support@remora.dev');
      return;
    }

    setAgeVerified(true);
  };

  return (
    <Dialog open={showAgeGate} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Age Verification Required
          </DialogTitle>
          <DialogDescription>
            FlowFuse is intended for users 13 years and older. Please verify your age to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="birthYear">Birth Year</Label>
            <Input
              id="birthYear"
              type="number"
              placeholder="YYYY"
              value={birthYear}
              onChange={(e) => {
                setBirthYear(e.target.value);
                setError('');
              }}
              min="1900"
              max={new Date().getFullYear()}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Alert>
            <AlertDescription className="text-xs">
              <strong>Privacy Notice:</strong> We only use your birth year to verify age eligibility. This
              information is stored locally and not shared with third parties. Users aged 13-17 require parental
              consent.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button onClick={handleVerify} className="w-full">
            Verify Age
          </Button>
        </DialogFooter>

        <p className="text-xs text-muted-foreground text-center">
          By verifying your age, you confirm that the information provided is accurate.
          <br />
          For questions, contact: privacy@remora.dev
        </p>
      </DialogContent>
    </Dialog>
  );
}
