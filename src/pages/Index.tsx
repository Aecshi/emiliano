
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import DashboardStatsComponent from '@/components/dashboard/DashboardStats';
import TableGrid from '@/components/tables/TableGrid';
import OrderPanel from '@/components/orders/OrderPanel';
import MenuItems from '@/components/menu/MenuItems';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getOrders, type Order } from '@/lib/api';

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch orders from database for dashboard display
  const { data: ordersFromAPI = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: getOrders,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Transform API orders to format expected by OrderPanel (same as Orders page)
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

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="pos-container">
      <Header toggleSidebar={toggleSidebar} />

      <div className="pos-grid relative">
        <Sidebar isOpen={sidebarOpen} />

        <div className="pos-content">
          <DashboardStatsComponent />

          <Tabs defaultValue="tables" className="mt-6">
            <TabsList className="grid w-full grid-cols-3 bg-white shadow-sm">
              <TabsTrigger value="tables">Tables</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="menu">Menu</TabsTrigger>
            </TabsList>
            <TabsContent value="tables" className="mt-4">
              <TableGrid />
            </TabsContent>
            <TabsContent value="orders" className="mt-4">
              <OrderPanel orders={formattedOrders} />
            </TabsContent>
            <TabsContent value="menu" className="mt-4">
              <MenuItems />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Index;
