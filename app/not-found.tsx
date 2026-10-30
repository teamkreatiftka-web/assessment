'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import LittleBitePage from '@/app/community/page';
import AdminCommunityDashboardPage from '@/app/admincommunity/page';
import MedicalRecordCalescencePage from '@/app/rm/page';
import AssessmentPage from '@/app/assessment/page';

export default function NotFound() {
  const [matchedRoute, setMatchedRoute] = useState<
    'checking' | 'none' | 'community' | 'admincommunity' | 'rm' | 'assessment'
  >('checking');

  useEffect(() => {
    if (typeof window === 'undefined') {
      setMatchedRoute('none');
      return;
    }

    const cleanPath = window.location.pathname.replace(/\/+$/, '').toLowerCase();

    if (
      cleanPath === '/community' ||
      cleanPath === '/littlebite' ||
      cleanPath.endsWith('/community') ||
      cleanPath.endsWith('/littlebite')
    ) {
      setMatchedRoute('community');
      return;
    }

    if (cleanPath === '/admincommunity' || cleanPath.endsWith('/admincommunity')) {
      setMatchedRoute('admincommunity');
      return;
    }

    if (cleanPath === '/rm' || cleanPath.endsWith('/rm')) {
      setMatchedRoute('rm');
      return;
    }

    if (cleanPath === '/assessment' || cleanPath.endsWith('/assessment')) {
      setMatchedRoute('assessment');
      return;
    }

    setMatchedRoute('none');
  }, []);

  if (matchedRoute === 'community') {
    return <LittleBitePage />;
  }

  if (matchedRoute === 'admincommunity') {
    return <AdminCommunityDashboardPage />;
  }

  if (matchedRoute === 'rm') {
    return <MedicalRecordCalescencePage />;
  }

  if (matchedRoute === 'assessment') {
    return <AssessmentPage />;
  }

  if (matchedRoute === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
        <div className="text-xs font-bold text-slate-500">Memuat halaman...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#F8FAFC] text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-900 text-[#ccff00] font-black text-2xl flex items-center justify-center mb-4">
        404
      </div>
      <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
        Halaman Tidak Ditemukan
      </h2>
      <p className="text-xs sm:text-sm text-slate-600 max-w-sm mb-6">
        Halaman yang Anda cari mungkin telah dipindahkan atau alamat URL tidak sesuai.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-xl">
        <Link
          href="/"
          className="px-5 py-2.5 bg-slate-900 text-[#ccff00] font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors"
        >
          Kembali ke Halaman Utama
        </Link>
      </div>
    </div>
  );
}
