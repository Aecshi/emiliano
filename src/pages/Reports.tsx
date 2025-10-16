import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { 
  CalendarIcon, 
  TrendingUp, 
  ArrowUpIcon, 
  ArrowDownIcon, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Clock,
  Download,
  FileText,
  Printer,
  BarChart2,
  PieChart as PieChartIcon,
  Share2,
  FilePlus2,
  Package,
  AlertTriangle,
  Archive
} from 'lucide-react';

import { useToast } from '@/hooks/useToast';
import { getSalesSummary, getDailyRevenue, getBestSellingItems, generateReport } from '@/lib/api';

// Import mock data generation functions for inventory (keep for now)
import { generateInventoryData } from '../utils/mockDataGenerators';

const inventoryData = generateInventoryData();

// Colors for the charts
const COLORS = ['#FF6B6B', '#4ECDC4', '#FFD166', '#6246EA', '#F06595', '#38A169', '#3182CE', '#805AD5'];

const Reports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reportType, setReportType] = useState('sales');
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: subDays(new Date(), 7),
    to: new Date()
  });
  const [selectedPeriod, setSelectedPeriod] = useState("7days");
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  
  // Format dates for API calls
  const formatDateForAPI = (date: Date) => format(date, 'yyyy-MM-dd');
  
  // Fetch real sales data from API
  const { data: salesSummary, isLoading: salesSummaryLoading, error: salesSummaryError } = useQuery({
    queryKey: ['sales-summary', formatDateForAPI(dateRange.from), formatDateForAPI(dateRange.to)],
    queryFn: () => getSalesSummary(formatDateForAPI(dateRange.from), formatDateForAPI(dateRange.to)),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: dailyRevenueData, isLoading: dailyRevenueLoading, error: dailyRevenueError } = useQuery({
    queryKey: ['daily-revenue', formatDateForAPI(dateRange.from), formatDateForAPI(dateRange.to)],
    queryFn: () => getDailyRevenue(formatDateForAPI(dateRange.from), formatDateForAPI(dateRange.to)),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: bestSellingItems, isLoading: bestSellingLoading, error: bestSellingError } = useQuery({
    queryKey: ['best-selling-items', formatDateForAPI(dateRange.from), formatDateForAPI(dateRange.to)],
    queryFn: () => getBestSellingItems(formatDateForAPI(dateRange.from), formatDateForAPI(dateRange.to), 10),
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
  if (salesSummaryLoading || dailyRevenueLoading) {
    return (
      <div className="pos-container">
        <Header toggleSidebar={toggleSidebar} />
        <div className="pos-grid relative">
          <Sidebar isOpen={sidebarOpen} />
          <div className="pos-content">
            <div className="flex items-center justify-center h-64">
              <div className="text-lg">Loading reports...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (salesSummaryError || dailyRevenueError) {
    return (
      <div className="pos-container">
        <Header toggleSidebar={toggleSidebar} />
        <div className="pos-grid relative">
          <Sidebar isOpen={sidebarOpen} />
          <div className="pos-content">
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-red-500">
                Failed to load reports. Please check your connection.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Function to handle report generation
  const handleGenerateReport = async (format: 'pdf' | 'excel' | 'csv' | 'print') => {
    try {
      setShowGenerateDialog(false);
      
      // Show loading toast
      toast({
        title: "Generating Report",
        description: `Please wait while we generate your ${reportType} report...`,
      });
      
      // Call the API to generate the report
      const response = await generateReport({
        format,
        type: reportType as 'sales' | 'inventory',
        fromDate: formatDateForAPI(dateRange.from),
        toDate: formatDateForAPI(dateRange.to)
      });
      
      // Show success toast
      toast({
        title: "Report Generated",
        description: response.message || `Your ${reportType} report has been generated in ${format} format.`,
      });
      
      // For formats other than CSV, we might want to handle them differently
      if (format === 'pdf') {
        // In a real app, we might open the PDF in a new tab or trigger a download
      } else if (format === 'excel') {
        // In a real app, we might trigger an Excel download
      } else if (format === 'print') {
        // In a real app, we might open a print dialog
      }
      
    } catch (error) {
      toast({
        title: "Report Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Function to navigate to detailed reports
  const navigateToDetailedReport = () => {
    if (reportType === 'sales') {
      navigate('/salesreports');
    } else {
      navigate('/inventoryreports');
    }
  };

  return (
    <div className="pos-container">
      <Header toggleSidebar={toggleSidebar} />

      <div className="pos-grid relative">
        <Sidebar isOpen={sidebarOpen} />

        <div className="pos-content">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Reports</h1>
            
            <div className="flex items-center gap-3">
              <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-restaurant-primary text-white hover:bg-restaurant-primary/90">
                    <FilePlus2 className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate {reportType === 'sales' ? 'Sales' : 'Inventory'} Report</DialogTitle>
                    <DialogDescription>
                      Choose a format to generate your report for the selected date range: {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <Button 
                      variant="outline" 
                      className="flex flex-col items-center justify-center p-6" 
                      onClick={() => handleGenerateReport('pdf')}
                    >
                      <FileText className="h-10 w-10 mb-2 text-restaurant-primary" />
                      <span className="font-semibold">PDF Document</span>
                      <span className="text-xs text-muted-foreground mt-1">Portable Document Format</span>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="flex flex-col items-center justify-center p-6" 
                      onClick={() => handleGenerateReport('excel')}
                    >
                      <BarChart2 className="h-10 w-10 mb-2 text-green-600" />
                      <span className="font-semibold">Excel Spreadsheet</span>
                      <span className="text-xs text-muted-foreground mt-1">Editable with formulas</span>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="flex flex-col items-center justify-center p-6" 
                      onClick={() => handleGenerateReport('print')}
                    >
                      <Printer className="h-10 w-10 mb-2 text-blue-600" />
                      <span className="font-semibold">Print Version</span>
                      <span className="text-xs text-muted-foreground mt-1">Optimized for printing</span>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="flex flex-col items-center justify-center p-6" 
                      onClick={() => handleGenerateReport('csv')}
                    >
                      <Download className="h-10 w-10 mb-2 text-amber-600" />
                      <span className="font-semibold">CSV Export</span>
                      <span className="text-xs text-muted-foreground mt-1">Raw data export</span>
                    </Button>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>Cancel</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Button variant="outline" onClick={navigateToDetailedReport}>
                <Share2 className="h-4 w-4 mr-2" />
                Detailed Reports
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-4 mb-6">
            <Tabs 
              defaultValue="sales" 
              value={reportType} 
              onValueChange={setReportType} 
              className="flex-1"
            >
              <TabsList className="w-full max-w-md">
                <TabsTrigger value="sales" className="flex-1">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Sales Reports
                </TabsTrigger>
                <TabsTrigger value="inventory" className="flex-1">
                  <Package className="h-4 w-4 mr-2" />
                  Inventory Reports
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex items-center gap-3 ml-auto">
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

          {/* Report Tabs Content */}
          <div>
            {/* Sales Reports Section */}
            {reportType === 'sales' && (
              <>
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
                  <CardFooter className="flex justify-between border-t p-4">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Sales Trend:</span> {(salesSummary?.summary.revenueChange || 0) >= 0 ? 'Positive growth' : 'Needs attention'}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate('/salesreports')}>
                      View Detailed Analysis
                    </Button>
                  </CardFooter>
                </Card>
              </>
            )}

            {/* Inventory Reports Section */}
            {reportType === 'inventory' && (
              <>
                {/* Inventory Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Total Inventory Value</p>
                        <h3 className="text-2xl font-bold">₱{inventoryData.summary.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
                        <div className="text-xs text-muted-foreground mt-1">Across all categories</div>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Archive className="h-6 w-6 text-primary" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Low Stock Items</p>
                        <h3 className="text-2xl font-bold">{inventoryData.summary.lowStockCount}</h3>
                        <div className="text-xs text-red-500 mt-1 flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Requires attention
                        </div>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                        <AlertTriangle className="h-6 w-6 text-red-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Pending Orders</p>
                        <h3 className="text-2xl font-bold">{inventoryData.summary.pendingOrdersCount}</h3>
                        <div className="text-xs text-muted-foreground mt-1">Awaiting delivery</div>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <ShoppingCart className="h-6 w-6 text-primary" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Stock Turnover</p>
                        <h3 className="text-2xl font-bold">{inventoryData.summary.turnoverRate.toFixed(1)}x</h3>
                        <div className="text-xs text-muted-foreground mt-1">Monthly average</div>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-primary" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Inventory Value by Category</CardTitle>
                      <CardDescription>Distribution of inventory across categories</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={inventoryData.categoryData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {inventoryData.categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: any) => [`₱${Number(value).toLocaleString()}`, 'Value']} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Low Stock Items</CardTitle>
                      <CardDescription>Items that need to be reordered soon</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {inventoryData.lowStockItems.slice(0, 5).map((item, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-muted-foreground">{item.category}</p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center">
                                <p className="font-medium">{item.quantity} {item.unit}</p>
                                <span className="ml-2 px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                                  Low
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">Reorder at: {item.reorderPoint}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {inventoryData.lowStockItems.length > 5 && (
                        <Button variant="link" className="mt-4 w-full" onClick={() => navigate('/inventoryreports')}>
                          View all {inventoryData.lowStockItems.length} low stock items
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Inventory Usage Trend</CardTitle>
                    <CardDescription>Daily usage of inventory items over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={inventoryData.usageTrend}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="value" name="Usage Value" fill="#4ECDC4" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between border-t p-4">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Peak Usage:</span> {inventoryData.summary.peakUsageDay}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate('/inventoryreports')}>
                      View Detailed Inventory
                    </Button>
                  </CardFooter>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
