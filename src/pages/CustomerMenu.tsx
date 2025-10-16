import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, ShoppingCart, Plus, Minus, Trash2, X, Check, Loader2, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/useToast';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getCustomerMenu, createCustomerOrder, type CartItem } from '@/lib/customerApi';
import PaymentModal from '@/components/menu/PaymentModal';
import WaiterVerification from '@/components/orders/WaiterVerification';

const CustomerMenu = () => {
  // State for UI
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [cashGiven, setCashGiven] = useState<number | null>(null);
  const [changeAmount, setChangeAmount] = useState<number | null>(null);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const { toast } = useToast();
  const location = useLocation();

  // Fetch menu data from API
  const { data: menuData, isLoading, error } = useQuery({
    queryKey: ['customer-menu'],
    queryFn: getCustomerMenu,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: createCustomerOrder,
    onSuccess: (data) => {
      setOrderNumber(data.orderId.toString());
      setOrderSuccess(true);
      setCheckoutDialogOpen(false);
      setCartItems([]);
      setSpecialInstructions('');
      setCashGiven(null);
      setChangeAmount(null);
    },
    onError: (error) => {
      toast({ 
        title: "Order failed", 
        description: error instanceof Error ? error.message : "Failed to create order. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Extract categories and items from the API response
  const categories = menuData?.categories || [];
  const menuItems = menuData?.items || [];
  
  useEffect(() => {
    // Set default category when data is loaded
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].name);
    }
    
    // Get table number from URL if available
    const params = new URLSearchParams(location.search);
    const table = params.get('table');
    if (table) {
      setTableNumber(table);
    }
  }, [categories, activeCategory, location]);

  const filteredMenuItems = searchQuery 
    ? menuItems.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.category.toLowerCase().includes(searchQuery.toLowerCase()))
    : menuItems.filter(item => item.category === activeCategory);

  const addToCart = (item: {item_id: number, name: string, price: number}) => {
    const existingItemIndex = cartItems.findIndex(cartItem => cartItem.id === item.item_id);
    
    if (existingItemIndex !== -1) {
      // Item already exists in cart, increase quantity
      const updatedCart = [...cartItems];
      updatedCart[existingItemIndex].quantity += 1;
      setCartItems(updatedCart);
    } else {
      // Add new item to cart
      setCartItems([...cartItems, { 
        id: item.item_id, 
        name: item.name, 
        price: item.price, 
        quantity: 1, 
        notes: '' 
      }]);
    }
    
    setCartOpen(true);
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
    
    // Show verification modal before proceeding with order
    setVerificationModalOpen(true);
  };

  const handleCheckout = () => {
    if (!tableNumber) {
      toast({ title: "Table required", description: "Please enter your table number." });
      return;
    }
    
    if (cartItems.length === 0) {
      toast({ title: "Empty order", description: "Please add items to your order." });
      return;
    }
    
    // Show payment modal to collect cash info
    setPaymentModalOpen(true);
  };
  
  const handleVerificationSuccess = () => {
    // Close verification modal
    setVerificationModalOpen(false);
    
    // Proceed with order placement
    processOrder();
  };
  
  const processOrder = () => {
    if (!tableNumber || cartItems.length === 0) return;
    
    const orderData = {
      tableNumber: `Table ${tableNumber}`,
      items: cartItems,
      specialInstructions,
      customerName
    };
    
    createOrderMutation.mutate(orderData);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="bg-black text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-restaurant-primary" />
          <h2 className="text-xl font-semibold mb-2">Loading Menu</h2>
          <p className="text-gray-400">Please wait while we load the menu...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-black text-white min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <X className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">Failed to Load Menu</h2>
          <p className="text-gray-400 mb-4">
            {error instanceof Error ? error.message : "An unknown error occurred. Please try again."}
          </p>
          <Button 
            className="bg-restaurant-primary hover:bg-restaurant-primary/80"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black text-white min-h-screen">
      <div className="sticky top-0 z-10 bg-black pt-4 pb-2 px-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-white">Emiliano Ristorante</h1>
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="bg-gray-800 relative">
                <ShoppingCart className="h-5 w-5" />
                {cartItems.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-restaurant-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItems.reduce((total, item) => total + item.quantity, 0)}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-gray-900 border-gray-800 text-white w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle className="text-white">Your Order</SheetTitle>
              </SheetHeader>

              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[50vh]">
                  <ShoppingCart className="h-12 w-12 text-gray-500 mb-2" />
                  <p className="text-gray-400">Your cart is empty</p>
                  <Button 
                    variant="outline" 
                    className="mt-4 border-gray-700 text-gray-400"
                    onClick={() => setCartOpen(false)}
                  >
                    Continue Browsing
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mt-4 flex-1 overflow-auto max-h-[calc(100vh-250px)]">
                    {cartItems.map((item) => (
                      <div key={item.id} className="bg-gray-800 rounded-lg p-3 relative">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium">{item.name}</h3>
                            <p className="text-sm text-gray-400">₱{item.price.toFixed(2)}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-6 w-6 p-0 border-gray-700"
                            onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-center w-8">{item.quantity}</span>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-6 w-6 p-0 border-gray-700"
                            onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          
                          <div className="ml-auto text-right">
                            <span className="font-bold">₱{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        </div>

                        <Input 
                          className="mt-2 bg-gray-900 border-gray-700 text-sm"
                          placeholder="Special instructions..."
                          value={item.notes}
                          onChange={(e) => updateItemNotes(item.id, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 space-y-4">
                    <Separator className="bg-gray-800" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-lg">Total</span>
                      <span className="text-xl font-bold">₱{calculateTotal().toFixed(2)}</span>
                    </div>
                    
                    <Input
                      className="bg-gray-800 border-gray-700"
                      placeholder="Enter your table number"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                    />
                    
                    <Button 
                      className="w-full bg-restaurant-primary hover:bg-restaurant-primary/80"
                      onClick={() => setCheckoutDialogOpen(true)}
                      disabled={!tableNumber || cartItems.length === 0}
                    >
                      <ShieldAlert className="w-4 h-4 mr-2" />
                      Checkout (Requires Verification)
                    </Button>
                  </div>
                </>
              )}
            </SheetContent>
          </Sheet>
        </div>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <Input 
            className="pl-9 pr-4 py-2 h-10 w-full bg-gray-800 border-gray-700 text-white" 
            placeholder="Search menu..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="mb-4 flex space-x-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <Button
              key={category.category_id}
              variant={activeCategory === category.name && !searchQuery ? "default" : "outline"}
              className={activeCategory === category.name && !searchQuery 
                ? "bg-restaurant-primary hover:bg-restaurant-primary/80" 
                : "border-gray-600 text-gray-300"}
              onClick={() => {
                setActiveCategory(category.name);
                setSearchQuery('');
              }}
            >
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMenuItems.length > 0 ? (
            filteredMenuItems.map((item) => (
              <Card 
                key={item.item_id} 
                className="bg-gray-800 border-gray-700 hover:border-restaurant-primary transition-colors"
              >
                <CardContent className="p-4">
                  <div className="h-20 bg-gray-700 rounded-md mb-3 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">Item Image</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-white">{item.name}</h3>
                      <Badge variant="outline" className="mt-1 text-xs border-gray-600 text-gray-300">
                        {item.category}
                      </Badge>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-semibold text-white mb-2">₱{item.price.toFixed(2)}</span>
                      <Button 
                        size="sm" 
                        className="bg-restaurant-primary hover:bg-restaurant-primary/80"
                        onClick={() => addToCart(item)}
                        disabled={!item.is_available}
                      >
                        {item.is_available ? "Add" : "Unavailable"}
                      </Button>
                    </div>
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-400 mt-2">{item.description}</p>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-gray-400">
              {searchQuery ? 'No items found matching your search.' : 'No items available in this category.'}
            </div>
          )}
        </div>
      </div>

      <footer className="mt-8 text-center p-4 text-sm text-gray-400 border-t border-gray-800">
        <p>Scan this QR code at your table to access our menu anytime</p>
        <p className="mt-2">{new Date().getFullYear()} Emiliano Ristorante. All rights reserved.</p>
      </footer>

      {/* Checkout Dialog */}
      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">Complete Your Order</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 my-4">
            <div>
              <label htmlFor="table-number" className="block text-sm font-medium mb-1">Table Number</label>
              <Input 
                id="table-number"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Enter table number"
                className="bg-gray-800 border-gray-700"
              />
            </div>

            <div>
              <label htmlFor="customer-name" className="block text-sm font-medium mb-1">Your Name (Optional)</label>
              <Input 
                id="customer-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter your name"
                className="bg-gray-800 border-gray-700"
              />
            </div>
            
            <div>
              <label htmlFor="special-instructions" className="block text-sm font-medium mb-1">Special Instructions (Optional)</label>
              <Textarea
                id="special-instructions"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Any allergies or special requests?"
                className="bg-gray-800 border-gray-700 min-h-24"
              />
            </div>
            
            <div className="border border-gray-700 rounded-md p-3">
              <h3 className="font-medium mb-2">Order Summary</h3>
              <div className="space-y-2">
                {cartItems.map(item => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.quantity}x {item.name}</span>
                    <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <Separator className="my-2 bg-gray-700" />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>₱{calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              className="border-gray-700 w-full sm:w-auto"
              onClick={() => setCheckoutDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="bg-restaurant-primary hover:bg-restaurant-primary/80"
              onClick={handleCheckout}
              disabled={!tableNumber || cartItems.length === 0 || createOrderMutation.isPending}
            >
              {createOrderMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
              ) : (
                <><ShieldAlert className="mr-2 h-4 w-4" /> Proceed to Verification</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Success Dialog */}
      <Dialog open={orderSuccess} onOpenChange={setOrderSuccess}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <div className="flex flex-col items-center justify-center py-6">
            <div className="rounded-full bg-green-600/20 p-3 mb-4">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">Order Placed Successfully!</h2>
            <p className="text-center text-gray-400 mb-4">
              Your order #{orderNumber} has been sent to the kitchen.
            </p>
            <p className="text-center font-medium mb-6">
              We'll bring your food to table {tableNumber} soon.
            </p>
            {cashGiven && changeAmount && (
              <div className="bg-gray-800 p-4 rounded-md w-full max-w-xs mb-6">
                <div className="flex justify-between mb-2">
                  <span>Cash Given:</span>
                  <span className="font-medium">₱{cashGiven.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Change:</span>
                  <span className="font-medium">₱{changeAmount.toFixed(2)}</span>
                </div>
              </div>
            )}
            <Button 
              className="bg-restaurant-primary hover:bg-restaurant-primary/80"
              onClick={() => setOrderSuccess(false)}
            >
              Continue Browsing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Payment Modal */}
      <PaymentModal 
        isOpen={paymentModalOpen} 
        onClose={() => setPaymentModalOpen(false)} 
        totalAmount={calculateTotal()}
        onConfirm={handlePaymentConfirm}
      />

      {/* Waiter Verification Modal */}
      <WaiterVerification
        isOpen={verificationModalOpen}
        onClose={() => setVerificationModalOpen(false)}
        onVerify={handleVerificationSuccess}
        isLoading={createOrderMutation.isPending}
      />
    </div>
  );
};

export default CustomerMenu; 