// Customer Menu API client

// API configuration for PHP backend - try different URLs
const POSSIBLE_API_URLS = [
  'http://localhost/api',      // XAMPP default
  'http://127.0.0.1/api',      // Alternative localhost
  'http://localhost:80/api',   // Explicit port 80
  'http://127.0.0.1:80/api'    // Alternative with port
];

let API_BASE_URL = POSSIBLE_API_URLS[0];

/**
 * Generic API fetch function with error handling
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Try to find working API URL if current one fails
  let lastError: Error | null = null;
  
  for (const testUrl of [API_BASE_URL, ...POSSIBLE_API_URLS.filter(url => url !== API_BASE_URL)]) {
    const fullUrl = `${testUrl}${endpoint}`;
    console.log(`🔄 Customer API Request: ${fullUrl}`);
    
    try {
      const response = await fetch(fullUrl, {
        ...options,
        mode: 'cors', // Explicitly set CORS mode
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      console.log(`📡 Customer API Response Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Customer API Error Response:`, errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        } catch {
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
      }

      const data = await response.json();
      console.log(`✅ Customer API Success:`, data);
      
      // Update the working API URL if we found a different one
      if (testUrl !== API_BASE_URL) {
        console.log(`🔄 Switching to working API URL: ${testUrl}`);
        API_BASE_URL = testUrl;
      }
      
      return data as T;
      
    } catch (error) {
      console.error(`❌ Customer API request failed for ${fullUrl}:`, error);
      lastError = error as Error;
      
      // If this was our primary URL, try the next one
      if (testUrl === API_BASE_URL) {
        continue;
      }
    }
  }
  
  // If we get here, all URLs failed
  console.error('❌ All API URLs failed');
  throw lastError || new Error('All API requests failed');
}

// Type definitions
export interface Category {
  category_id: number;
  name: string;
  description: string | null;
  sort_order: number;
}

export interface MenuItem {
  item_id: number;
  name: string;
  description: string | null;
  price: number;
  is_available: boolean;
  image_path: string | null;
  category_id: number;
  category: string;
}

export interface MenuData {
  categories: Category[];
  items: MenuItem[];
}

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  notes: string;
}

export interface CustomerOrderRequest {
  tableNumber: string;
  items: CartItem[];
  specialInstructions?: string;
  customerName?: string;
}

export interface CustomerOrderResponse {
  success: boolean;
  orderId: number;
  message: string;
  totalAmount: number;
}

// API functions
export const getCustomerMenu = async (): Promise<MenuData> => {
  return apiRequest<MenuData>('/customer-menu');
};

export const getCustomerCategories = async (): Promise<Category[]> => {
  return apiRequest<Category[]>('/customer-menu/categories');
};

export const createCustomerOrder = async (orderData: CustomerOrderRequest): Promise<CustomerOrderResponse> => {
  return apiRequest<CustomerOrderResponse>('/customer-menu', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
};

// Function to test API connection
export const testCustomerApiConnection = async (): Promise<any> => {
  try {
    const result = await apiRequest('/test-cors');
    console.log('API connection test successful:', result);
    return { success: true, message: 'Connected successfully', data: result };
  } catch (error) {
    console.error('API connection test failed:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error', error };
  }
}; 