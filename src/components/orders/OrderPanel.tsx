import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/useToast';
import { ShoppingBag, ChevronRight, Users, Smartphone, Printer, FileText, Clock, CheckCircle, AlertCircle, FileCheck, Table, Receipt, User, Phone, CalendarClock, CreditCard, DollarSign, Wallet, CreditCard as CreditCardIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateOrderStatus, updatePaymentStatus, type UpdateOrderStatusRequest, type UpdatePaymentRequest } from '@/lib/api';

interface OrderItem {
  name: string;
  price: number;
  qty: number;
  notes?: string;
}

interface Order {
  id: string;
  table: string;
  items: OrderItem[];
  status: string;
  time: string;
  total?: number;
  specialInstructions?: string;
  isCustomerOrder?: boolean;
  paymentStatus?: 'unpaid' | 'paid';
  paymentMethod?: 'cash' | 'card' | 'online';
  paymentTime?: string;
}

interface OrderPanelProps {
  orders?: Order[];
}

interface OrderHistoryItem {
  timestamp: string;
  action: string;
  user: string;
}

const OrderPanel: React.FC<OrderPanelProps> = ({ orders = [] }) => {
  const queryClient = useQueryClient();
  const [newOrderDialogOpen, setNewOrderDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState('');
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [confirmActionDialog, setConfirmActionDialog] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Mutations for updating order status and payment
  const updateStatusMutation = useMutation({
    mutationFn: updateOrderStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: updatePaymentStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
  
  // Use only the passed orders (no mock data)
  const allOrders = orders;

  const calculateTotal = (items: OrderItem[]) => {
    return items.reduce((sum, item) => sum + (item.price * item.qty), 0).toFixed(2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress':
      case 'pending':
        return 'text-restaurant-warning';
      case 'ready':
        return 'text-restaurant-success';
      case 'served':
      case 'completed':
        return 'text-gray-500';
      default:
        return '';
    }
  };
  
  const handleNewOrder = () => {
    if (!selectedTable) {
      toast({ 
        title: "Table required",
        description: "Please select a table for the new order."
      });
      return;
    }
    
    // Redirect to the Menu page with the selected table
    window.location.href = `/menu?table=${selectedTable}`;
    setNewOrderDialogOpen(false);
  };
  
  // Generate mock order history
  const generateOrderHistory = (order: Order): OrderHistoryItem[] => {
    const baseTime = new Date();
    const history: OrderHistoryItem[] = [
      {
        timestamp: format(new Date(baseTime.getTime() - 30 * 60000), 'MMM d, yyyy h:mm a'),
        action: 'Order created',
        user: 'Alfred Cepillo (Staff)'
      }
    ];
    
    if (order.status === 'ready' || order.status === 'served' || order.status === 'completed') {
      history.push({
        timestamp: format(new Date(baseTime.getTime() - 15 * 60000), 'MMM d, yyyy h:mm a'),
        action: 'Order marked as ready',
        user: 'Jane Smith (Chef)'
      });
    }
    
    if (order.status === 'served' || order.status === 'completed') {
      history.push({
        timestamp: format(new Date(baseTime.getTime() - 5 * 60000), 'MMM d, yyyy h:mm a'),
        action: order.isCustomerOrder ? 'Order marked as completed' : 'Order marked as served',
        user: 'Mike Johnson (Waiter)'
      });
    }
    
    return history;
  };
  
  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailsDialogOpen(true);
  };
  
  const handlePrintOrder = () => {
    if (!selectedOrder) return;
    // Print order to kitchen printer
  };
  
  const handlePrintReceipt = () => {
    if (!selectedOrder) return;
    // Print receipt
  };
  
  const handleExportPDF = () => {
    if (!selectedOrder) return;
    // Export order details as PDF
  };
  
  // Handle payment
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'card' | 'online'>('cash');
  
  const handleMarkPaid = (order: Order) => {
    setSelectedOrder(order);
    setSelectedPaymentMethod('cash'); // Default to cash
    setPaymentDialogOpen(true);
  };
  
  const confirmPayment = async () => {
    if (!selectedOrder) return;
    
    try {
      await updatePaymentMutation.mutateAsync({
        orderId: parseInt(selectedOrder.id),
        paymentStatus: 'paid',
        paymentMethod: selectedPaymentMethod,
        amount: selectedOrder.total || parseFloat(calculateTotal(selectedOrder.items))
      });
      
      // Update the selectedOrder for the details view if open
    const updatedOrder = {
      ...selectedOrder,
      paymentStatus: 'paid' as const,
      paymentMethod: selectedPaymentMethod,
      paymentTime: 'Just now'
    };
    setSelectedOrder(updatedOrder);
    
    // Close payment dialog
    setPaymentDialogOpen(false);
    
    // Payment processed successfully
    } catch (error) {
    toast({ 
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to process payment",
        variant: "destructive"
    });
    }
  };
  
  const handleStatusChangeClick = (order: Order, newStatus: string) => {
    // If we're in the details dialog, just set the pending status and show confirmation
    if (detailsDialogOpen) {
      setSelectedOrder(order);
      setPendingStatusChange(newStatus);
      setConfirmActionDialog(true);
    } else {
      // Otherwise, immediately change the status
      handleStatusChange(order, newStatus);
    }
  };
  
  const confirmStatusChange = () => {
    if (!selectedOrder || !pendingStatusChange) return;
    
    handleStatusChange(selectedOrder, pendingStatusChange);
    setConfirmActionDialog(false);
    // Close the details dialog if the status is now 'served' or 'completed'
    if (pendingStatusChange === 'served' || pendingStatusChange === 'completed') {
      setDetailsDialogOpen(false);
    } else {
      // Otherwise, update the selected order's status for the details view
      setSelectedOrder({...selectedOrder, status: pendingStatusChange});
    }
  };
  
  const handleStatusChange = async (order: Order, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({
        orderId: parseInt(order.id),
        status: newStatus as UpdateOrderStatusRequest['status']
      });
    
    // Status updated successfully
    } catch (error) {
    toast({ 
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update order status",
        variant: "destructive"
    });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Active Orders</h2>
        <Button 
          className="bg-restaurant-primary hover:bg-restaurant-primary/80"
          onClick={() => setNewOrderDialogOpen(true)}
        >
          <ShoppingBag className="w-4 h-4 mr-2" />
          New Order
        </Button>
      </div>

      {allOrders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 flex flex-col items-center justify-center text-center">
            <ShoppingBag className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-xl font-medium mb-2">No active orders</h3>
            <p className="text-gray-500 mb-4">Start by creating a new order from the menu</p>
            <Button 
              className="bg-restaurant-primary hover:bg-restaurant-primary/80"
              onClick={() => setNewOrderDialogOpen(true)}
            >
              Create Order
            </Button>
          </CardContent>
        </Card>
      ) : (
        allOrders.map((order) => (
          <Card 
            key={order.id} 
            className={`border-l-4 ${
              order.isCustomerOrder 
                ? "border-l-blue-500" 
                : "border-l-restaurant-primary"
            }`}
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <CardTitle className="text-lg font-semibold">{order.table}</CardTitle>
                  {order.isCustomerOrder && (
                    <Badge variant="outline" className="border-blue-400 text-blue-500">
                      <Smartphone className="h-3 w-3 mr-1" /> Customer Order
                    </Badge>
                  )}
                </div>
                <span className={`text-sm font-medium ${getStatusColor(order.status)}`}>
                  {order.status.replace('-', ' ')}
                </span>
              </div>
              <p className="text-sm text-gray-500">Ordered {order.time}</p>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <ul className="space-y-2 mb-4">
                {order.items.map((item, index) => (
                  <li key={index} className="flex justify-between">
                    <div>
                      <span className="font-medium">{item.qty}x {item.name}</span>
                      {item.notes && <p className="text-xs text-gray-500">Note: {item.notes}</p>}
                    </div>
                    <span>₱{(item.price * item.qty).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              
              {order.specialInstructions && (
                <div className="mb-4 bg-gray-100 p-2 rounded-md">
                  <p className="text-sm font-medium">Special Instructions:</p>
                  <p className="text-sm">{order.specialInstructions}</p>
                </div>
              )}
              
              <Separator className="my-2" />
              <div className="flex justify-between items-center font-semibold">
                <span>Total</span>
                <div className="flex items-center">
                  {order.paymentStatus === 'paid' && (
                    <Badge className="mr-2 bg-green-500" variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" /> Paid
                    </Badge>
                  )}
                  <span>₱{order.total ? order.total.toFixed(2) : calculateTotal(order.items)}</span>
                </div>
              </div>

              {/* Status action buttons */}
              <div className="mt-4 flex gap-2">
                {(order.status === 'in-progress' || order.status === 'pending') && (
                  <Button 
                    variant="outline" 
                    className="flex-1 bg-restaurant-success text-white hover:bg-restaurant-success/80"
                    onClick={() => handleStatusChangeClick(order, 'ready')}
                    disabled={updateStatusMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {updateStatusMutation.isPending ? 'Updating...' : 'Mark Ready'}
                  </Button>
                )}
                {order.status === 'ready' && (
                  <Button 
                    variant="outline" 
                    className="flex-1 bg-restaurant-primary text-white hover:bg-restaurant-primary/80"
                    onClick={() => handleStatusChangeClick(order, order.isCustomerOrder ? 'completed' : 'served')}
                    disabled={updateStatusMutation.isPending}
                  >
                    <FileCheck className="h-4 w-4 mr-2" />
                    {updateStatusMutation.isPending ? 'Updating...' : `Mark ${order.isCustomerOrder ? 'Completed' : 'Served'}`}
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => handleViewDetails(order)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </div>
              
              {/* Payment action button - separated as requested */}
              {order.paymentStatus !== 'paid' && (
                <div className="mt-2">
                  <Button 
                    variant="outline" 
                    className="w-full bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => handleMarkPaid(order)}
                    disabled={updatePaymentMutation.isPending}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {updatePaymentMutation.isPending ? 'Processing...' : 'Mark Paid'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
      
      {/* New Order Dialog */}
      <Dialog open={newOrderDialogOpen} onOpenChange={setNewOrderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium block mb-2">Select Table</label>
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a table" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => (
                    <SelectItem key={i+1} value={(i+1).toString()}>
                      Table {i+1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOrderDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-restaurant-primary hover:bg-restaurant-primary/80"
              onClick={handleNewOrder}
            >
              Continue to Menu
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Order Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedOrder && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-center">
                  <DialogTitle className="text-xl">Order Details</DialogTitle>
                  <Badge 
                    className={`
                      ${selectedOrder.status === 'in-progress' ? 'bg-yellow-500' : ''}
                      ${selectedOrder.status === 'ready' ? 'bg-green-500' : ''}
                      ${selectedOrder.status === 'served' || selectedOrder.status === 'completed' ? 'bg-gray-500' : ''}
                    `}
                  >
                    {selectedOrder.status.replace('-', ' ')}
                  </Badge>
                </div>
              </DialogHeader>
              
              <div className="grid grid-cols-3 gap-4 py-4">
                <Card>
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Receipt className="h-4 w-4 mr-2" />
                      Order ID
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <p className="font-semibold">{selectedOrder.id}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Table className="h-4 w-4 mr-2" />
                      Table
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <p className="font-semibold">{selectedOrder.table}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <p className="font-semibold">{selectedOrder.time}</p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Order Items</h3>
                  <Card>
                    <CardContent className="p-4">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left border-b">
                            <th className="pb-2">Item</th>
                            <th className="pb-2">Qty</th>
                            <th className="pb-2">Price</th>
                            <th className="pb-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.items.map((item, index) => (
                            <tr key={index} className="border-b last:border-0">
                              <td className="py-2">
                                <p className="font-medium">{item.name}</p>
                                {item.notes && <p className="text-xs text-gray-500">Note: {item.notes}</p>}
                              </td>
                              <td className="py-2">{item.qty}</td>
                              <td className="py-2">₱{item.price.toFixed(2)}</td>
                              <td className="py-2 text-right">₱{(item.qty * item.price).toFixed(2)}</td>
                            </tr>
                          ))}
                          <tr className="font-semibold">
                            <td colSpan={3} className="pt-2 text-right">Total:</td>
                            <td className="pt-2 text-right">₱{selectedOrder.total ? selectedOrder.total.toFixed(2) : calculateTotal(selectedOrder.items)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </div>
                
                {selectedOrder.specialInstructions && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Special Instructions</h3>
                    <Card>
                      <CardContent className="p-4">
                        <p>{selectedOrder.specialInstructions}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Order History</h3>
                  <Card>
                    <CardContent className="p-4">
                      <ul className="space-y-3">
                        {generateOrderHistory(selectedOrder).map((historyItem, index) => (
                          <li key={index} className="flex items-start">
                            <div className="h-2 w-2 mt-2 rounded-full bg-restaurant-primary mr-2"></div>
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{historyItem.action}</p>
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>{historyItem.user}</span>
                                <span>{historyItem.timestamp}</span>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <div className="flex gap-2 flex-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="outline" onClick={handlePrintOrder}>
                          <Printer className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Print Order</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="outline" onClick={handlePrintReceipt}>
                          <Receipt className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Print Receipt</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="outline" onClick={handleExportPDF}>
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Export as PDF</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                {(selectedOrder.status === 'in-progress' || selectedOrder.status === 'pending') && (
                  <Button 
                    className="bg-restaurant-success hover:bg-restaurant-success/80 text-white"
                    onClick={() => handleStatusChangeClick(selectedOrder, 'ready')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Ready
                  </Button>
                )}
                
                {selectedOrder.status === 'ready' && (
                  <Button 
                    className="bg-restaurant-primary hover:bg-restaurant-primary/80 text-white"
                    onClick={() => handleStatusChangeClick(selectedOrder, selectedOrder.isCustomerOrder ? 'completed' : 'served')}
                  >
                    <FileCheck className="h-4 w-4 mr-2" />
                    Mark as {selectedOrder.isCustomerOrder ? 'Completed' : 'Served'}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Dialog */}
      <Dialog open={confirmActionDialog} onOpenChange={setConfirmActionDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p>
              Are you sure you want to mark this order as 
              <span className="font-semibold"> {pendingStatusChange?.replace('-', ' ')}</span>?
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmActionDialog(false)}>Cancel</Button>
            <Button 
              className={`
                ${pendingStatusChange === 'ready' ? 'bg-restaurant-success hover:bg-restaurant-success/80' : ''}
                ${pendingStatusChange === 'served' || pendingStatusChange === 'completed' ? 'bg-restaurant-primary hover:bg-restaurant-primary/80' : ''}
                text-white
              `}
              onClick={confirmStatusChange}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div>
              <p className="text-lg font-semibold flex justify-between">
                <span>Total Amount:</span>
                <span>₱{selectedOrder?.total?.toFixed(2) || (selectedOrder ? calculateTotal(selectedOrder.items) : '0.00')}</span>
              </p>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant={selectedPaymentMethod === 'cash' ? 'default' : 'outline'}
                  className={selectedPaymentMethod === 'cash' ? 'bg-restaurant-primary' : ''}
                  onClick={() => setSelectedPaymentMethod('cash')}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Cash
                </Button>
                <Button 
                  variant={selectedPaymentMethod === 'card' ? 'default' : 'outline'}
                  className={selectedPaymentMethod === 'card' ? 'bg-restaurant-primary' : ''}
                  onClick={() => setSelectedPaymentMethod('card')}
                >
                  <CreditCardIcon className="h-4 w-4 mr-2" />
                  Card
                </Button>
                <Button 
                  variant={selectedPaymentMethod === 'online' ? 'default' : 'outline'}
                  className={selectedPaymentMethod === 'online' ? 'bg-restaurant-primary' : ''}
                  onClick={() => setSelectedPaymentMethod('online')}
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Online
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={confirmPayment}
              disabled={updatePaymentMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {updatePaymentMutation.isPending ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderPanel;
