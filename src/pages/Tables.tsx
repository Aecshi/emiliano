import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import TableGrid from '@/components/tables/TableGrid';

const Tables = () => {
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
          <h1 className="text-2xl font-bold mb-6">Tables</h1>
          <TableGrid />
        </div>
      </div>
    </div>
  );
};

export default Tables; 