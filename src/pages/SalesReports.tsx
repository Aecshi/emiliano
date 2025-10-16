import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { CalendarIcon, TrendingUp, ArrowUpIcon, ArrowDownIcon, DollarSign, ShoppingCart, Users, Clock } from 'lucide-react';
import { getSalesSummary, getDailyRevenue, getBestSellingItems, getSalesAnalytics } from '@/lib/api';

// Remove the mock data generation - we'll use real API data instead
/*
const generateMockSalesData = () => {
  const menuItems = [
    // Starters
    { id: 1, name: 'Caesar Salad', price: 449.50, category: 'Starters' },
    { id: 2, name: 'Bruschetta', price: 349.50, category: 'Starters' },
    { id: 3, name: 'Calamari', price: 549.50, category: 'Starters' },
    { id: 4, name: 'Caprese Salad', price: 399.50, category: 'Starters' },
    
    // Main Courses
    { id: 5, name: 'Spaghetti Carbonara', price: 749.50, category: 'Main Courses' },
    { id: 6, name: 'Grilled Salmon', price: 949.50, category: 'Main Courses' },
    { id: 7, name: 'Margherita Pizza', price: 649.50, category: 'Main Courses' },
    { id: 8, name: 'Chicken Parmesan', price: 849.50, category: 'Main Courses' },
    
    // Desserts
    { id: 9, name: 'Tiramisu', price: 349.50, category: 'Desserts' },
    { id: 10, name: 'Chocolate Cake', price: 299.50, category: 'Desserts' },
    { id: 11, name: 'Panna Cotta', price: 324.50, category: 'Desserts' },
    
    // Drinks
    { id: 12, name: 'House Wine (Glass)', price: 349.50, category: 'Drinks' },
    { id: 13, name: 'Sparkling Water', price: 174.50, category: 'Drinks' },
    { id: 14, name: 'Cappuccino', price: 214.50, category: 'Drinks' },
    { id: 15, name: 'Craft Beer', price: 299.50, category: 'Drinks' },
  ];

  // Generate random sales quantity for each item for the last 30 days
  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(today, 29 - i);
    return format(date, 'yyyy-MM-dd');
  });

  // Sales by day and category
  const dailySales = days.map(day => {
    // Base values for the day
    const dayData = {
      date: day,
      total: 0,
      Starters: 0,
      'Main Courses': 0,
      Desserts: 0,
      Drinks: 0,
      items: []
    };

    // Generate random sales for each item for this day
    menuItems.forEach(item => {
      // Realistic sales patterns - more main courses than starters, weekends have higher sales
      const isWeekend = new Date(day).getDay() === 0 || new Date(day).getDay() === 6;
      const baseQuantity = isWeekend ? 5 : 3;
      
      let quantity = 0;
      switch (item.category) {
        case 'Main Courses':
          quantity = Math.floor(Math.random() * (isWeekend ? 15 : 10)) + baseQuantity;
          break;
        case 'Drinks':
          quantity = Math.floor(Math.random() * (isWeekend ? 20 : 15)) + baseQuantity;
          break;
        case 'Desserts':
          quantity = Math.floor(Math.random() * (isWeekend ? 10 : 5)) + baseQuantity;
          break;
        case 'Starters':
          quantity = Math.floor(Math.random() * (isWeekend ? 12 : 8)) + baseQuantity;
          break;
      }

      const revenue = quantity * item.price;
      
      // Add to day totals
      dayData.total += revenue;
      dayData[item.category] += revenue;
      
      // Add to items
      if (quantity > 0) {
        dayData.items.push({
          id: item.id,
          name: item.name,
          category: item.category,
          quantity,
          revenue
        });
      }
    });

    return dayData;
  });

  // Calculate top selling items overall
  const itemSalesMap = new Map();
  dailySales.forEach(day => {
    day.items.forEach(item => {
      const existingItem = itemSalesMap.get(item.id);
      if (existingItem) {
        existingItem.quantity += item.quantity;
        existingItem.revenue += item.revenue;
      } else {
        itemSalesMap.set(item.id, { ...item });
      }
    });
  });

  const topSellingItems = Array.from(itemSalesMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Calculate daily revenue by hour (mock data using typical meal times)
  const hourlyDistribution = [
    { hour: '7-8 AM', percent: 2 },
    { hour: '8-9 AM', percent: 5 },
    { hour: '9-10 AM', percent: 8 },
    { hour: '10-11 AM', percent: 5 },
    { hour: '11-12 PM', percent: 7 },
    { hour: '12-1 PM', percent: 15 },
    { hour: '1-2 PM', percent: 12 },
    { hour: '2-3 PM', percent: 5 },
    { hour: '3-4 PM', percent: 3 },
    { hour: '4-5 PM', percent: 2 },
    { hour: '5-6 PM', percent: 5 },
    { hour: '6-7 PM', percent: 10 },
    { hour: '7-8 PM', percent: 12 },
    { hour: '8-9 PM', percent: 8 },
    { hour: '9-10 PM', percent: 1 },
  ];

  // Total revenue by category
  const categoryTotals = dailySales.reduce((acc, day) => {
    Object.keys(day).forEach(key => {
      if (['Starters', 'Main Courses', 'Desserts', 'Drinks'].includes(key)) {
        acc[key] = (acc[key] || 0) + day[key];
      }
    });
    return acc;
  }, {});

  // Convert to array for charts
  const categorySales = Object.entries(categoryTotals).map(([name, value]) => ({
    name,
    value
  }));

  // Calculate summary metrics
  const totalRevenue = dailySales.reduce((sum, day) => sum + day.total, 0);
  const totalOrders = dailySales.reduce((sum, day) => sum + day.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
  const averageOrderValue = totalRevenue / totalOrders;

  const lastWeek = dailySales.slice(-7);
  const previousWeek = dailySales.slice(-14, -7);
  const lastWeekRevenue = lastWeek.reduce((sum, day) => sum + day.total, 0);
  const previousWeekRevenue = previousWeek.reduce((sum, day) => sum + day.total, 0);
  const revenueChange = ((lastWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100;

  return {
    dailySales,
    topSellingItems,
    hourlyDistribution,
    categorySales,
    summary: {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      revenueChange
    }
  };
};
*/

