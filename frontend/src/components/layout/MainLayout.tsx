import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const MainLayout: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="main-content">
        <Header onMenuClick={() => setDrawerOpen((v) => !v)} />
        <main className="page-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
