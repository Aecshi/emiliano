import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  requiredPermission?: {
    module: string;
    action: 'view' | 'add' | 'edit' | 'delete';
  };
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredPermission }) => {
  const { isAuthenticated, isLoading, hasPermission } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-restaurant-primary mb-4" />
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check for specific permission if required
  if (requiredPermission) {
    const { module, action } = requiredPermission;
    const hasAccess = hasPermission(module, action);

    if (!hasAccess) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md text-center">
            <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
            <p>
              You don't have permission to access this page. 
              Please contact your administrator if you believe this is an error.
            </p>
          </div>
        </div>
      );
    }
  }

  // If authenticated and has permission, render the child routes
  return <Outlet />;
};

export default ProtectedRoute; 