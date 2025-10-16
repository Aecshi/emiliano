import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DollarSign } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onConfirm: (cashGiven: number, changeAmount: number) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, totalAmount, onConfirm }) => {
  const [cashGiven, setCashGiven] = useState<string>('');
  const [changeAmount, setChangeAmount] = useState<number>(0);
  const [isValid, setIsValid] = useState<boolean>(false);

  // Predefined cash amounts for quick selection
  const suggestedAmounts = [
    totalAmount, // Exact amount
    Math.ceil(totalAmount / 100) * 100, // Nearest hundred above
    totalAmount + 100, // 100 more
    totalAmount + 500, // 500 more
    1000, // 1000 pesos
  ].filter((amount, index, self) => self.indexOf(amount) === index) // Remove duplicates
   .sort((a, b) => a - b); // Sort ascending

  // Calculate change whenever cash given changes
  useEffect(() => {
    const cashValue = parseFloat(cashGiven);
    if (!isNaN(cashValue) && cashValue >= totalAmount) {
      const change = cashValue - totalAmount;
      setChangeAmount(change);
      setIsValid(true);
    } else {
      setChangeAmount(0);
      setIsValid(false);
    }
  }, [cashGiven, totalAmount]);

  const handleConfirm = () => {
    const cashValue = parseFloat(cashGiven);
    onConfirm(cashValue, changeAmount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enter Payment Details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Total Amount:</span>
            <span className="font-bold text-lg">₱{totalAmount.toFixed(2)}</span>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Quick Amount Selection</label>
            <div className="flex flex-wrap gap-2">
              {suggestedAmounts.map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCashGiven(amount.toString())}
                >
                  ₱{amount}
                </Button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Cash Given</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                className="pl-9"
                type="number"
                min={totalAmount}
                step="0.01"
                value={cashGiven}
                onChange={(e) => setCashGiven(e.target.value)}
                placeholder="Enter cash amount"
              />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <div className="flex items-center justify-between">
              <span className="font-medium">Change:</span>
              <span className={`font-bold text-lg ${isValid ? 'text-green-600' : 'text-red-500'}`}>
                {isValid ? `₱${changeAmount.toFixed(2)}` : '---'}
              </span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!isValid}
            className={isValid ? "bg-restaurant-primary hover:bg-restaurant-primary/90" : ""}
          >
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal; 