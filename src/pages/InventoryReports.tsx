import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, AlertTriangle, Archive, TrendingUp, ArrowUpIcon, ArrowDownIcon, ShoppingCart } from 'lucide-react';
import { format, subDays } from 'date-fns';

// Mock inventory data
const generateInventoryData = () => {
  // Categories
  const categories = ['Vegetables', 'Meat', 'Dairy', 'Dry Goods', 'Condiments', 'Seafood', 'Beverages', 'Spices'];
  
  // Item templates per category
  const itemTemplates = {
    'Vegetables': ['Tomatoes', 'Lettuce', 'Onions', 'Bell Peppers', 'Carrots', 'Potatoes', 'Garlic', 'Basil'],
    'Meat': ['Chicken Breast', 'Ground Beef', 'Pork Chops', 'Bacon', 'Lamb', 'Sausage'],
    'Dairy': ['Mozzarella Cheese', 'Parmesan Cheese', 'Butter', 'Cream', 'Milk', 'Eggs', 'Yogurt'],
    'Dry Goods': ['Flour', 'Rice', 'Pasta', 'Sugar', 'Salt', 'Bread Crumbs'],
    'Condiments': ['Olive Oil', 'Vinegar', 'Ketchup', 'Mayonnaise', 'Mustard', 'Soy Sauce'],
    'Seafood': ['Salmon', 'Shrimp', 'Mussels', 'Cod', 'Tuna', 'Crab'],
    'Beverages': ['Coffee', 'Tea', 'Soda', 'Wine', 'Beer', 'Juice'],
    'Spices': ['Pepper', 'Oregano', 'Paprika', 'Cinnamon', 'Cumin', 'Thyme']
  };
  
  // Units per category
  const units = {
    'Vegetables': 'kg',
    'Meat': 'kg',
    'Dairy': ['kg', 'liters', 'dozen', 'packs'],
    'Dry Goods': 'kg',
    'Condiments': ['bottles', 'jars'],
    'Seafood': 'kg',
    'Beverages': ['bottles', 'cans', 'packs'],
    'Spices': ['grams', 'bottles']
  };
  
  // Generate inventory items
  const inventoryItems = [];
  let id = 1;
  
  // For each category
  categories.forEach(category => {
    const itemsInCategory = itemTemplates[category];
    
    // For each item template in the category
    itemsInCategory.forEach(item => {
      // Randomize stock levels and prices
      const quantity = Math.floor(Math.random() * 30) + 5; // 5 to 35
      const unitPrice = (Math.random() * 400) + 50; // 50 to 450
      const totalValue = quantity * unitPrice;
      
      // Determine unit
      let unit;
      if (Array.isArray(units[category])) {
        unit = units[category][Math.floor(Math.random() * units[category].length)];
      } else {
        unit = units[category];
      }
      
      // Determine status based on quantity
      let status;
      if (quantity <= 10) {
        status = 'Low Stock';
      } else if (quantity === 0) {
        status = 'Out of Stock';
      } else {
        status = 'In Stock';
      }
      
      // Determine reorder point
      const reorderPoint = Math.floor(Math.random() * 10) + 5; // 5 to 15
      
      // Generate random last updated date within the last 30 days
      const daysAgo = Math.floor(Math.random() * 30);
      const lastUpdated = format(subDays(new Date(), daysAgo), 'yyyy-MM-dd');
      
      // Add to inventory items
      inventoryItems.push({
        id: `INV${String(id).padStart(3, '0')}`,
        name: item,
        category,
        quantity,
        unit,
        unitPrice,
        totalValue,
        status,
        reorderPoint,
        lastUpdated,
        supplierName: ['Global Foods', 'Local Farm', 'Premier Supplies', 'Fresh Direct', 'Gourmet Imports'][Math.floor(Math.random() * 5)],
        daysToExpire: Math.floor(Math.random() * 30) + 1, // 1 to 30 days
        usageRate: (Math.random() * 2).toFixed(1) // 0 to 2 units per day
      });
      
      id++;
    });
  });
  
  // Generate usage history for the last 30 days
  const today = new Date();
  const usageHistory = [];
  
  // For each day in the last 30 days
  for (let i = 29; i >= 0; i--) {
    const date = format(subDays(today, i), 'yyyy-MM-dd');
    
    // For random inventory items
    const numItems = Math.floor(Math.random() * 5) + 3; // 3 to 8 items per day
    const usedItems = [];
    
    for (let j = 0; j < numItems; j++) {
      const randomItem = inventoryItems[Math.floor(Math.random() * inventoryItems.length)];
      
      // Only add if not already in usedItems
      if (!usedItems.includes(randomItem.id)) {
        usedItems.push(randomItem.id);
        
        // Random usage amount
        const usedQuantity = Math.min(
          (Math.random() * 5).toFixed(1), // 0 to 5 units
          randomItem.quantity // Can't use more than what's in stock
        );
        
        usageHistory.push({
          date,
          itemId: randomItem.id,
          itemName: randomItem.name,
          category: randomItem.category,
          quantityUsed: usedQuantity,
          unit: randomItem.unit
        });
      }
    }
  }
  
  // Generate purchase orders for the last 30 days
  const purchaseOrders = [];
  
  // For each day in the last 30 days
  for (let i = 29; i >= 0; i--) {
    // Skip some days (not every day has a purchase order)
    if (Math.random() < 0.7) continue;
    
    const date = format(subDays(today, i), 'yyyy-MM-dd');
    const poNumber = `PO${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    
    // For random inventory items
    const numItems = Math.floor(Math.random() * 5) + 2; // 2 to 7 items per order
    const orderedItems = [];
    let poTotal = 0;
    
    for (let j = 0; j < numItems; j++) {
      const randomItem = inventoryItems[Math.floor(Math.random() * inventoryItems.length)];
      
      // Only add if not already in orderedItems
      if (!orderedItems.includes(randomItem.id)) {
        orderedItems.push(randomItem.id);
        
        // Random order amount
        const quantity = Math.floor(Math.random() * 20) + 5; // 5 to 25 units
        const itemTotal = quantity * randomItem.unitPrice;
        poTotal += itemTotal;
        
        purchaseOrders.push({
          date,
          poNumber,
          itemId: randomItem.id,
          itemName: randomItem.name,
          category: randomItem.category,
          quantity,
          unit: randomItem.unit,
          unitPrice: randomItem.unitPrice,
          total: itemTotal,
          supplier: randomItem.supplierName,
          status: Math.random() < 0.8 ? 'Received' : 'Pending'
        });
      }
    }
  }
  
  // Calculate category totals for pie chart
  const categoryTotals = {};
  categories.forEach(category => {
    categoryTotals[category] = 0;
  });
  
  inventoryItems.forEach(item => {
    categoryTotals[item.category] += item.totalValue;
  });
  
  const categoryData = Object.entries(categoryTotals).map(([name, value]) => ({
    name,
    value
  }));
  
  // Calculate daily usage total
  const dailyUsage = {};
  usageHistory.forEach(usage => {
    if (!dailyUsage[usage.date]) {
      dailyUsage[usage.date] = 0;
    }
    
    const matchingItem = inventoryItems.find(item => item.id === usage.itemId);
    if (matchingItem) {
      dailyUsage[usage.date] += parseFloat(usage.quantityUsed) * matchingItem.unitPrice;
    }
  });
  
  const usageTrendData = Object.entries(dailyUsage).map(([date, value]) => ({
    date,
    value
  }));
  
  // Calculate total inventory value
  const totalInventoryValue = inventoryItems.reduce((sum, item) => sum + item.totalValue, 0);
  
  // Count low stock items
  const lowStockItems = inventoryItems.filter(item => item.status === 'Low Stock');
  
  // Count expired or near-expiry items (less than 5 days)
  const nearExpiryItems = inventoryItems.filter(item => item.daysToExpire <= 5);
  
  // Calculate total purchases
  const totalPurchases = purchaseOrders.reduce((sum, po) => sum + po.total, 0);
  
  // Top categories by value
  const topCategories = [...categoryData].sort((a, b) => b.value - a.value).slice(0, 5);
  
  // Expiring soon items
  const expiringSoon = inventoryItems
    .filter(item => item.daysToExpire <= 7)
    .sort((a, b) => a.daysToExpire - b.daysToExpire)
    .slice(0, 5);
  
  return {
    inventoryItems,
    usageHistory,
    purchaseOrders,
    categoryData,
    usageTrendData,
    summary: {
      totalValue: totalInventoryValue,
      lowStockCount: lowStockItems.length,
      nearExpiryCount: nearExpiryItems.length,
      totalPurchases
    },
    topCategories,
    expiringSoon
  };
};

const inventoryData = generateInventoryData();

// Colors for the charts
const COLORS = ['#FF6B6B', '#4ECDC4', '#FFD166', '#6246EA', '#F06595', '#38A169', '#3182CE', '#805AD5'];

const InventoryReports = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timeframe, setTimeframe] = useState("30days");

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="pos-container">
      <Header toggleSidebar={toggleSidebar} />

      <div className="pos-grid relative">
        <Sidebar isOpen={sidebarOpen} />

        <div className="pos-content">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Inventory Reports</h1>
            
            <div className="flex items-center gap-4">
              <Select defaultValue={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total Inventory Value</p>
                  <h3 className="text-2xl font-bold">₱{inventoryData.summary.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
                  <div className="text-xs text-muted-foreground mt-1">
                    {inventoryData.inventoryItems.length} items in inventory
                  </div>
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
                  <div className="text-xs text-muted-foreground mt-1">Items below reorder point</div>
                </div>
                <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Near Expiry Items</p>
                  <h3 className="text-2xl font-bold">{inventoryData.summary.nearExpiryCount}</h3>
                  <div className="text-xs text-muted-foreground mt-1">Expires in less than 5 days</div>
                </div>
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total Purchases</p>
                  <h3 className="text-2xl font-bold">₱{inventoryData.summary.totalPurchases.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
                  <div className="text-xs text-muted-foreground mt-1">Last 30 days</div>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full md:w-auto grid-cols-3 md:inline-flex">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="alerts">Alerts & Actions</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Inventory Value Distribution</CardTitle>
                    <CardDescription>Total value by category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
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
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {inventoryData.categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => [`₱${Number(value).toLocaleString()}`, 'Value']}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Daily Usage Value</CardTitle>
                    <CardDescription>Cost of inventory used daily</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={inventoryData.usageTrendData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip
                            formatter={(value: any) => [`₱${Number(value).toLocaleString()}`, 'Value Used']}
                            labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#4ECDC4"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 8 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Top Items by Value</CardTitle>
                  <CardDescription>Highest value inventory items</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={inventoryData.inventoryItems
                          .sort((a, b) => b.totalValue - a.totalValue)
                          .slice(0, 10)}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={120}
                          tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                        />
                        <Tooltip
                          formatter={(value: any) => [`₱${Number(value).toLocaleString()}`, 'Total Value']}
                        />
                        <Legend />
                        <Bar 
                          dataKey="totalValue" 
                          fill="#FF6B6B" 
                          name="Total Value"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Categories Tab */}
            <TabsContent value="categories" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Categories by Value</CardTitle>
                    <CardDescription>Categories with highest inventory value</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {inventoryData.topCategories.map((category, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between">
                            <span className="font-medium">{category.name}</span>
                            <span>₱{category.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          </div>
                          <Progress value={(category.value / inventoryData.topCategories[0].value) * 100} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Category Item Counts</CardTitle>
                    <CardDescription>Number of items per category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={inventoryData.categoryData.map(category => {
                            const itemCount = inventoryData.inventoryItems.filter(item => item.category === category.name).length;
                            return {
                              name: category.name,
                              count: itemCount
                            };
                          })}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar 
                            dataKey="count" 
                            fill="#4ECDC4" 
                            name="Item Count"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Category Stock Health</CardTitle>
                  <CardDescription>Inventory levels by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {inventoryData.categoryData.map((category, index) => {
                      const categoryItems = inventoryData.inventoryItems.filter(item => item.category === category.name);
                      const lowStockCount = categoryItems.filter(item => item.status === 'Low Stock').length;
                      const inStockCount = categoryItems.filter(item => item.status === 'In Stock').length;
                      const totalCount = categoryItems.length;
                      
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">{category.name}</span>
                              <div className="text-sm text-muted-foreground">{totalCount} items</div>
                            </div>
                            <div className="flex space-x-2">
                              <Badge variant="outline" className="bg-green-100 text-green-700">
                                {inStockCount} In Stock
                              </Badge>
                              <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                                {lowStockCount} Low Stock
                              </Badge>
                            </div>
                          </div>
                          <div className="flex w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="bg-green-500" 
                              style={{ width: `${(inStockCount / totalCount) * 100}%` }} 
                            />
                            <div 
                              className="bg-yellow-500" 
                              style={{ width: `${(lowStockCount / totalCount) * 100}%` }} 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Alerts & Actions Tab */}
            <TabsContent value="alerts" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Items Expiring Soon</CardTitle>
                    <CardDescription>Inventory items nearing expiration</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {inventoryData.expiringSoon.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">{item.category}</div>
                          </div>
                          <div className="flex flex-col items-end">
                            <Badge 
                              variant="outline" 
                              className={
                                item.daysToExpire <= 2 
                                  ? "bg-red-100 text-red-700" 
                                  : "bg-yellow-100 text-yellow-700"
                              }
                            >
                              {item.daysToExpire} {item.daysToExpire === 1 ? 'day' : 'days'} left
                            </Badge>
                            <span className="text-sm text-muted-foreground mt-1">
                              {item.quantity} {item.unit} in stock
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Low Stock Items</CardTitle>
                    <CardDescription>Items below reorder point</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {inventoryData.inventoryItems
                        .filter(item => item.status === 'Low Stock')
                        .slice(0, 5)
                        .map((item, index) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-muted-foreground">{item.category}</div>
                            </div>
                            <div className="flex flex-col items-end">
                              <div className="flex items-center">
                                <span className="font-medium mr-2">
                                  {item.quantity} / {item.reorderPoint}
                                </span>
                                <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                                  Order
                                </Button>
                              </div>
                              <div className="w-full mt-1">
                                <Progress 
                                  value={(item.quantity / item.reorderPoint) * 100} 
                                  className="h-1.5"
                                  indicatorClassName="bg-yellow-500"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>High Usage Items</CardTitle>
                  <CardDescription>Items with highest consumption rate</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={
                          // Calculate aggregate usage by item
                          Object.values(
                            inventoryData.usageHistory.reduce((acc, usage) => {
                              if (!acc[usage.itemId]) {
                                acc[usage.itemId] = {
                                  id: usage.itemId,
                                  name: usage.itemName,
                                  category: usage.category,
                                  totalUsed: 0,
                                  unit: usage.unit
                                };
                              }
                              acc[usage.itemId].totalUsed += parseFloat(usage.quantityUsed);
                              return acc;
                            }, {})
                          ).sort((a: any, b: any) => b.totalUsed - a.totalUsed).slice(0, 10)
                        }
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: any, name, props) => {
                            const item = props.payload;
                            return [`${value} ${item.unit}`, 'Total Used'];
                          }}
                        />
                        <Legend />
                        <Bar 
                          dataKey="totalUsed" 
                          fill="#6246EA" 
                          name="Quantity Used"
                          radius={[4, 4, 0, 0]}
                        />
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

export default InventoryReports; 