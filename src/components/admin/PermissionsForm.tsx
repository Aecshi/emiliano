import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { UserWithPermissions, UpdateUserRequest } from '@/lib/adminApi';

interface PermissionsFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userId: number, userData: UpdateUserRequest) => void;
  user?: UserWithPermissions;
  isLoading?: boolean;
}

// Define available modules and their display names
const availableModules = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'users', name: 'User Management' },
  { id: 'menu', name: 'Menu Management' },
  { id: 'orders', name: 'Orders' },
  { id: 'inventory', name: 'Inventory' },
  { id: 'tables', name: 'Tables' },
  { id: 'reports', name: 'Reports' },
  { id: 'settings', name: 'Settings' }
];

// Define permission types
const permissionTypes = [
  { id: 'view', name: 'View' },
  { id: 'add', name: 'Add' },
  { id: 'edit', name: 'Edit' },
  { id: 'delete', name: 'Delete' }
];

const PermissionsForm: React.FC<PermissionsFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  user,
  isLoading = false
}) => {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});

  // Initialize permissions when user changes
  useEffect(() => {
    if (user?.permissions) {
      setPermissions(user.permissions);
    } else {
      // Default empty permissions for all modules
      const defaultPermissions: Record<string, Record<string, boolean>> = {};
      availableModules.forEach(module => {
        defaultPermissions[module.id] = {
          view: false,
          add: false,
          edit: false,
          delete: false
        };
      });
      setPermissions(defaultPermissions);
    }
  }, [user]);

  const handlePermissionChange = (module: string, permission: string, checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [permission]: checked
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Error',
        description: 'No user selected'
      });
      return;
    }
    
    onSubmit(user.user_id, { permissions });
  };

  // Helper to check if all permissions for a module are selected
  const areAllPermissionsSelected = (module: string) => {
    return permissionTypes.every(permission => 
      permissions[module]?.[permission.id] === true
    );
  };

  // Helper to toggle all permissions for a module
  const toggleAllModulePermissions = (module: string, checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        view: checked,
        add: checked,
        edit: checked,
        delete: checked
      }
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>User Permissions: {user?.full_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border rounded-md overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">Module</th>
                  {permissionTypes.map(permission => (
                    <th key={permission.id} className="px-4 py-2 text-center">{permission.name}</th>
                  ))}
                  <th className="px-4 py-2 text-center">All</th>
                </tr>
              </thead>
              <tbody>
                {availableModules.map(module => (
                  <tr key={module.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{module.name}</td>
                    {permissionTypes.map(permission => (
                      <td key={permission.id} className="px-4 py-3 text-center">
                        <Checkbox
                          id={`${module.id}-${permission.id}`}
                          checked={permissions[module.id]?.[permission.id] || false}
                          onCheckedChange={(checked) => 
                            handlePermissionChange(module.id, permission.id, !!checked)
                          }
                          disabled={isLoading}
                        />
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center">
                      <Checkbox
                        id={`${module.id}-all`}
                        checked={areAllPermissionsSelected(module.id)}
                        onCheckedChange={(checked) => 
                          toggleAllModulePermissions(module.id, !!checked)
                        }
                        disabled={isLoading}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="bg-restaurant-accent text-white hover:bg-restaurant-accent/80"
              disabled={isLoading || !user}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : 'Update Permissions'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PermissionsForm;
