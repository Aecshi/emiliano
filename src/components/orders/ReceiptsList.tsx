import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, Printer, Info, X, Clock, CreditCard, Receipt, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useQuery } from '@tanstack/react-query';
import { getReceipts, getReceiptById, Receipt as ReceiptType } from '@/lib/api';
import { format } from 'date-fns';

const ReceiptsList = () => {
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptType | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const printReceiptRef = useRef(null);
  const { toast } = useToast();
  
  // Fetch receipts with React Query
  const {
    data: receipts,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['receipts'],
    queryFn: () => getReceipts({ limit: 50 }),
    staleTime: 60000 // 1 minute
  });
  
  // Filtered receipts based on search term
  const filteredReceipts = React.useMemo(() => {
    if (!receipts) return [];
    
    if (!searchTerm) return receipts;
    
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return receipts.filter(
      receipt => 
        receipt.receipt_number.toLowerCase().includes(lowerCaseSearchTerm) ||
        receipt.table_number.toLowerCase().includes(lowerCaseSearchTerm) ||
        (receipt.customer_name && receipt.customer_name.toLowerCase().includes(lowerCaseSearchTerm))
    );
  }, [receipts, searchTerm]);
  
  // Handle search input with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIsSearching(true);
    setSearchTerm(value);
    
    // Debounce the search to avoid unnecessary rerenders
    const timer = setTimeout(() => {
      setIsSearching(false);
    }, 300);
    
    return () => clearTimeout(timer);
  };

  // Function to handle printing a receipt
  const handlePrint = (receipt: ReceiptType) => {
    setSelectedReceipt(receipt);
    setTimeout(() => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({
          title: "Error",
          description: "Could not open print window. Please check your popup blocker settings.",
          variant: "destructive"
        });
        return;
      }
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt #${receipt.receipt_number}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
              body {
                font-family: 'Inter', sans-serif;
                margin: 0;
                padding: 0;
                background: white;
                width: 80mm;
                margin: 0 auto;
              }
              .receipt {
                padding: 10px 5px;
              }
              .receipt-header {
                text-align: center;
                margin-bottom: 15px;
              }
              .restaurant-name {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 3px;
              }
              .receipt-title {
                font-size: 14px;
                margin-bottom: 10px;
              }
              .receipt-id {
                font-size: 12px;
                margin-bottom: 5px;
              }
              .receipt-info {
                font-size: 12px;
                margin-bottom: 10px;
              }
              .divider {
                border-top: 1px dashed #ccc;
                margin: 10px 0;
              }
              .items-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
              }
              .items-table th {
                text-align: left;
                padding: 3px 0;
              }
              .items-table td {
                padding: 3px 0;
              }
              .price {
                text-align: right;
              }
              .total-row {
                font-weight: bold;
              }
              .receipt-footer {
                text-align: center;
                font-size: 10px;
                margin-top: 20px;
              }
              .contact-info {
                font-size: 10px;
                text-align: center;
                margin-top: 5px;
              }
              @media print {
                body {
                  width: 80mm;
                  margin: 0;
                }
              }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="receipt-header">
                <div class="restaurant-name">Emiliano Restaurant</div>
                <div class="receipt-title">Official Receipt</div>
                <div class="receipt-id">Receipt #${receipt.receipt_number}</div>
                <div class="receipt-info">
                  ${receipt.date} | ${receipt.time}<br>
                  ${receipt.table_number}
                </div>
              </div>
              
              <div class="divider"></div>
              
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th class="price">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${receipt.items.map(item => `
                    <tr>
                      <td>${item.quantity}x ${item.name}</td>
                      <td class="price">₱${(item.unit_price * item.quantity).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                  
                  <tr><td colspan="2"><div class="divider"></div></td></tr>
                  
                  <tr>
                    <td>Subtotal</td>
                    <td class="price">₱${receipt.subtotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>VAT (12%)</td>
                    <td class="price">₱${receipt.tax_amount.toFixed(2)}</td>
                  </tr>
                  ${receipt.discount_amount > 0 ? `
                  <tr>
                    <td>Discount</td>
                    <td class="price">-₱${receipt.discount_amount.toFixed(2)}</td>
                  </tr>
                  ` : ''}
                  <tr class="total-row">
                    <td>Total</td>
                    <td class="price">₱${receipt.total_amount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>Payment Method</td>
                    <td class="price">${receipt.payment_method}</td>
                  </tr>
                  ${receipt.cash_given ? `
                  <tr>
                    <td>Cash</td>
                    <td class="price">₱${receipt.cash_given.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>Change</td>
                    <td class="price">₱${(receipt.change_amount || 0).toFixed(2)}</td>
                  </tr>
                  ` : ''}
                </tbody>
              </table>
              
              <div class="divider"></div>
              
              <div class="receipt-footer">
                Thank you for dining with us!
              </div>
              <div class="contact-info">
                www.emilianorestaurant.com | (02) 123-4567
              </div>
            </div>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      
      toast({
        title: "Receipt Printing",
        description: `Receipt #${receipt.receipt_number} sent to printer.`,
      });
    }, 100);
  };

  // Function to handle viewing receipt details
  const handleViewDetails = (receipt: ReceiptType) => {
    setSelectedReceipt(receipt);
    setDetailsOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-restaurant-primary" />
        <span className="ml-2 text-lg">Loading receipts...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="text-red-500 mb-4">Failed to load receipts</div>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  if (receipts && receipts.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="text-lg mb-4">No receipts found</div>
        <p className="text-gray-500">Receipts will appear here after orders are completed and paid.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Receipt History</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text"
              placeholder="Search receipts..."
              className="pl-9 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-restaurant-primary focus:border-transparent"
              value={searchTerm}
              onChange={handleSearchChange}
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 animate-spin" size={16} />
            )}
          </div>
        </div>

        {filteredReceipts.map((receipt) => (
          <Card key={receipt.receipt_id} className="overflow-hidden border-l-4 border-l-restaurant-primary">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold">Receipt #{receipt.receipt_number}</CardTitle>
                <span className="text-sm font-medium bg-restaurant-success/10 text-restaurant-success py-1 px-2 rounded-full">
                  Completed
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>{receipt.table_number}</span>
                <span>{receipt.date} | {receipt.time}</span>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Items</span>
                  <span className="font-medium">Amount</span>
                </div>
                <Separator />
                {receipt.items.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.quantity}x {item.name}</span>
                    <span>₱{(item.unit_price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                {receipt.items.length > 3 && (
                  <div className="text-sm text-gray-500 text-center">
                    + {receipt.items.length - 3} more items
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>₱{receipt.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Payment Method</span>
                  <span>{receipt.payment_method}</span>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => handlePrint(receipt)}
                >
                  <Printer className="h-4 w-4 mr-2" /> Print
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => handleViewDetails(receipt)}
                >
                  <Info className="h-4 w-4 mr-2" /> View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedReceipt && (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl flex items-center">
                  <Receipt className="h-5 w-5 mr-2 text-restaurant-primary" />
                  Receipt #{selectedReceipt.receipt_number}
                </DialogTitle>
                <span className="text-sm font-medium bg-restaurant-success/10 text-restaurant-success py-1 px-2 rounded-full">
                  Completed
                </span>
              </div>
              <DialogDescription className="flex justify-between pt-2">
                <div className="flex items-center text-sm">
                  <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                  {selectedReceipt.date} | {selectedReceipt.time}
                </div>
                <div className="flex items-center text-sm">
                  <CreditCard className="h-4 w-4 mr-1 text-muted-foreground" />
                  {selectedReceipt.payment_method}
                </div>
              </DialogDescription>
            </DialogHeader>
            
            <div className="bg-muted/30 p-4 rounded-md">
              <h3 className="font-medium mb-2">{selectedReceipt.table_number}</h3>
              
              <div className="space-y-3">
                <div className="grid grid-cols-4 text-sm font-medium">
                  <div className="col-span-2">Item</div>
                  <div className="text-right">Qty</div>
                  <div className="text-right">Price</div>
                </div>
                
                <Separator />
                
                <ScrollArea className="h-48 pr-4">
                  <div className="space-y-2">
                {selectedReceipt.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-4 text-sm">
                    <div className="col-span-2">{item.name}</div>
                        <div className="text-right">{item.quantity}x</div>
                        <div className="text-right">₱{(item.unit_price * item.quantity).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                <Separator />
                
                <div className="grid grid-cols-4 text-sm">
                  <div className="col-span-3 text-right font-medium">Subtotal:</div>
                  <div className="text-right">₱{selectedReceipt.subtotal.toFixed(2)}</div>
                </div>
                
                <div className="grid grid-cols-4 text-sm">
                  <div className="col-span-3 text-right font-medium">Tax (12%):</div>
                  <div className="text-right">₱{selectedReceipt.tax_amount.toFixed(2)}</div>
                </div>
                
                {selectedReceipt.discount_amount > 0 && (
                  <div className="grid grid-cols-4 text-sm">
                    <div className="col-span-3 text-right font-medium">Discount:</div>
                    <div className="text-right">-₱{selectedReceipt.discount_amount.toFixed(2)}</div>
                  </div>
                )}
                
                <div className="grid grid-cols-4 text-base font-bold">
                  <div className="col-span-3 text-right">Total:</div>
                  <div className="text-right">₱{selectedReceipt.total_amount.toFixed(2)}</div>
                </div>

                {selectedReceipt.cash_given && (
                  <>
                    <div className="grid grid-cols-4 text-sm">
                      <div className="col-span-3 text-right font-medium">Cash:</div>
                      <div className="text-right">₱{selectedReceipt.cash_given.toFixed(2)}</div>
                    </div>
                    <div className="grid grid-cols-4 text-sm">
                      <div className="col-span-3 text-right font-medium">Change:</div>
                      <div className="text-right">₱{(selectedReceipt.change_amount || 0).toFixed(2)}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="mt-2 text-xs text-muted-foreground">
              <p>Receipt generated by Emiliano Restaurant POS System</p>
              <p>For questions or concerns, please contact management.</p>
            </div>
            
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                <X className="h-4 w-4 mr-2" /> Close
              </Button>
              <Button onClick={() => handlePrint(selectedReceipt)}>
                <Printer className="h-4 w-4 mr-2" /> Print Receipt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Hidden div for printing */}
      <div ref={printReceiptRef} style={{ display: 'none' }}></div>
    </>
  );
};

export default ReceiptsList;