// Colors for the charts
const COLORS = ['#FF6B6B', '#4ECDC4', '#FFD166', '#6246EA'];

const SalesReports = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [selectedPeriod, setSelectedPeriod] = useState("30days");
  
  // Format dates for API calls
  const formatDateForAPI = (date: Date) => format(date, 'yyyy-MM-dd');
  
  // Fetch real sales data from API
  const { data: salesSummary, isLoading: salesSummaryLoading, error: salesSummaryError } = useQuery({
    queryKey: ['sales-summary-detailed', formatDateForAPI(dateRange.from), formatDateForAPI(dateRange.to)],
    queryFn: () => getSalesSummary(formatDateForAPI(dateRange.from), formatDateForAPI(dateRange.to)),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: dailyRevenueData, isLoading: dailyRevenueLoading, error: dailyRevenueError } = useQuery({
    queryKey: ['daily-revenue-detailed', formatDateForAPI(dateRange.from), formatDateForAPI(dateRange.to)],
    queryFn: () => getDailyRevenue(formatDateForAPI(dateRange.from), formatDateForAPI(dateRange.to)),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: bestSellingItems, isLoading: bestSellingLoading, error: bestSellingError } = useQuery({
    queryKey: ['best-selling-items-detailed', formatDateForAPI(dateRange.from), formatDateForAPI(dateRange.to)],
    queryFn: () => getBestSellingItems(formatDateForAPI(dateRange.from), formatDateForAPI(dateRange.to), 10),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: salesAnalytics, isLoading: salesAnalyticsLoading, error: salesAnalyticsError } = useQuery({
    queryKey: ['sales-analytics', formatDateForAPI(dateRange.from), formatDateForAPI(dateRange.to)],
    queryFn: () => getSalesAnalytics(formatDateForAPI(dateRange.from), formatDateForAPI(dateRange.to)),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);
    const today = new Date();
    let from;

    switch (value) {
      case "7days":
        from = subDays(today, 7);
        break;
      case "30days":
        from = subDays(today, 30);
        break;
      case "90days":
        from = subDays(today, 90);
        break;
      default:
        from = subDays(today, 7);
    }

    setDateRange({
      from,
      to: today
    });
  };

  // Handle loading and error states
  const isLoading = salesSummaryLoading || dailyRevenueLoading || bestSellingLoading || salesAnalyticsLoading;
  const hasError = salesSummaryError || dailyRevenueError || bestSellingError || salesAnalyticsError;

  if (isLoading) {
    return (
      <div className="pos-container">
        <Header toggleSidebar={toggleSidebar} />
        <div className="pos-grid relative">
          <Sidebar isOpen={sidebarOpen} />
          <div className="pos-content">
            <div className="flex items-center justify-center h-64">
              <div className="text-lg">Loading detailed reports...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="pos-container">
        <Header toggleSidebar={toggleSidebar} />
        <div className="pos-grid relative">
          <Sidebar isOpen={sidebarOpen} />
          <div className="pos-content">
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-red-500">
                Failed to load detailed reports. Please check your connection.
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
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Sales Reports</h1>
            
            <div className="flex items-center gap-4">
              <Select defaultValue={selectedPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="pl-3 text-left font-normal flex justify-between items-center">
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                        </>
                      ) : (
                        format(dateRange.from, "MMM d, yyyy")
                      )
                    ) : (
                      "Pick a date"
                    )}
                    <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={(range: any) => range && setDateRange(range)}
                    initialFocus
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total Revenue</p>
                  <h3 className="text-2xl font-bold">₱{salesSummary?.summary.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}</h3>
                  <div className={`flex items-center text-xs mt-1 ${(salesSummary?.summary.revenueChange || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {(salesSummary?.summary.revenueChange || 0) >= 0 ? (
                      <ArrowUpIcon className="h-3 w-3 mr-1" />
                    ) : (
                      <ArrowDownIcon className="h-3 w-3 mr-1" />
                    )}
                    <span>{Math.abs(salesSummary?.summary.revenueChange || 0).toFixed(1)}% from previous</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total Orders</p>
                  <h3 className="text-2xl font-bold">{salesSummary?.summary.totalOrders.toLocaleString() || '0'}</h3>
                  <div className="text-xs text-muted-foreground mt-1">For the selected period</div>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Average Order</p>
                  <h3 className="text-2xl font-bold">₱{salesSummary?.summary.averageOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}</h3>
                  <div className="text-xs text-muted-foreground mt-1">Per transaction</div>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Best Selling Item</p>
                  <h3 className="text-xl font-bold">{salesSummary?.bestSellingItem.name || 'N/A'}</h3>
                  <div className="text-xs text-muted-foreground mt-1">{salesSummary?.bestSellingItem.quantity || 0} sold</div>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="mb-6">
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="items">Top Items</TabsTrigger>
              <TabsTrigger value="hourly">Hourly Analysis</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Over Time</CardTitle>
                  <CardDescription>Daily revenue for the selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={dailyRevenueData || []}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: any) => [`₱${Number(value).toLocaleString()}`, 'Revenue']}
                          labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#4ECDC4"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Categories Tab */}
            <TabsContent value="categories">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Sales by Category</CardTitle>
                    <CardDescription>Distribution of sales across menu categories</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={salesAnalytics?.categories || []}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {(salesAnalytics?.categories || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => [`₱${Number(value).toLocaleString()}`, 'Revenue']}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Category Performance</CardTitle>
                    <CardDescription>Revenue by menu category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={salesAnalytics?.categories || []}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" />
                          <Tooltip
                            formatter={(value: any) => [`₱${Number(value).toLocaleString()}`, 'Revenue']}
                          />
                          <Legend />
                          <Bar 
                            dataKey="value" 
                            fill="#4ECDC4"
                            name="Revenue"
                            radius={[0, 4, 4, 0]}
                          >
                            {(salesAnalytics?.categories || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Top Items Tab */}
            <TabsContent value="items">
              <Card>
                <CardHeader>
                  <CardTitle>Top Selling Items</CardTitle>
                  <CardDescription>Best performing menu items by revenue</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={bestSellingItems || []}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: any) => [`₱${Number(value).toLocaleString()}`, 'Revenue']}
                        />
                        <Legend />
                        <Bar 
                          dataKey="revenue" 
                          fill="#FF6B6B" 
                          name="Revenue"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar 
                          dataKey="quantity" 
                          fill="#4ECDC4" 
                          name="Quantity Sold"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Hourly Tab */}
            <TabsContent value="hourly">
              <Card>
                <CardHeader>
                  <CardTitle>Sales by Hour of Day</CardTitle>
                  <CardDescription>Revenue distribution throughout the day</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={salesAnalytics?.hourlyDistribution || []}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: any) => [`${value}%`, 'Sales Percentage']}
                        />
                        <Legend />
                        <Bar
                          dataKey="percent"
                          fill="#6246EA"
                          name="Sales Percentage"
                          radius={[4, 4, 0, 0]}
                        >
                          {(salesAnalytics?.hourlyDistribution || []).map((entry, index) => {
                            // Color by meal time periods
                            let color = '#6246EA';
                            if (entry.hour.includes('AM') || entry.hour.includes('11-12')) {
                              color = '#FFD166'; // Breakfast/Brunch
                            } else if (entry.hour.includes('12-1') || entry.hour.includes('1-2')) {
                              color = '#FF6B6B'; // Lunch
                            } else if (entry.hour.includes('6-7') || entry.hour.includes('7-8') || entry.hour.includes('8-9')) {
                              color = '#4ECDC4'; // Dinner
                            }
                            return <Cell key={`cell-${index}`} fill={color} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default SalesReports; 