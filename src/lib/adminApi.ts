import { API_BASE_URL, apiRequest } from './api';

// Types for Users
export interface User {
  user_id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'staff' | 'stockman';
  status: 'active' | 'inactive' | 'suspended';
  last_login?: string;
  last_active?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserWithPermissions extends User {
  permissions: {
    [module: string]: {
      view: boolean;
      add: boolean;
      edit: boolean;
      delete: boolean;
    };
  };
}

export interface CreateUserRequest {
  username: string;
  password: string;
  email: string;
  full_name: string;
  role: 'admin' | 'staff' | 'stockman';
  status?: 'active' | 'inactive' | 'suspended';
}

export interface UpdateUserRequest {
  username?: string;
  password?: string;
  email?: string;
  full_name?: string;
  role?: 'admin' | 'staff' | 'stockman';
  status?: 'active' | 'inactive' | 'suspended';
  permissions?: {
    [module: string]: {
      view: boolean;
      add: boolean;
      edit: boolean;
      delete: boolean;
    };
  };
}

// Types for Logs
export interface ActivityLog {
  id: number;
  user_id: number | null;
  username: string;
  full_name: string;
  action: string;
  description: string;
  ip_address: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  source: string;
}

export interface LogsResponse {
  logs: ActivityLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export interface CreateLogRequest {
  user_id?: number | null;
  action: string;
  description: string;
  ip_address?: string;
  user_agent?: string;
}

export interface SystemStats {
  system_events: number;
  warnings: number;
  user_sessions: number;
}

// User API functions
export const getUsers = async (role?: string, status?: string): Promise<User[]> => {
  let url = '/users';
  const params = new URLSearchParams();
  
  if (role) params.append('role', role);
  if (status) params.append('status', status);
  
  const queryString = params.toString();
  if (queryString) url += `?${queryString}`;
  
  return apiRequest<User[]>(url);
};

export const getUser = async (userId: number): Promise<UserWithPermissions> => {
  return apiRequest<UserWithPermissions>(`/users/${userId}`);
};

export const createUser = async (user: CreateUserRequest): Promise<User> => {
  return apiRequest<User>('/users', {
    method: 'POST',
    body: JSON.stringify(user),
  });
};

export const updateUser = async (userId: number, updates: UpdateUserRequest): Promise<UserWithPermissions> => {
  return apiRequest<UserWithPermissions>(`/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const deleteUser = async (userId: number): Promise<{ success: boolean; message: string }> => {
  return apiRequest<{ success: boolean; message: string }>(`/users/${userId}`, {
    method: 'DELETE',
  });
};

// Logs API functions
export const getLogs = async (
  options: {
    limit?: number;
    offset?: number;
    action?: string;
    user_id?: number;
    from_date?: string;
    to_date?: string;
    level?: 'error' | 'warning' | 'info';
    source?: string;
  } = {}
): Promise<LogsResponse> => {
  const params = new URLSearchParams();
  
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined) params.append(key, value.toString());
  });
  
  const queryString = params.toString();
  const url = queryString ? `/logs?${queryString}` : '/logs';
  
  return apiRequest<LogsResponse>(url);
};

export const createLog = async (log: CreateLogRequest): Promise<ActivityLog> => {
  return apiRequest<ActivityLog>('/logs', {
    method: 'POST',
    body: JSON.stringify(log),
  });
};

export const getSystemStats = async (): Promise<SystemStats> => {
  try {
    // Use the dedicated endpoint for logs stats
    return await apiRequest<SystemStats>('/logs-stats');
  } catch (error) {
    console.error('Error fetching system stats:', error);
    // Return fallback data
    return {
      system_events: 0,
      warnings: 0,
      user_sessions: 0
    };
  }
}; 