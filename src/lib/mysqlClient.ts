// This file provides a client-side API for MySQL database operations
// Instead of direct database connections, it makes API calls to the server

// Define the base API URL
const API_BASE_URL = '/api';

/**
 * Makes a fetch request to the API
 */
const fetchAPI = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json() as Promise<T>;
};

/**
 * Generic query function for GET requests
 */
export const query = async <T = any>(endpoint: string, params?: Record<string, string | number>): Promise<T[]> => {
  const queryParams = params ? new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)])
  ).toString() : '';
  
  const url = queryParams ? `${endpoint}?${queryParams}` : endpoint;
  return fetchAPI<T[]>(url);
};

/**
 * Get a single item by ID
 */
export const queryById = async <T = any>(endpoint: string, id: string | number): Promise<T> => {
  return fetchAPI<T>(`${endpoint}/${id}`);
};

/**
 * Create a new item
 */
export const create = async <T = any>(endpoint: string, data: Record<string, any>): Promise<T> => {
  return fetchAPI<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * Update an existing item
 */
export const update = async <T = any>(endpoint: string, id: string | number, data: Record<string, any>): Promise<T> => {
  return fetchAPI<T>(`${endpoint}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

/**
 * Delete an item
 */
export const remove = async (endpoint: string, id: string | number): Promise<void> => {
  return fetchAPI(`${endpoint}/${id}`, {
    method: 'DELETE',
  });
}; 