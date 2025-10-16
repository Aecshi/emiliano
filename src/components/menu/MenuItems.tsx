import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Minus, ShoppingCart, Check, Edit, Search, CreditCard, DollarSign, Wallet, CreditCard as CreditCardIcon, CheckCircle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/useToast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMenuData, createOrder, type MenuCategory, type MenuItem, type CreateOrderRequest } from '@/lib/api';
import PaymentModal from './PaymentModal';

const MenuItems = () => {
  const queryClient = useQueryClient();
  
  // Fetch menu data from API
  const { data: menuData, isLoading, error } = useQuery({
    queryKey: ['menu-data'],
    queryFn: getMenuData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const categories = menuData?.categories || [];
  const menuItems = menuData?.items || [];

  // Order creation mutation
  const createOrderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      // Refresh dashboard and tables data after creating order
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });

  const [activeCategory, setActiveCategory] = useState<string>('');
  const [cartItems, setCartItems] = useState<Array<{id: number, name: string, price: number, quantity: number, notes: string}>>([]);
  const [showCartSidebar, setShowCartSidebar] = useState(false);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'online'>('cash');
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [cashGiven, setCashGiven] = useState<number | null>(null);
  const [changeAmount, setChangeAmount] = useState<number | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Get table number from URL if available and set default category
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const table = params.get('table');
    if (table) {
      setTableNumber(table);
      // Show the cart sidebar automatically
      setShowCartSidebar(true);
    }
    
    // Set default category when categories are loaded
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].name);
    }
  }, [location, categories, activeCategory]);
  
  const addToCart = (item: {id: number, name: string, price: number}) => {
    const existingItemIndex = cartItems.findIndex(cartItem => cartItem.id === item.id);
    
    if (existingItemIndex !== -1) {
      // Item already exists in cart, increase quantity
      const updatedCart = [...cartItems];
      updatedCart[existingItemIndex].quantity += 1;
      setCartItems(updatedCart);
    } else {
      // Add new item to cart
      setCartItems([...cartItems, { ...item, quantity: 1, notes: '' }]);
    }
    
    // Show the cart sidebar when adding items if it's not already shown
    if (!showCartSidebar) {
      setShowCartSidebar(true);
    }
  };
  
  const removeFromCart = (itemId: number) => {
    setCartItems(cartItems.filter(item => item.id !== itemId));
  };
  
  const updateItemQuantity = (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const updatedCart = cartItems.map(item => 
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    );
    
    setCartItems(updatedCart);
  };
  
  const updateItemNotes = (itemId: number, notes: string) => {
    const updatedCart = cartItems.map(item => 
      item.id === itemId ? { ...item, notes } : item
    );
    
    setCartItems(updatedCart);
  };
  
  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };
  
  const handlePaymentConfirm = (cashGiven: number, changeAmount: number) => {
    setCashGiven(cashGiven);
    setChangeAmount(changeAmount);
    setPaymentModalOpen(false);
    
    // Proceed with order placement
    processOrder(cashGiven, changeAmount);
  };
  
  const handleCheckout = async () => {
    if (!tableNumber) {
      toast({ title: "Table required", description: "Please select a table number." });
      return;
    }
    
    if (cartItems.length === 0) {
      toast({ title: "Empty order", description: "Please add items to your order." });
      return;
    }
    
    // If payment is to be processed now and method is cash, show payment modal
    if (showPaymentOptions && paymentMethod === 'cash') {
      setPaymentModalOpen(true);
      return;
    }
    
    // Otherwise proceed with order
    processOrder(null, null);
  };
  
  const processOrder = async (cashAmount: number | null = null, change: number | null = null) => {
    try {
      const orderData: CreateOrderRequest = {
        tableNumber: `Table ${tableNumber}`,
      items: cartItems.map(item => ({
          id: item.id,
        name: item.name,
        price: item.price,
          quantity: item.quantity,
        notes: item.notes || ''
      })),
      notes: orderNotes,
        paymentMethod: showPaymentOptions ? paymentMethod : 'cash',
        paymentStatus: showPaymentOptions ? 'paid' : 'unpaid'
      };
      
      // Add cash and change info if available
      if (cashAmount !== null && change !== null) {
        orderData.cashGiven = cashAmount;
        orderData.changeAmount = change;
      }
      
      const response = await createOrderMutation.mutateAsync(orderData);
    
    // Show success message
    toast({ 
      title: "Order placed successfully",
        description: `Order #${response.orderId} for Table ${tableNumber} has been created. Total: ₱${response.totalAmount.toFixed(2)}`
      });
      
      // If payment was processed with cash, show the change amount
      if (cashAmount !== null && change !== null) {
        toast({
          title: "Payment processed",
          description: `Cash received: ₱${cashAmount.toFixed(2)}, Change: ₱${change.toFixed(2)}`,
          variant: "success"
        });
      }
    
    // Reset cart and close checkout dialog
    setCartItems([]);
    setCheckoutDialogOpen(false);
    setOrderNotes('');
      setShowPaymentOptions(false);
      setCashGiven(null);
      setChangeAmount(null);
    
    // Navigate to orders page to see the order
    navigate('/orders');
      
    } catch (error) {
      toast({ 
        title: "Order failed",
        description: error instanceof Error ? error.message : "Failed to create order. Please try again.",
        variant: "destructive"
      });
    }
  };

  const filteredMenuItems = searchQuery 
    ? menuItems.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.category.toLowerCase().includes(searchQuery.toLowerCase()))
    : menuItems.filter(item => item.category === activeCategory);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-restaurant-primary mx-auto mb-2"></div>
          <p className="text-gray-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-600 mb-2">Failed to load menu</p>
          <p className="text-sm text-gray-500">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Menu Items</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <Input 
              className="pl-9 pr-4 py-2 h-10 w-[200px] md:w-[300px]" 
              placeholder="Search menu..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button 
            size="sm" 
            className="bg-restaurant-primary hover:bg-restaurant-primary/80"
            onClick={() => setShowCartSidebar(!showCartSidebar)}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Order</span> ({cartItems.reduce((sum, item) => sum + item.quantity, 0)})
          </Button>
        </div>
      </div>

      <div className="mb-4 flex space-x-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={activeCategory === category.name && !searchQuery ? "default" : "outline"}
            className={activeCategory === category.name && !searchQuery ? "bg-restaurant-primary hover:bg-restaurant-primary/80" : ""}
            onClick={() => {
              setActiveCategory(category.name);
              setSearchQuery('');
            }}
          >
            {category.name}
          </Button>
        ))}
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${showCartSidebar ? 'mr-0 md:mr-80' : ''}`}>
        {filteredMenuItems.length > 0 ? (
          filteredMenuItems.map((item) => (
            <Card 
              key={item.id} 
              className="cursor-pointer hover:border-restaurant-primary transition-colors"
            >
              <CardContent className="p-4">
                <div className="h-20 bg-gray-200 rounded-md mb-3 flex items-center justify-center">
                  <span className="text-gray-500 text-sm">Item Image</span>
                </div>
                <h3 className="font-medium">{item.name}</h3>
                {item.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                )}
                <div className="flex justify-between items-center mt-2">
                  <span className="font-semibold">₱{item.price.toFixed(2)}</span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 w-8 p-0 rounded-full bg-restaurant-primary text-white hover:bg-restaurant-primary/80"
                    onClick={() => addToCart(item)}
                    disabled={!item.isAvailable}
                  >
                    {item.isAvailable ? (
                    <Plus className="h-4 w-4" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {!item.isAvailable && (
                  <Badge variant="secondary" className="mt-2 bg-gray-200 text-gray-600">
                    Unavailable
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center p-8 border rounded-md">
            <p className="text-gray-500 mb-2">No items found matching "{searchQuery}"</p>
            <Button variant="outline" onClick={() => setSearchQuery('')}>
              Clear Search
            </Button>
          </div>
        )}
      </div>
      
      {/* Order Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-full md:w-80 bg-white border-l border-gray-200 shadow-lg transform transition-transform z-40 ${showCartSidebar ? 'translate-x-0' : 'translate-x-full'} pt-16`}>
        <div className="p-4 h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Current Order</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowCartSidebar(false)}>
              &times;
            </Button>
          </div>
          
          {tableNumber && (
            <div className="mb-4 p-2 bg-blue-50 rounded border border-blue-100 flex justify-between items-center">
              <span className="text-sm font-medium">Table {tableNumber}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                onClick={() => setTableNumber('')}
              >
                <Edit className="h-3 w-3" />
              </Button>
            </div>
          )}
          
          {cartItems.length === 0 ? (
            <div className="flex-grow flex items-center justify-center">
              <p className="text-gray-500 text-center">Your order is empty.<br />Add items from the menu.</p>
            </div>
          ) : (
            <div className="flex-grow overflow-auto">
              <ul className="space-y-3">
                {cartItems.map((item) => (
                  <li key={item.id} className="border-b border-gray-100 pb-3">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{item.name}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeFromCart(item.id)} className="h-6 w-6 p-0 text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center border rounded-md">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0"
                          onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0"
                          onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center mt-1">
                      <Input 
                        placeholder="Add note" 
                        className="text-xs h-6" 
                        value={item.notes}
                        onChange={(e) => updateItemNotes(item.id, e.target.value)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="pt-4 border-t mt-auto">
            <div className="flex justify-between mb-2">
              <span>Subtotal</span>
              <span>₱{calculateTotal().toFixed(2)}</span>
            </div>
            <Button 
              className="w-full bg-restaurant-primary hover:bg-restaurant-primary/80"
              disabled={cartItems.length === 0}
              onClick={() => setCheckoutDialogOpen(true)}
            >
              Checkout
            </Button>
          </div>
        </div>
      </div>
      
      {/* Checkout Dialog */}
      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Your Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!tableNumber && (
              <div className="space-y-2">
                <Label>Select Table</Label>
                <Select value={tableNumber} onValueChange={setTableNumber}>
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
            )}
            
            <div>
              <Label>Order Items</Label>
              <div className="border rounded-md p-3 mt-1 max-h-48 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between py-1">
                    <span>{item.quantity}x {item.name}</span>
                    <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                {cartItems.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No items in order</p>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>₱{calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea 
                placeholder="Add any special instructions for the kitchen" 
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="payment-toggle" 
                  checked={showPaymentOptions}
                  onChange={(e) => setShowPaymentOptions(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="payment-toggle" className="cursor-pointer text-sm font-medium">
                  Process payment now
                </Label>
              </div>
              
              {showPaymentOptions && (
                <div className="pt-2 space-y-2 border-t">
                  <Label>Payment Method</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      type="button"
                      variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                      className={paymentMethod === 'cash' ? 'bg-restaurant-primary' : ''}
                      onClick={() => setPaymentMethod('cash')}
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Cash
                    </Button>
                    <Button 
                      type="button"
                      variant={paymentMethod === 'card' ? 'default' : 'outline'}
                      className={paymentMethod === 'card' ? 'bg-restaurant-primary' : ''}
                      onClick={() => setPaymentMethod('card')}
                    >
                      <CreditCardIcon className="h-4 w-4 mr-2" />
                      Card
                    </Button>
                    <Button 
                      type="button"
                      variant={paymentMethod === 'online' ? 'default' : 'outline'}
                      className={paymentMethod === 'online' ? 'bg-restaurant-primary' : ''}
                      onClick={() => setPaymentMethod('online')}
                    >
                      <Wallet className="h-4 w-4 mr-2" />
                      Online
                    </Button>
                  </div>
                  
                  <div className="p-3 bg-green-50 border border-green-100 rounded-md">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm font-medium text-green-800">Payment will be processed immediately</span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      Order will be marked as paid via {paymentMethod}
                      {paymentMethod === 'cash' && " (You'll enter cash amount in the next step)"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCheckout} 
              className={showPaymentOptions ? "bg-blue-600 hover:bg-blue-700" : "bg-restaurant-primary hover:bg-restaurant-primary/80"}
              disabled={createOrderMutation.isPending}
            >
              {createOrderMutation.isPending ? (
                "Creating Order..."
              ) : showPaymentOptions ? (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay & Place Order
                </>
              ) : (
                "Place Order"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Payment Modal for Cash Input */}
      <PaymentModal 
        isOpen={paymentModalOpen} 
        onClose={() => setPaymentModalOpen(false)} 
        totalAmount={calculateTotal()} 
        onConfirm={handlePaymentConfirm}
      />
    </div>
  );
};

export default MenuItems;
