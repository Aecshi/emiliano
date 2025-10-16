import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import MenuItems from '@/components/menu/MenuItems';

const Menu = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="pos-container">
      <Header toggleSidebar={toggleSidebar} />

      <div className="pos-grid relative">
        <Sidebar isOpen={sidebarOpen} />

        <div className="pos-content">
          <h1 className="text-2xl font-bold mb-6">Menu</h1>
          <MenuItems />
        </div>
      </div>
    </div>
  );
};

export default Menu; 