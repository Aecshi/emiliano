import { format, subDays } from 'date-fns';

// Generate mock sales data based on the restaurant's menu items
export const generateMockSalesData = () => {
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
  const categoryTotals = {};
  dailySales.forEach(day => {
    Object.keys(day).forEach(key => {
      if (['Starters', 'Main Courses', 'Desserts', 'Drinks'].includes(key)) {
        categoryTotals[key] = (categoryTotals[key] || 0) + day[key];
      }
    });
  });

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

// Generate mock inventory data
export const generateInventoryData = () => {
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
        const usedQuantityValue = Math.min(
          Math.random() * 5, // 0 to 5 units
          randomItem.quantity // Can't use more than what's in stock
        );
        const usedQuantity = usedQuantityValue.toFixed(1); // Format as string with 1 decimal place
        
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
  const usageTrend = [];
  const daysArray = Array.from({ length: 30 }, (_, i) => {
    const date = format(subDays(today, 29 - i), 'yyyy-MM-dd');
    return date;
  });
  
  daysArray.forEach(date => {
    const dayUsage = usageHistory.filter(usage => usage.date === date);
    const value = dayUsage.reduce((sum, item) => {
      const inventoryItem = inventoryItems.find(inv => inv.id === item.itemId);
      if (inventoryItem) {
        return sum + (inventoryItem.unitPrice * parseFloat(item.quantityUsed));
      }
      return sum;
    }, 0);
    
    usageTrend.push({
      date,
      value
    });
  });
  
  // Find peak usage day
  const peakUsageDay = [...usageTrend].sort((a, b) => b.value - a.value)[0].date;
  
  // Get low stock items
  const lowStockItems = inventoryItems.filter(item => item.status === 'Low Stock' || item.status === 'Out of Stock');
  
  // Count pending orders
  const pendingOrdersCount = purchaseOrders.filter(order => order.status === 'Pending').length;
  
  // Calculate turnover rate (mock data)
  const turnoverRate = Math.random() * 3 + 1; // Between 1 and 4
  
  // Calculate total inventory value
  const totalValue = inventoryItems.reduce((sum, item) => sum + item.totalValue, 0);
  
  return {
    inventoryItems,
    lowStockItems,
    usageHistory,
    purchaseOrders,
    categoryData,
    usageTrend,
    summary: {
      totalValue,
      lowStockCount: lowStockItems.length,
      pendingOrdersCount,
      turnoverRate,
      peakUsageDay: format(new Date(peakUsageDay), 'MMM d, yyyy')
    }
  };
};
