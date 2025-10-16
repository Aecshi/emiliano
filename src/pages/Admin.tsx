import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Users, ShieldCheck, Loader2 } from 'lucide-react';

const Admin = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  // Function to fetch users (extracted for reuse)
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users. Using sample data.');
      // Sample data based on database.sql
      setUsers([
        { user_id: 1, username: "admin", email: "alfred.cepillo@example.com", full_name: "Alfred Emil Cepillo", role: "admin", status: "active", last_login: "2023-10-14 09:45:00" },
        { user_id: 2, username: "karl", email: "karl.pauste@example.com", full_name: "Karl Pauste", role: "staff", status: "active", last_login: "2023-10-14 10:30:00" },
        { user_id: 3, username: "april", email: "april.erasmo@example.com", full_name: "April Erasmo", role: "staff", status: "active", last_login: "2023-10-13 02:15:00" },
        { user_id: 4, username: "rafael", email: "rafael.santos@example.com", full_name: "Rafael Santos", role: "stockman", status: "active", last_login: "2023-10-14 14:05:00" }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch users from API
  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users based on search term and role filter
  const filteredUsers = users.filter(user => {
    // Search filter
    const matchesSearch = searchTerm ? 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) : 
      true;
    
    // Role filter
    const matchesRole = activeFilter === 'all' ? true : user.role === activeFilter;
    
    return matchesSearch && matchesRole;
  });

  // Helper function to get role badge style
  const getRoleBadgeClass = (role) => {
    switch (role.toLowerCase()) {
      case 'admin': return "bg-blue-500 hover:bg-blue-600";
      case 'stockman': return "bg-amber-500 hover:bg-amber-600";
      default: return "bg-green-500 hover:bg-green-600";
    }
  };

  // Helper function to format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get counts for summary cards
  const totalUsers = users ? users.length : 0;
  const adminUsers = users ? users.filter(user => user.role === 'admin').length : 0;
  const activeUsers = users ? users.filter(user => user.status === 'active').length : 0;

  return (
    <div className="pos-container">
      <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="pos-grid relative">
        <Sidebar isOpen={sidebarOpen} />

        <div className="pos-content">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">User Management</h1>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Users className="w-4 h-4 mr-2 text-blue-500" />
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-700">
                  {isLoading ? (
                    <div className="flex items-center">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>Loading...</span>
                    </div>
                  ) : totalUsers}
                </div>
                <p className="text-sm text-blue-600">All registered accounts</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <ShieldCheck className="w-4 h-4 mr-2 text-purple-500" />
                  Admin Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-700">
                  {isLoading ? (
                    <div className="flex items-center">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>Loading...</span>
                    </div>
                  ) : adminUsers}
                </div>
                <p className="text-sm text-purple-600">With full privileges</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Users className="w-4 h-4 mr-2 text-green-500" />
                  Active Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-700">
                  {isLoading ? (
                    <div className="flex items-center">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>Loading...</span>
                    </div>
                  ) : activeUsers}
                </div>
                <p className="text-sm text-green-600">Currently active accounts</p>
              </CardContent>
            </Card>
          </div>

          {/* Main User Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View staff accounts and permissions</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input 
                    placeholder="Search users..."
                    className="pl-9 pr-4 py-2 w-[250px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>

            <div className="px-6 pb-3">
              <div className="flex space-x-2">
                <Button 
                  variant={activeFilter === 'all' ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setActiveFilter('all')}
                >
                  All Users
                </Button>
                <Button 
                  variant={activeFilter === 'admin' ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setActiveFilter('admin')}
                >
                  Admins
                </Button>
                <Button 
                  variant={activeFilter === 'staff' ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setActiveFilter('staff')}
                >
                  Staff
                </Button>
                <Button 
                  variant={activeFilter === 'stockman' ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setActiveFilter('stockman')}
                >
                  Stockmen
                </Button>
              </div>
            </div>

            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mr-2" />
                  <span>Loading users...</span>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Login</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-6">
                            No users found matching your criteria.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <TableRow key={user.user_id}>
                            <TableCell>{user.user_id}</TableCell>
                            <TableCell className="font-medium">{user.full_name}</TableCell>
                            <TableCell>{user.username}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge className={getRoleBadgeClass(user.role)}>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.status === 'active' ? 'bg-green-100 text-green-800' : 
                                user.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {user.status}
                              </span>
                            </TableCell>
                            <TableCell>{formatTimestamp(user.last_login)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Admin;