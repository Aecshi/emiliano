import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// This is a secret verification code that only staff would know
// In a production environment, this should be managed through the backend
const VERIFICATION_CODES = ['1234', '5678', '0000']; // Multiple codes for different staff members

interface WaiterVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: () => void;
  isLoading?: boolean;
}

const WaiterVerification: React.FC<WaiterVerificationProps> = ({ 
  isOpen, 
  onClose, 
  onVerify,
  isLoading = false
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  
  const handleVerify = () => {
    if (VERIFICATION_CODES.includes(verificationCode)) {
      setError(null);
      setVerificationCode('');
      setAttempts(0);
      onVerify();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setError(`Invalid verification code. Please try again. (Attempt ${newAttempts}/3)`);
      
      // After 3 failed attempts, close the dialog
      if (newAttempts >= 3) {
        setTimeout(() => {
          setError(null);
          setVerificationCode('');
          setAttempts(0);
          onClose();
        }, 2000);
      }
    }
  };
  
  const handleClose = () => {
    setError(null);
    setVerificationCode('');
    setAttempts(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Lock className="mr-2 h-5 w-5" />
            Staff Verification Required
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <p className="text-sm text-gray-500">
            To prevent unauthorized orders, please ask a staff member to enter the verification code.
          </p>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1">Verification Code</label>
            <Input
              type="password"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter staff verification code"
              disabled={isLoading}
              maxLength={4}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleVerify} 
            disabled={!verificationCode || isLoading}
            className="bg-restaurant-primary hover:bg-restaurant-primary/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WaiterVerification;
