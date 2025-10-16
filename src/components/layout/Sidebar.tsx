import React from 'react';
import { Home, Utensils, Calendar, Receipt, ShoppingCart, Package, Shield, QrCode, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const navigate = useNavigate();
  
  const menuItems = [
    { name: 'Dashboard', icon: <Home className="w-5 h-5 mr-3" />, path: '/dashboard' },
    { name: 'Tables', icon: <Calendar className="w-5 h-5 mr-3" />, path: '/tables' },
    { name: 'Menu', icon: <Utensils className="w-5 h-5 mr-3" />, path: '/menu' },
    { name: 'Orders', icon: <ShoppingCart className="w-5 h-5 mr-3" />, path: '/orders' },
    { name: 'Inventory', icon: <Package className="w-5 h-5 mr-3" />, path: '/inventory' },
    { name: 'Receipts', icon: <Receipt className="w-5 h-5 mr-3" />, path: '/receipts' },
    { name: 'Reports', icon: <BarChart2 className="w-5 h-5 mr-3" />, path: '/reports' },
    { name: 'QR Menu', icon: <QrCode className="w-5 h-5 mr-3" />, path: '/qr-menu' },
    { name: 'Admin', icon: <Shield className="w-5 h-5 mr-3" />, path: '/admin' },
  ];

  const handleEndShift = () => {
    navigate('/');
  };

  return (
    <aside className={`pos-sidebar fixed md:static top-0 left-0 h-full z-30 transition-all duration-300 transform ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <div className="flex flex-col h-full">
        <div className="mb-8 flex justify-center">
          <span className="font-display text-xl mt-2">POS System</span>
        </div>
        
        <nav className="flex-1">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.name}>
                <Link to={item.path}>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-white hover:bg-restaurant-accent/20"
                  >
                    {item.icon}
                    {item.name}
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="mt-auto pt-4 border-t border-restaurant-accent/30">
          <Button 
            variant="outline" 
            className="w-full bg-restaurant-accent text-white hover:bg-restaurant-accent/80"
            onClick={handleEndShift}
          >
            End Shift
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
