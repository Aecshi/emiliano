import { API_BASE_URL, apiRequest } from './api';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user: UserData;
}

export interface UserData {
  user_id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'staff' | 'stockman';
  status: 'active' | 'inactive' | 'suspended';
  permissions: {
    [module: string]: {
      view: boolean;
      add: boolean;
      edit: boolean;
      delete: boolean;
    };
  };
}

export interface SessionCheckResponse {
  success: boolean;
  message: string;
  user_id: number;
  username: string;
  role: string;
}

// Store the current user data in memory
let currentUser: UserData | null = null;

/**
 * Login with username and password
 */
export const login = async (credentials: LoginCredentials): Promise<UserData> => {
  try {
    const response = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // Store user data
    currentUser = response.user;
    
    // Store user in localStorage for persistence
    localStorage.setItem('user', JSON.stringify(response.user));
    
    return response.user;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

/**
 * Logout the current user
 */
export const logout = async (): Promise<void> => {
  try {
    await apiRequest('/auth/logout', {
      method: 'POST',
    });
    
    // Clear user data
    currentUser = null;
    localStorage.removeItem('user');
  } catch (error) {
    console.error('Logout failed:', error);
    
    // Even if the server request fails, clear local data
    currentUser = null;
    localStorage.removeItem('user');
    
    throw error;
  }
};

/**
 * Check if the current session is valid
 */
export const checkSession = async (): Promise<boolean> => {
  try {
    const response = await apiRequest<SessionCheckResponse>('/auth/check');
    return response.success;
  } catch (error) {
    console.error('Session check failed:', error);
    return false;
  }
};

/**
 * Get the current user data
 */
export const getCurrentUser = async (): Promise<UserData | null> => {
  // If we already have the user data in memory, return it
  if (currentUser) {
    return currentUser;
  }
  
  // Try to get from localStorage
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    try {
      currentUser = JSON.parse(storedUser);
      return currentUser;
    } catch (e) {
      localStorage.removeItem('user');
    }
  }
  
  // If not in memory or localStorage, fetch from API
  try {
    const user = await apiRequest<UserData>('/auth/user');
    currentUser = user;
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
};

/**
 * Check if the current user has permission for a specific action
 */
export const hasPermission = async (
  module: string,
  action: 'view' | 'add' | 'edit' | 'delete'
): Promise<boolean> => {
  const user = await getCurrentUser();
  
  if (!user || !user.permissions) {
    return false;
  }
  
  // Admin role has all permissions
  if (user.role === 'admin') {
    return true;
  }
  
  // Check specific permission
  return !!(user.permissions[module] && user.permissions[module][action]);
};

/**
 * Initialize the auth service
 */
export const initAuth = async (): Promise<UserData | null> => {
  try {
    // Check if session is valid
    const isValid = await checkSession();
    
    if (isValid) {
      // Get current user data
      return await getCurrentUser();
    } else {
      // Clear any stored data if session is invalid
      currentUser = null;
      localStorage.removeItem('user');
      return null;
    }
  } catch (error) {
    console.error('Auth initialization failed:', error);
    return null;
  }
}; 