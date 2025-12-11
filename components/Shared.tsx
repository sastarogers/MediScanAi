import React, { useEffect } from 'react';
import { Loader2, X, Plus } from 'lucide-react';

// Enhanced Button with Scale, Shadow, and Ripple effects
export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' }> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) => {
  const baseStyle = "relative px-5 py-3 rounded-2xl font-bold transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 text-sm md:text-base tracking-wide";
  
  const variants = {
    primary: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 border border-transparent",
    secondary: "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5 border border-transparent",
    danger: "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-400 hover:to-rose-400 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:-translate-y-0.5 border border-transparent",
    outline: "bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500",
    ghost: "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className} disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none`} {...props}>
      {children}
    </button>
  );
};

// Card with Glassmorphism and Hover Lift
export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string; onClick?: () => void; style?: React.CSSProperties }> = ({ children, className = '', title, onClick, style }) => (
  <div 
    onClick={onClick}
    style={style}
    className={`glass-panel rounded-3xl p-6 shadow-xl shadow-slate-200/40 dark:shadow-black/20 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/5 dark:hover:shadow-black/40 ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''} ${className}`}
  >
    {title && <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 tracking-tight">{title}</h3>}
    {children}
  </div>
);

// Custom Medical Spinner
export const MedicalSpinner: React.FC<{ className?: string }> = ({ className = "w-12 h-12" }) => (
  <div className={`relative ${className}`}>
    <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-700"></div>
    <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
    </div>
  </div>
);

// Loading Overlay with Backdrop Blur and Scale In
export const LoadingOverlay: React.FC<{ message?: string }> = ({ message = "Analyzing..." }) => (
  <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/80 backdrop-blur-md z-50 flex flex-col items-center justify-center animate-in fade-in duration-300 rounded-3xl">
    <div className="bg-white/80 dark:bg-slate-800/90 p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 flex flex-col items-center animate-in zoom-in-95 duration-300 max-w-xs text-center">
      <MedicalSpinner className="w-16 h-16 mb-6" />
      <p className="text-lg font-bold text-slate-800 dark:text-slate-200 animate-pulse">{message}</p>
      <p className="text-sm text-slate-500 mt-2">Please wait while AI processes your request</p>
    </div>
  </div>
);

// Skeleton Loader
export const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse bg-slate-200/80 dark:bg-slate-700/80 rounded-xl ${className}`} />
);

// Badge with Smooth Colors
export const Badge: React.FC<{ level: string }> = ({ level }) => {
  const colors: Record<string, string> = {
    Low: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 border-green-200 dark:border-green-800",
    Medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
    High: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    Emergency: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 border-red-200 dark:border-red-800 animate-pulse",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${colors[level] || colors.Low}`}>
      {level}
    </span>
  );
};

// Modal with Zoom/Fade Animation
export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{title}</h3>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[75vh]">
          {children}
        </div>
      </div>
    </div>
  );
};

// Toast Notification
export const Toast: React.FC<{ message: string; type?: 'info' | 'success' | 'error'; onClose: () => void }> = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bg = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-slate-800 dark:bg-slate-700';

  return (
    <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl text-white font-medium text-sm flex items-center gap-3 animate-slide-up ${bg} whitespace-nowrap`}>
      {message}
    </div>
  );
};

// Page Transition Wrapper
export const PageTransition: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`animate-slide-up w-full h-full ${className}`}>
    {children}
  </div>
);