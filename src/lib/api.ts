// API configuration for PHP backend
const PRODUCTION_API_URL = 'https://emiliano.great-site.net/api';

// Development API URLs to try (all pointing to production)
const DEV_API_URLS = [
  'https://emiliano.great-site.net/api',      // Production API
  'https://emiliano.great-site.net/api',      // Production API
  'https://emiliano.great-site.net/api',      // Production API
  'https://emiliano.great-site.net/api'       // Production API
];

// FORCE PRODUCTION MODE: Always use production URL
export let API_BASE_URL = PRODUCTION_API_URL;

// Comment out the conditional logic for now
// export let API_BASE_URL = import.meta.env.PROD ? PRODUCTION_API_URL : DEV_API_URLS[0];

// Debug function to log API calls
const debugAPI = (endpoint: string, response: any) => {
  console.log(`API Call: ${API_BASE_URL}${endpoint}`, response);
};

// Function to test and find working API URL
const findWorkingAPIURL = async (): Promise<string> => {
  console.log('🔍 Testing different API URLs...');
  
  for (const url of DEV_API_URLS) {
    try {
      console.log(`Testing: ${url}`);
      const response = await fetch(`${url}/test-cors`, {
        method: 'GET',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        console.log(`✅ Found working API URL: ${url}`);
        return url;
      }
    } catch (error) {
      console.log(`❌ Failed: ${url} - ${error}`);
    }
  }
  
  throw new Error('No working API URL found');
};

/**
 * Generic API fetch function with error handling
 */
export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // PRODUCTION MODE: Only use the production URL
  let lastError: Error | null = null;
  
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  console.log(`🔄 API Request: ${fullUrl}`);
  
  try {
      const response = await fetch(fullUrl, {
        ...options,
        mode: 'cors', // Explicitly set CORS mode
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      console.log(`📡 API Response Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error Response:`, errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        } catch {
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
      }

      const data = await response.json();
      console.log(`✅ API Success:`, data);
      debugAPI(endpoint, data);
      
      return data as T;
      
    } catch (error) {
      console.error(`❌ API request failed for ${fullUrl}:`, error);
      lastError = error as Error;
    }
  
  // If we get here, the API request failed
  console.error('❌ API request failed');
  
  // More specific error messages
  if (lastError && lastError instanceof TypeError && lastError.message.includes('fetch')) {
    throw new Error(`Cannot connect to API server: ${API_BASE_URL}. Please check your internet connection and try again.`);
  }
  
  throw lastError || new Error('All API requests failed');
}

// Dashboard API
export interface DashboardStats {
  todaysSales: {
    value: string;
    change: string;
    isPositive: boolean;
  };
  activeTables: {
    value: string;
    change: string;
    isPositive: boolean;
  };
  openOrders: {
    value: number;
    change: string;
    isPositive: boolean;
  };
  customersToday: {
    value: number;
    change: string;
    isPositive: boolean;
  };
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  return apiRequest<DashboardStats>('/dashboard');
};

// Tables API
export interface Table {
  id: number | string; // Can be number for individual tables or string for groups
  number: number | number[]; // Can be single number or array for joined tables
  status: 'available' | 'occupied' | 'reserved';
  time: string | null;
  guests: number | null;
  seatedTime?: string | null;
  orders?: number;
  billAmount?: number;
  capacity?: number;
  // Client-side only properties for UI state
  reservationDate?: Date | null;
  reservationTime?: string | null;
  // Joined table properties
  joinedTableGroup?: string | null;
  isJoined?: boolean;
  combinedName?: string; // For display like "Tables 1 + 10"
  individualTables?: Table[]; // Individual tables that make up this group
}

export const getTables = async (): Promise<Table[]> => {
  return apiRequest<Table[]>('/tables');
};

export const updateTable = async (tableId: number, data: Partial<Table>): Promise<{ success: boolean; message: string }> => {
  return apiRequest(`/tables`, {
    method: 'PUT',
    body: JSON.stringify({ id: tableId, ...data }),
  });
};

export const createTable = async (tableNumber: number, capacity: number = 4): Promise<{ success: boolean; id: number; message: string }> => {
  return apiRequest(`/tables`, {
    method: 'POST',
    body: JSON.stringify({ number: tableNumber, capacity }),
  });
};

export const deleteTable = async (tableId: number): Promise<{ success: boolean; message: string }> => {
  return apiRequest(`/tables?id=${tableId}`, {
    method: 'DELETE',
  });
};

// Table Groups API for joining/separating tables
export interface JoinTablesRequest {
  tableIds: number[];
  groupName?: string;
}

export interface JoinTablesResponse {
  success: boolean;
  message: string;
  groupId: string;
  tables: any[];
  totalCapacity: number;
  combinedName: string;
}

export interface SeparateTablesRequest {
  groupId?: string;
  tableIds?: number[];
}

export interface SeparateTablesResponse {
  success: boolean;
  message: string;
  tables: any[];
}

export const joinTables = async (data: JoinTablesRequest): Promise<JoinTablesResponse> => {
  return apiRequest<JoinTablesResponse>('/table-groups', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const separateTables = async (data: SeparateTablesRequest): Promise<SeparateTablesResponse> => {
  return apiRequest<SeparateTablesResponse>('/table-groups', {
    method: 'DELETE',
    body: JSON.stringify(data),
  });
};

// Reports API
export interface SalesSummary {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    revenueChange: number;
    totalCustomers: number;
  };
  bestSellingItem: {
    name: string;
    quantity: number;
    revenue: number;
  };
  dateRange: {
    from: string;
    to: string;
  };
}

export interface DailyRevenueData {
  date: string;
  revenue: number;
  orders: number;
}

export interface BestSellingItem {
  name: string;
  category: string;
  price: number;
  quantity: number;
  revenue: number;
}

export const getSalesSummary = async (fromDate?: string, toDate?: string): Promise<SalesSummary> => {
  const params = new URLSearchParams();
  if (fromDate) params.append('from', fromDate);
  if (toDate) params.append('to', toDate);
  
  return apiRequest<SalesSummary>(`/reports/sales-summary${params.toString() ? `?${params.toString()}` : ''}`);
};

export const getDailyRevenue = async (fromDate?: string, toDate?: string): Promise<DailyRevenueData[]> => {
  const params = new URLSearchParams();
  if (fromDate) params.append('from', fromDate);
  if (toDate) params.append('to', toDate);
  
  return apiRequest<DailyRevenueData[]>(`/reports/daily-revenue${params.toString() ? `?${params.toString()}` : ''}`);
};

export const getBestSellingItems = async (fromDate?: string, toDate?: string, limit?: number): Promise<BestSellingItem[]> => {
  const params = new URLSearchParams();
  if (fromDate) params.append('from', fromDate);
  if (toDate) params.append('to', toDate);
  if (limit) params.append('limit', limit.toString());
  
  return apiRequest<BestSellingItem[]>(`/reports/best-selling-items${params.toString() ? `?${params.toString()}` : ''}`);
};

export interface SalesAnalytics {
  paymentMethods: Array<{
    payment_method: string;
    count: number;
    total_amount: number;
  }>;
  categories: Array<{
    name: string;
    value: number;
    items: number;
  }>;
  hourlyDistribution: Array<{
    hour: string;
    percent: number;
    revenue: number;
  }>;
  dateRange: {
    from: string;
    to: string;
  };
}

export const getSalesAnalytics = async (fromDate?: string, toDate?: string): Promise<SalesAnalytics> => {
  const params = new URLSearchParams();
  if (fromDate) params.append('from', fromDate);
  if (toDate) params.append('to', toDate);
  
  return apiRequest<SalesAnalytics>(`/reports/sales-analytics${params.toString() ? `?${params.toString()}` : ''}`);
};

export interface GenerateReportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'print';
  type: 'sales' | 'inventory';
  fromDate: string;
  toDate: string;
}

export interface GenerateReportResponse {
  success: boolean;
  message: string;
  reportType: string;
  format: string;
  dateRange: {
    from: string;
    to: string;
  };
}

export const generateReport = async (options: GenerateReportOptions): Promise<GenerateReportResponse> => {
  const params = new URLSearchParams();
  params.append('format', options.format);
  params.append('type', options.type);
  params.append('from', options.fromDate);
  params.append('to', options.toDate);
  
  // For all formats, we need to handle them differently to trigger downloads or open in new tabs
  const url = `${API_BASE_URL}/reports/generate?${params.toString()}`;
  
  if (options.format === 'csv' || options.format === 'excel' || options.format === 'pdf') {
    // Open in a new tab to trigger download
    window.open(url, '_blank');
    
    return {
      success: true,
      message: `${options.format.toUpperCase()} download initiated`,
      reportType: options.type,
      format: options.format,
      dateRange: {
        from: options.fromDate,
        to: options.toDate
      }
    };
  } else if (options.format === 'print') {
    // Open in a new tab for printing
    const printWindow = window.open(url, '_blank');
    
    // No need to call print() here as the print page has auto-print JavaScript
    
    return {
      success: true,
      message: 'Print version opened in a new tab',
      reportType: options.type,
      format: options.format,
      dateRange: {
        from: options.fromDate,
        to: options.toDate
      }
    };
  }
  
  // Fallback to regular API request for other formats
  return apiRequest<GenerateReportResponse>(`/reports/generate?${params.toString()}`);
};

// Test function for debugging API connectivity
export const testAPIConnection = async () => {
  console.log('🧪 Testing API Connection...');
  console.log('📍 Current API URL:', API_BASE_URL);
  
  try {
    // Skip finding working URL - we're using production URL only
    console.log('🔍 Using production API URL:', API_BASE_URL);
    
    // Test 1: Basic connectivity
    console.log('📡 Test 1: Testing basic API connectivity...');
    const basicTest = await apiRequest('/test-cors');
    console.log('✅ Basic connectivity test passed:', basicTest);
    
    // Test 2: Dashboard endpoint
    console.log('📊 Test 2: Testing dashboard endpoint...');
    const dashboardTest = await getDashboardStats();
    console.log('✅ Dashboard test passed:', dashboardTest);
    
    // Test 3: Tables endpoint
    console.log('🏠 Test 3: Testing tables endpoint...');
    const tablesTest = await getTables();
    console.log('✅ Tables test passed:', tablesTest);
    
    // Test 4: Menu endpoint
    console.log('🍽️ Test 4: Testing menu endpoint...');
    const menuTest = await getMenuData();
    console.log('✅ Menu test passed:', menuTest);
    
    // Test 5: Orders endpoint (GET only)
    console.log('📋 Test 5: Testing orders endpoint...');
    const ordersTest = await apiRequest('/orders');
    console.log('✅ Orders test passed:', ordersTest);
    
    console.log('🎉 All API tests passed! The connection is working properly.');
    console.log('💡 If your dashboard still shows errors, try refreshing the page.');
    return { success: true, message: 'All tests passed', workingUrl: API_BASE_URL };
    
  } catch (error) {
    console.error('❌ API test failed:', error);
    console.log('🔧 Troubleshooting tips:');
    console.log('1. Make sure XAMPP Apache is running');
    console.log('2. Try accessing https://emiliano.great-site.net/api/test-cors in your browser');
    console.log('3. Check if there are any firewall/antivirus blocking connections');
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Menu API
export interface MenuCategory {
  id: number;
  name: string;
  description: string | null;
  sortOrder: number;
}

export interface MenuItem {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  price: number;
  category: string;
  imagePath: string | null;
  isAvailable: boolean;
}

export interface MenuData {
  categories: MenuCategory[];
  items: MenuItem[];
}

export const getMenuData = async (): Promise<MenuData> => {
  return apiRequest<MenuData>('/menu');
};

// Orders API
export interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface CreateOrderRequest {
  tableNumber: string;
  items: OrderItem[];
  notes?: string;
  paymentMethod?: 'cash' | 'card' | 'online';
  paymentStatus?: 'paid' | 'unpaid';
  cashGiven?: number;
  changeAmount?: number;
}

export interface CreateOrderResponse {
  success: boolean;
  orderId: number;
  message: string;
  totalAmount: number;
}

export const createOrder = async (orderData: CreateOrderRequest): Promise<CreateOrderResponse> => {
  return apiRequest<CreateOrderResponse>('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
};

export interface OrderItemFromAPI {
  item_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  notes?: string;
}

export interface Order {
  order_id: number;
  table_id: number;
  table_number: string;
  status: 'pending' | 'in_progress' | 'ready' | 'completed';
  payment_status: 'paid' | 'unpaid' | 'pending';
  created_at: string;
  notes?: string;
  items: OrderItemFromAPI[];
  total_amount: number;
}

export const getOrders = async (): Promise<Order[]> => {
  return apiRequest<Order[]>('/orders');
};

export const getOrdersByTable = async (tableId: number): Promise<Order[]> => {
  return apiRequest<Order[]>(`/orders?table_id=${tableId}`);
};

export interface UpdateOrderStatusRequest {
  orderId: number;
  status: 'pending' | 'in_progress' | 'ready' | 'completed' | 'served' | 'cancelled';
}

export interface UpdatePaymentRequest {
  orderId: number;
  paymentStatus: 'paid' | 'unpaid' | 'pending' | 'refunded';
  paymentMethod?: 'cash' | 'card' | 'online';
  amount?: number;
  cashGiven?: number;
  changeAmount?: number;
}

export const updateOrderStatus = async (data: UpdateOrderStatusRequest): Promise<{ success: boolean; message: string }> => {
  return apiRequest<{ success: boolean; message: string }>('/orders/update-status', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const updatePaymentStatus = async (data: UpdatePaymentRequest): Promise<{ success: boolean; message: string }> => {
  return apiRequest<{ success: boolean; message: string }>('/orders/update-payment', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

// Add Receipt related interfaces
export interface ReceiptItem {
  item_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
}

export interface Receipt {
  receipt_id: number;
  receipt_number: string;
  order_id: number;
  payment_id: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  cash_given?: number;
  change_amount?: number;
  customer_name?: string;
  table_number: string;
  payment_method: string;
  date: string;
  time: string;
  notes?: string;
  created_at: string;
  items: ReceiptItem[];
}

// Receipt API functions
export const getReceipts = async (params?: {
  limit?: number;
  offset?: number;
  search?: string;
  from?: string;
  to?: string;
}): Promise<Receipt[]> => {
  const queryParams = new URLSearchParams();
  
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.from) queryParams.append('from', params.from);
  if (params?.to) queryParams.append('to', params.to);
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  return apiRequest<Receipt[]>(`/receipts${queryString}`);
};

export const getReceiptById = async (id: string | number): Promise<Receipt> => {
  return apiRequest<Receipt>(`/receipts?id=${id}`);
};

export const createReceipt = async (data: {
  orderId: number;
  paymentId: number;
  totalAmount: number;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  cashGiven?: number;
  changeAmount?: number;
  customerName?: string;
  notes?: string;
}): Promise<{ receiptId: number; receiptNumber: string }> => {
  return apiRequest<{ receiptId: number; receiptNumber: string }>('/receipts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
};

export const updateReceipt = async (data: {
  receiptId: number;
  cashGiven?: number;
  changeAmount?: number;
  customerName?: string;
  notes?: string;
}): Promise<{ success: boolean }> => {
  return apiRequest<{ success: boolean }>('/receipts', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
};

// Make test function available globally for console access
if (typeof window !== 'undefined') {
  (window as any).testAPI = testAPIConnection;
} 