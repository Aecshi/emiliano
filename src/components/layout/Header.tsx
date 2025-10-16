
import React, { useState, useEffect } from 'react';
import { Menu, Bell, User, Calendar, CheckCircle, AlertCircle, Mail, LogOut, Settings, ShoppingBag, CreditCard, UserCircle, Cog, MessageSquare, Key, Shield, Languages, Moon, Sun, Palette, Eye, ChevronRight, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format } from 'date-fns';
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  toggleSidebar: () => void;
}

interface Message {
  id: number;
  sender: string;
  avatar: string;
  content: string;
  time: string;
  read: boolean;
}

// Mock notification data
const mockNotifications = [
  {
    id: 1,
    title: 'Inventory Alert',
    message: 'Low stock on Chicken Breast',
    time: '10 minutes ago',
    read: false,
    type: 'alert',
  },
  {
    id: 2,
    title: 'New Order',
    message: 'Table 5 placed a new order',
    time: '25 minutes ago',
    read: false,
    type: 'order',
  },
  {
    id: 3,
    title: 'Payment Processed',
    message: 'Receipt #R-005 payment complete',
    time: '1 hour ago',
    read: true,
    type: 'payment',
  },
  {
    id: 4,
    title: 'System Update',
    message: 'POS System updated to v2.3.5',
    time: '3 hours ago',
    read: true,
    type: 'system',
  },
];

