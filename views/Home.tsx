import React from 'react';
import { View } from '../types';
import { Stethoscope, Pill, Activity, AlertCircle, ShieldCheck, ChevronRight, Zap, MapPin } from 'lucide-react';
import { Card, PageTransition } from '../components/Shared';
import { t } from '../utils/translations';

interface HomeProps {
  onViewChange: (view: View) => void;
  language: string;
  simpleMode?: boolean;
}

const Home: React.FC<HomeProps> = ({ onViewChange, language, simpleMode }) => {
  
  if (simpleMode) {
    return (
      <PageTransition>
        <div className="space-y-6 pb-20">
          <div className="text-center py-6 animate-fade-in">
            <h1 className="text-4xl font-extrabold text-blue-900 dark:text-blue-100 mb-2 tracking-tight">{t('app_name', language)}</h1>
            <p className="text-xl text-slate-600 dark:text-slate-400">{t('welcome_msg', language)}</p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <button 
              onClick={() => onViewChange(View.SYMPTOM_CHECKER)}
              className="flex items-center gap-6 p-6 rounded-3xl bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800 active:scale-95 transition-all hover:shadow-xl hover:border-blue-400"
            >
              <div className="bg-blue-600 text-white p-5 rounded-2xl shadow-lg shadow-blue-500/30">
                 <Stethoscope className="w-10 h-10" />
              </div>
              <div className="text-left">
                 <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('symptom_checker', language)}</h2>
                 <p className="text-lg text-slate-500 dark:text-slate-400">{t('symptom_desc', language)}</p>
              </div>
            </button>

            <button 
              onClick={() => onViewChange(View.MEDICATION_SCANNER)}
              className="flex items-center gap-6 p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-900/30 border-2 border-emerald-200 dark:border-emerald-800 active:scale-95 transition-all hover:shadow-xl hover:border-emerald-400"
            >
              <div className="bg-emerald-600 text-white p-5 rounded-2xl shadow-lg shadow-emerald-500/30">
                 <Pill className="w-10 h-10" />
              </div>
              <div className="text-left">
                 <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('med_scanner', language)}</h2>
                 <p className="text-lg text-slate-500 dark:text-slate-400">{t('med_desc', language)}</p>
              </div>
            </button>

            <button 
              onClick={() => onViewChange(View.EMERGENCY)}
              className="flex items-center gap-6 p-6 rounded-3xl bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 active:scale-95 transition-all hover:shadow-xl hover:border-red-400"
            >
              <div className="bg-red-600 text-white p-5 rounded-2xl shadow-lg shadow-red-500/30 animate-pulse">
                 <AlertCircle className="w-10 h-10" />
              </div>
              <div className="text-left">
                 <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('emergency', language)}</h2>
                 <p className="text-lg text-slate-500 dark:text-slate-400">{t('emergency_desc', language)}</p>
              </div>
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  // Standard Mode
  return (
    <PageTransition>
      <div className="space-y-8 pb-24">
        {/* Hero Section */}
        <div className="text-center py-10 space-y-4 animate-fade-in relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full pointer-events-none"></div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs font-bold uppercase tracking-wider border border-blue-100 dark:border-blue-800 mb-2">
            <Zap className="w-3 h-3" /> Powered by Gemini 3 Pro
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
            <span className="text-gradient">MediScan AI</span>
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed font-medium">
            {t('welcome_msg', language)}
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Symptom Checker */}
          <button 
            onClick={() => onViewChange(View.SYMPTOM_CHECKER)}
            className="group relative overflow-hidden bg-white dark:bg-slate-800 p-8 rounded-[2rem] text-left transition-all duration-300 shadow-xl shadow-slate-200/50 dark:shadow-black/20 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-1 animate-slide-up border border-slate-100 dark:border-slate-700"
            style={{ animationDelay: '0ms' }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                <Stethoscope className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('symptom_checker', language)}</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-4 pr-4">{t('symptom_desc', language)}</p>
              <div className="flex items-center text-blue-600 font-bold text-sm group-hover:translate-x-2 transition-transform">
                Start Check <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </button>

          {/* Medication Scanner */}
          <button 
            onClick={() => onViewChange(View.MEDICATION_SCANNER)}
            className="group relative overflow-hidden bg-white dark:bg-slate-800 p-8 rounded-[2rem] text-left transition-all duration-300 shadow-xl shadow-slate-200/50 dark:shadow-black/20 hover:shadow-2xl hover:shadow-emerald-500/20 hover:-translate-y-1 animate-slide-up border border-slate-100 dark:border-slate-700"
            style={{ animationDelay: '100ms' }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                <Pill className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('med_scanner', language)}</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-4 pr-4">{t('med_desc', language)}</p>
              <div className="flex items-center text-emerald-600 font-bold text-sm group-hover:translate-x-2 transition-transform">
                Scan Now <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </button>

          {/* Find Doctor (New) */}
          <button 
            onClick={() => onViewChange(View.FIND_DOCTOR)}
            className="group relative overflow-hidden bg-white dark:bg-slate-800 p-8 rounded-[2rem] text-left transition-all duration-300 shadow-xl shadow-slate-200/50 dark:shadow-black/20 hover:shadow-2xl hover:shadow-cyan-500/20 hover:-translate-y-1 animate-slide-up border border-slate-100 dark:border-slate-700"
            style={{ animationDelay: '150ms' }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform duration-300">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Find Doctor</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-4 pr-4">Locate specialists nearby using Google Maps.</p>
              <div className="flex items-center text-cyan-600 font-bold text-sm group-hover:translate-x-2 transition-transform">
                Search Map <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </button>

          {/* Timeline */}
          <button 
            onClick={() => onViewChange(View.TIMELINE)}
            className="group relative overflow-hidden bg-white dark:bg-slate-800 p-8 rounded-[2rem] text-left transition-all duration-300 shadow-xl shadow-slate-200/50 dark:shadow-black/20 hover:shadow-2xl hover:shadow-violet-500/20 hover:-translate-y-1 animate-slide-up border border-slate-100 dark:border-slate-700"
            style={{ animationDelay: '200ms' }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/30 group-hover:scale-110 transition-transform duration-300">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('timeline', language)}</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-4 pr-4">{t('timeline_desc', language)}</p>
              <div className="flex items-center text-violet-600 font-bold text-sm group-hover:translate-x-2 transition-transform">
                View History <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </button>

          {/* Emergency */}
          <button 
            onClick={() => onViewChange(View.EMERGENCY)}
            className="group relative overflow-hidden bg-white dark:bg-slate-800 p-8 rounded-[2rem] text-left transition-all duration-300 shadow-xl shadow-slate-200/50 dark:shadow-black/20 hover:shadow-2xl hover:shadow-red-500/20 hover:-translate-y-1 animate-slide-up border border-slate-100 dark:border-slate-700"
            style={{ animationDelay: '300ms' }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center mb-6 shadow-lg shadow-red-500/30 group-hover:scale-110 transition-transform duration-300 animate-pulse-slow">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('emergency', language)}</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-4 pr-4">{t('emergency_desc', language)}</p>
              <div className="flex items-center text-red-600 font-bold text-sm group-hover:translate-x-2 transition-transform">
                Get Help <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </button>
        </div>

        <Card className="mt-8 border-l-4 border-blue-500 animate-fade-in bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm" style={{ animationDelay: '400ms' }}>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
               <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              <p className="font-bold text-base mb-1 text-slate-900 dark:text-slate-200">{t('disclaimer_title', language)}</p>
              {t('disclaimer_text', language)}
            </div>
          </div>
        </Card>
      </div>
    </PageTransition>
  );
};

export default Home;
