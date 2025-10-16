
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, DollarSign, ShoppingCart, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats, type DashboardStats } from '@/lib/api';

const DashboardStatsComponent = () => {
  const { data: dashboardData, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fallback data while loading or if there's an error
  const defaultStats = [
    {
      title: 'Today\'s Sales',
      value: '₱0.00',
      icon: <DollarSign className="h-8 w-8 text-restaurant-primary" />,
      change: '+0%',
      isPositive: true
    },
    {
      title: 'Active Tables',
      value: '0/0',
      icon: <Calendar className="h-8 w-8 text-restaurant-primary" />,
      change: '0 available',
      isPositive: true
    },
    {
      title: 'Open Orders',
      value: '0',
      icon: <ShoppingCart className="h-8 w-8 text-restaurant-primary" />,
      change: '0 pending',
      isPositive: true
    },
    {
      title: 'Customers Today',
      value: '0',
      icon: <Users className="h-8 w-8 text-restaurant-primary" />,
      change: '+0%',
      isPositive: true
    }
  ];

  const stats = dashboardData ? [
    {
      title: 'Today\'s Sales',
      value: dashboardData.todaysSales.value,
      icon: <DollarSign className="h-8 w-8 text-restaurant-primary" />,
      change: dashboardData.todaysSales.change,
      isPositive: dashboardData.todaysSales.isPositive
    },
    {
      title: 'Active Tables',
      value: dashboardData.activeTables.value,
      icon: <Calendar className="h-8 w-8 text-restaurant-primary" />,
      change: dashboardData.activeTables.change,
      isPositive: dashboardData.activeTables.isPositive
    },
    {
      title: 'Open Orders',
      value: dashboardData.openOrders.value.toString(),
      icon: <ShoppingCart className="h-8 w-8 text-restaurant-primary" />,
      change: dashboardData.openOrders.change,
      isPositive: dashboardData.openOrders.isPositive
    },
    {
      title: 'Customers Today',
      value: dashboardData.customersToday.value.toString(),
      icon: <Users className="h-8 w-8 text-restaurant-primary" />,
      change: dashboardData.customersToday.change,
      isPositive: dashboardData.customersToday.isPositive
    }
  ] : defaultStats;

  // Show error message if API call failed
  if (error) {
    return (
      <div className="stats-grid">
        <Card className="col-span-full border-l-4 border-l-red-500">
          <CardContent className="p-4 text-center">
            <p className="text-red-600">Failed to load dashboard statistics</p>
            <p className="text-sm text-gray-500 mt-1">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="stats-grid">
      {stats.map((stat, index) => (
        <Card key={index} className={`border-l-4 border-l-restaurant-primary ${isLoading ? 'opacity-50' : ''}`}>
          <CardContent className="p-4 flex items-center">
            <div className="mr-4">
              {stat.icon}
            </div>
            <div>
              <p className="text-sm text-gray-500">{stat.title}</p>
              <h3 className="text-2xl font-semibold">
                {isLoading ? 'Loading...' : stat.value}
              </h3>
              <p className={`text-xs ${stat.isPositive ? 'text-restaurant-success' : 'text-restaurant-danger'}`}>
                {stat.change}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DashboardStatsComponent;