// Mock messages data
const mockMessages = [
  {
    id: 1,
    sender: 'Jane Smith',
    avatar: '/avatar-1.jpg',
    content: 'Can you check the inventory report?',
    time: '5 minutes ago',
    read: false
  },
  {
    id: 2,
    sender: 'Mike Johnson',
    avatar: '/avatar-2.jpg',
    content: 'Table 3 needs assistance with their order',
    time: '20 minutes ago',
    read: false
  },
  {
    id: 3,
    sender: 'Lisa Wong',
    avatar: '/avatar-3.jpg',
    content: 'The new menu items are ready for review',
    time: '3 hours ago',
    read: true
  }
];

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);
  
  // Notification states
  const [notifications, setNotifications] = useState(mockNotifications);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const unreadCount = notifications.filter(notification => !notification.read).length;
  
  // Messages states
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const unreadMessageCount = messages.filter(message => !message.read).length;
  
  // Dialog states
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  
  // Settings states
  const [settingsTab, setSettingsTab] = useState("account");
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState("english");
  const [notifications2FA, setNotifications2FA] = useState(true);
  
  // Notification handlers
  const markAllAsRead = () => {
    setNotifications(notifications.map(notification => ({
      ...notification,
      read: true
    })));
  };
  
  const markAsRead = (id: number) => {
    setNotifications(notifications.map(notification => 
      notification.id === id ? { ...notification, read: true } : notification
    ));
  };
  
  const clearNotifications = () => {
    setNotifications([]);
  };
  
  // Message handlers
  const markMessageAsRead = (id: number) => {
    setMessages(messages.map(message => 
      message.id === id ? { ...message, read: true } : message
    ));
  };
  
  const markAllMessagesAsRead = () => {
    setMessages(messages.map(message => ({
      ...message,
      read: true
    })));
  };
  
  const handleLogout = async () => {
    try {
      // Clear user from localStorage
      localStorage.removeItem('user');
      setUser(null);
      setLogoutConfirmOpen(false);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Get user initials for avatar fallback
  const getUserInitials = (): string => {
    if (!user || !user.username) return 'U';
    return user.username.substring(0, 2).toUpperCase();
  };

  return (
    <header className="pos-header">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleSidebar}
          className="text-white hover:bg-restaurant-accent/20"
        >
          <Menu className="h-6 w-6" />
        </Button>
        <h1 className="text-xl md:text-2xl font-display font-semibold">Emiliano Restaurant</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center mr-4">
          <Calendar className="h-5 w-5 mr-2" />
          <span className="text-sm">{format(new Date(), 'MMM d, yyyy')}</span>
        </div>
        
        {/* Notification Bell Dropdown */}
        <DropdownMenu open={notificationOpen} onOpenChange={setNotificationOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-restaurant-accent/20 relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white" 
                  variant="destructive"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between p-2">
              <DropdownMenuLabel className="text-lg font-semibold">Notifications</DropdownMenuLabel>
              {notifications.length > 0 && (
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
                      Mark all as read
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={clearNotifications} className="text-xs h-7">
                    Clear all
                  </Button>
                </div>
              )}
            </div>
            
            <DropdownMenuSeparator />
            
            {notifications.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                <p>No notifications</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notification) => (
                  <DropdownMenuItem 
                    key={notification.id} 
                    className={`flex flex-col items-start gap-1 p-3 ${notification.read ? '' : 'bg-muted/50'}`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex w-full justify-between">
                      <div className="flex items-center">
                        <div className="mr-2">
                          {notification.type === 'alert' ? (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          ) : notification.type === 'order' ? (
                            <ShoppingBag className="h-4 w-4 text-green-500" />
                          ) : notification.type === 'payment' ? (
                            <CreditCard className="h-4 w-4 text-blue-500" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-purple-500" />
                          )}
                        </div>
                        <span className="font-medium">{notification.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{notification.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                  </DropdownMenuItem>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-restaurant-accent/20">
              <Avatar className="h-6 w-6">
                <AvatarImage src="/user-avatar.jpg" alt="User Avatar" />
                <AvatarFallback className="bg-primary text-white text-xs">{getUserInitials()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span>Loading...</span>
              </div>
            ) : user ? (
              <>
                <div className="flex items-start gap-2 p-2">
                  <Avatar>
                    <AvatarImage src="/user-avatar.jpg" alt="User Avatar" />
                    <AvatarFallback className="bg-primary text-white">{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-medium">{user.username}</p>
                    <p className="text-xs text-muted-foreground">user@example.com</p>
                    <Badge className="mt-1 w-fit capitalize">{user.role}</Badge>
                  </div>
                </div>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
                  <User className="mr-2 h-4 w-4" />
                  <span>My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setMessagesOpen(true)}>
                  <Mail className="mr-2 h-4 w-4" />
                  <div className="flex justify-between items-center w-full">
                    <span>Messages</span>
                    {unreadMessageCount > 0 && (
                      <Badge variant="destructive" className="ml-2 h-5 px-1">
                        {unreadMessageCount}
                      </Badge>
                    )}
                  </div>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  className="text-red-500 focus:text-red-500" 
                  onSelect={() => setLogoutConfirmOpen(true)}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onSelect={() => navigate('/login')}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Login</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* My Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>My Profile</DialogTitle>
            <DialogDescription>
              View and edit your profile information.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src="/user-avatar.jpg" alt="User Avatar" />
                <AvatarFallback className="bg-primary text-white text-xl">{getUserInitials()}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h3 className="text-xl font-bold">{user?.username}</h3>
                <p className="text-sm text-muted-foreground">user@example.com</p>
                <Badge className="mt-2 capitalize">{user?.role}</Badge>
              </div>
            </div>
            
            <div className="grid gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" defaultValue={user?.username} className="col-span-3" />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input id="email" defaultValue="user@example.com" className="col-span-3" />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">Phone</Label>
                <Input id="phone" defaultValue="+1 (555) 123-4567" className="col-span-3" />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="position" className="text-right">Position</Label>
                <Input id="position" defaultValue="Restaurant Manager" className="col-span-3" />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bio" className="text-right">Bio</Label>
                <Textarea 
                  id="bio" 
                  defaultValue="Restaurant manager with 10+ years of experience in the food service industry." 
                  className="col-span-3" 
                  rows={3}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="submit" className="bg-restaurant-primary hover:bg-restaurant-primary/80">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Customize your application preferences.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={settingsTab} onValueChange={setSettingsTab}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="account">
                <UserCircle className="mr-2 h-4 w-4" />
                Account
              </TabsTrigger>
              <TabsTrigger value="appearance">
                <Palette className="mr-2 h-4 w-4" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="security">
                <Shield className="mr-2 h-4 w-4" />
                Security
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="account" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Account Preferences</CardTitle>
                  <CardDescription>Update your account settings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Language</Label>
                      <div className="text-sm text-muted-foreground">Select your preferred language</div>
                    </div>
                    <div className="ml-auto">
                      <RadioGroup value={language} onValueChange={setLanguage} className="flex">
                        <div className="flex items-center space-x-2 mr-4">
                          <RadioGroupItem value="english" id="english" />
                          <Label htmlFor="english">English</Label>
                        </div>
                        <div className="flex items-center space-x-2 mr-4">
                          <RadioGroupItem value="spanish" id="spanish" />
                          <Label htmlFor="spanish">Spanish</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="french" id="french" />
                          <Label htmlFor="french">French</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notifications</Label>
                      <div className="text-sm text-muted-foreground">Receive email notifications</div>
                    </div>
                    <Switch checked={notifications2FA} onCheckedChange={setNotifications2FA} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="appearance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance Settings</CardTitle>
                  <CardDescription>Customize how the application looks.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Dark Mode</Label>
                      <div className="text-sm text-muted-foreground">Toggle between light and dark theme</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Sun className="h-5 w-5 text-muted-foreground" />
                      <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                      <Moon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>Manage your account security.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Two-Factor Authentication</Label>
                      <div className="text-sm text-muted-foreground">Add an extra layer of security</div>
                    </div>
                    <Switch />
                  </div>
                  
                  <Button variant="outline" className="w-full mt-4">
                    <Key className="mr-2 h-4 w-4" />
                    Change Password
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {/* Messages Dialog */}
      <Dialog open={messagesOpen} onOpenChange={setMessagesOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle>Messages</DialogTitle>
              {unreadMessageCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={markAllMessagesAsRead} 
                  className="text-xs h-7"
                >
                  Mark all as read
                </Button>
              )}
            </div>
          </DialogHeader>
          
          <div className="max-h-[400px] overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>No messages</p>
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((message) => (
                  <Card 
                    key={message.id} 
                    className={`cursor-pointer hover:bg-muted/50 ${message.read ? '' : 'bg-muted/30 border-l-4 border-primary'}`}
                    onClick={() => markMessageAsRead(message.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={message.avatar} alt={message.sender} />
                          <AvatarFallback className="bg-primary text-white text-xs">
                            {message.sender.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <p className="font-medium">{message.sender}</p>
                            <span className="text-xs text-muted-foreground">{message.time}</span>
                          </div>
                          <p className="text-sm mt-1">{message.content}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button className="w-full bg-restaurant-primary hover:bg-restaurant-primary/80">
              Compose New Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Logout Confirmation Dialog */}
      <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Log Out</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out of your account?  
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setLogoutConfirmOpen(false)}>Cancel</Button>
            <Button 
              className="bg-red-500 hover:bg-red-600 text-white" 
              onClick={handleLogout}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging Out...
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Header;
