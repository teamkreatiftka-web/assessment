'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { LittleBiteScreeningForm } from '@/components/LittleBiteScreeningForm';
import { ArrowLeft, Stethoscope, ClipboardList, CheckCircle2, Sparkles } from 'lucide-react';

export default function LittleBitePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Navbar />

      <section className="bg-white border-b border-slate-200 py-6 sm:py-9">
        <div className="max-w-4xl mx-auto px-3 sm:px-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Halaman Utama</span>
            </Link>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 text-[#ccff00] text-[11px] sm:text-xs font-black uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3 text-[#ccff00]" />
              <span>Asesmen 10 Bagian + Evaluasi Feeding Rules (R1–R11)</span>
            </div>

            <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight text-balance">
              Asesmen Masalah Makan, Tumbuh Kembang &amp; Feeding Rules Anak
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
              Instrumen klinis lengkap untuk menganalisis <strong>Food Repertoire</strong>, adaptasi tekstur oral-motor, <strong>24-Hour Food Recall</strong>, kurva pertumbuhan berat badan, serta evaluasi <strong>11 Aturan Makan (Feeding Rules R1–R11)</strong> anak usia 0–5 tahun.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5 text-slate-900" />
                <span>10 Bagian Asesmen + Tambahan Feeding Rules</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
                <span>3 Pertanyaan Prioritas untuk Dokter</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Hasil Evaluasi R1–R11 Langsung Muncul</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1 pb-16">
        <LittleBiteScreeningForm />
      </main>

      <Footer />
    </div>
  );
}
