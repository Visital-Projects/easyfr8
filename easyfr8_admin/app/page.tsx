'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '../context/DataContext';

export default function Home() {
  const { sessionActive } = useData();
  const router = useRouter();

  useEffect(() => {
    if (sessionActive) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [sessionActive, router]);

  return (
    <div style={{ background: '#0b0f19', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', color: '#fff' }}>
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ marginBottom: '10px' }}>Loading EasyFr8...</h3>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Initializing admin portal templates.</p>
      </div>
    </div>
  );
}
