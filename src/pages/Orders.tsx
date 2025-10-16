import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import OrderPanel from '@/components/orders/OrderPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getOrders, getOrdersByTable, type Order } from '@/lib/api';
import { useLocation } from 'react-router-dom';

const Orders = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const [tableFilter, setTableFilter] = useState<number | null>(null);
  const [pageTitle, setPageTitle] = useState("Orders");
  
  // Extract table ID from URL if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tableId = params.get('table');
    
    if (tableId) {
      const tableIdNum = parseInt(tableId);
      setTableFilter(tableIdNum);
      setPageTitle(`Orders for Table ${tableId}`);
    } else {
      setTableFilter(null);
      setPageTitle("Orders");
    }
  }, [location]);

  // Fetch orders from database API
  const { data: ordersFromAPI = [], isLoading, error } = useQuery({
    queryKey: ['orders', tableFilter],
    queryFn: () => tableFilter ? getOrdersByTable(tableFilter) : getOrders(),
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
    staleTime: 1000, // Consider data stale after 1 second
  });

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Transform API orders to format expected by OrderPanel
  const formatOrderForPanel = (order: Order) => {
    const timeAgo = new Date().getTime() - new Date(order.created_at).getTime();
    const minutes = Math.floor(timeAgo / 60000);
    const timeDisplay = minutes < 1 ? 'Just now' : `${minutes}m ago`;

    return {
      id: order.order_id.toString(),
      table: order.table_number,
    items: order.items.map(item => ({
      name: item.name,
        price: item.unit_price,
      qty: item.quantity,
        notes: item.notes || ''
      })),
      status: order.status,
      time: timeDisplay,
      total: order.total_amount,
      notes: order.notes,
      paymentStatus: order.payment_status,
      isCustomerOrder: false
    };
  };

  const formattedOrders = ordersFromAPI.map(formatOrderForPanel);

  // Separate orders by status
  const pendingOrders = formattedOrders.filter(order => order.status === 'pending');
  const inProgressOrders = formattedOrders.filter(order => order.status === 'in_progress');
  const readyOrders = formattedOrders.filter(order => order.status === 'ready');

  if (isLoading) {
    return (
      <div className="pos-container">
        <Header toggleSidebar={toggleSidebar} />
        <div className="pos-grid relative">
          <Sidebar isOpen={sidebarOpen} />
          <div className="pos-content">
            <h1 className="text-2xl font-bold mb-6">{pageTitle}</h1>
            <div className="flex items-center justify-center p-8">
              <div className="text-lg">Loading orders...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pos-container">
        <Header toggleSidebar={toggleSidebar} />
        <div className="pos-grid relative">
          <Sidebar isOpen={sidebarOpen} />
          <div className="pos-content">
            <h1 className="text-2xl font-bold mb-6">{pageTitle}</h1>
            <div className="flex items-center justify-center p-8">
              <div className="text-lg text-red-500">
                Failed to load orders. Please check your connection.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pos-container">
      <Header toggleSidebar={toggleSidebar} />

      <div className="pos-grid relative">
        <Sidebar isOpen={sidebarOpen} />

        <div className="pos-content">
          <h1 className="text-2xl font-bold mb-6">{pageTitle}</h1>

          <Tabs defaultValue="all">
            <TabsList className="mb-6">
              <TabsTrigger value="all" className="relative">
                All Orders
                {formattedOrders.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-restaurant-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {formattedOrders.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="pending" className="relative">
                Pending
                {pendingOrders.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {pendingOrders.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="in-progress" className="relative">
                In Progress  
                {inProgressOrders.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {inProgressOrders.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="ready" className="relative">
                Ready
                {readyOrders.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {readyOrders.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              <OrderPanel orders={formattedOrders} />
            </TabsContent>
            
            <TabsContent value="pending">
              <OrderPanel orders={pendingOrders} />
            </TabsContent>
            
            <TabsContent value="in-progress">
              <OrderPanel orders={inProgressOrders} />
            </TabsContent>
            
            <TabsContent value="ready">
              <OrderPanel orders={readyOrders} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Orders; 