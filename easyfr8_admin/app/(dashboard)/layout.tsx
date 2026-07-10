'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '../../context/DataContext';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import Preloader from '../../components/Preloader';
import '../../styles/dashboard.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sessionActive, isLoading } = useData();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileActive, setIsMobileActive] = useState(false);

  useEffect(() => {
    // If auth state is loaded and session is false, redirect to login
    if (!isLoading && !sessionActive) {
      router.push('/login');
    }
  }, [sessionActive, isLoading, router]);

  if (isLoading || !sessionActive) {
    return <Preloader />;
  }

  return (
    <div className="app-container">
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileActive={isMobileActive}
        setIsMobileActive={setIsMobileActive}
      />
      <Header
        isMobileActive={isMobileActive}
        setIsMobileActive={setIsMobileActive}
      />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
