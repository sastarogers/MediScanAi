import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  Pill, 
  Activity, 
  AlertCircle, 
  Moon, 
  Sun, 
  Home as HomeIcon,
  Globe,
  Settings,
  Eye,
  Minimize2,
  Maximize2,
  Shield,
  Download,
  Trash2,
  ChevronDown
} from 'lucide-react';
import { View, HealthRecord, SavedMedication, LANGUAGES, AccessibilityConfig, UserProfile } from './types';
import Home from './views/Home';
import SymptomChecker from './views/SymptomChecker';
import MedicationScanner from './views/MedicationScanner';
import Timeline from './views/Timeline';
import Emergency from './views/Emergency';
import { Button, Modal, Toast } from './components/Shared';
import { t } from './utils/translations';

const DEFAULT_PROFILE: UserProfile = { id: 'main', name: 'Me', type: 'self', avatarColor: 'bg-blue-500' };

const App = () => {
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('en');
  
  // Data State
  const [healthHistory, setHealthHistory] = useState<HealthRecord[]>([]);
  const [savedMedications, setSavedMedications] = useState<SavedMedication[]>([]);
  
  // Profile State
  const [profiles, setProfiles] = useState<UserProfile[]>([DEFAULT_PROFILE]);
  const [activeProfileId, setActiveProfileId] = useState<string>('main');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [newProfile, setNewProfile] = useState<{name: string, type: string, age: string}>({name: '', type: 'child', age: ''});

  // Privacy State
  const [hasConsented, setHasConsented] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(true);

  // Accessibility State
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'data'>('general');
  const [a11yConfig, setA11yConfig] = useState<AccessibilityConfig>({
    fontSize: 'normal',
    highContrast: false,
    simpleMode: false,
    voiceNav: false,
    lowData: false
  });

  // Feedback State
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  // Computed Active Profile
  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];

  // Filter Data for Active Profile
  const filteredHistory = healthHistory.filter(h => h.profileId === activeProfileId);
  const filteredMedications = savedMedications.filter(m => m.profileId === activeProfileId);

  // Initialize Theme
  useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  // SCROLL RESET ON VIEW CHANGE
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentView]);

  // Handle Language Direction (RTL/LTR)
  useEffect(() => {
    const isRTL = ['ar', 'ur'].includes(language);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // Apply Theme & Accessibility Classes
  useEffect(() => {
    const root = document.documentElement;
    
    // Dark Mode
    if (darkMode || a11yConfig.highContrast) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Font Size
    root.classList.remove('text-base', 'text-lg', 'text-xl');
    if (a11yConfig.fontSize === 'normal') root.classList.add('text-base');
    if (a11yConfig.fontSize === 'large') root.classList.add('text-lg');
    if (a11yConfig.fontSize === 'xl') root.classList.add('text-xl');

  }, [darkMode, a11yConfig.highContrast, a11yConfig.fontSize]);

  const addRecord = (record: HealthRecord) => {
    setHealthHistory(prev => [{ ...record, profileId: activeProfileId }, ...prev]);
  };

  const updateRecord = (updatedRecord: HealthRecord) => {
    setHealthHistory(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
  };

  const deleteRecord = (id: string) => {
    setHealthHistory(prev => prev.filter(r => r.id !== id));
  };

  const addMedicationToCabinet = (med: SavedMedication) => {
    setSavedMedications(prev => {
      const filtered = prev.filter(m => !(m.name.toLowerCase() === med.name.toLowerCase() && m.profileId === activeProfileId));
      return [{ ...med, profileId: activeProfileId }, ...filtered];
    });
  };

  const removeMedicationFromCabinet = (id: string) => {
    setSavedMedications(prev => prev.filter(m => m.id !== id));
  };

  const handleAddProfile = () => {
    if (newProfile.name) {
       const id = Date.now().toString();
       const color = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'][profiles.length % 4];
       setProfiles([...profiles, {
         id,
         name: newProfile.name,
         type: newProfile.type as any,
         age: parseInt(newProfile.age) || undefined,
         avatarColor: color
       }]);
       setActiveProfileId(id);
       setNewProfile({name: '', type: 'child', age: ''});
    }
  };

  const handleExportData = () => {
    const exportObj = {
      timestamp: Date.now(),
      profiles,
      healthHistory,
      savedMedications
    };
    const dataStr = JSON.stringify(exportObj, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mediscan_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleClearAllData = () => {
    if (window.confirm("CRITICAL WARNING: This will permanently delete ALL profiles, history, and saved medications. This cannot be undone. Are you sure?")) {
       setHealthHistory([]);
       setSavedMedications([]);
       setProfiles([DEFAULT_PROFILE]);
       setActiveProfileId('main');
       alert("All data has been cleared.");
    }
  };

  const renderView = () => {
    switch (currentView) {
      case View.HOME:
        return <Home onViewChange={setCurrentView} language={language} simpleMode={a11yConfig.simpleMode} />;
      case View.SYMPTOM_CHECKER:
        return <SymptomChecker 
          onBack={() => setCurrentView(View.HOME)} 
          onSaveRecord={addRecord} 
          language={language}
          activeProfile={activeProfile}
        />;
      case View.MEDICATION_SCANNER:
        return <MedicationScanner 
          onBack={() => setCurrentView(View.HOME)} 
          onSaveRecord={addRecord} 
          onSaveToCabinet={addMedicationToCabinet}
          onRemoveFromCabinet={removeMedicationFromCabinet}
          savedMedications={filteredMedications}
          language={language} 
        />;
      case View.TIMELINE:
        return <Timeline 
          onBack={() => setCurrentView(View.HOME)} 
          history={filteredHistory} 
          onUpdateRecord={updateRecord}
          onDeleteRecord={deleteRecord}
          onAddRecord={addRecord}
          language={language} 
        />;
      case View.EMERGENCY:
        return <Emergency onBack={() => setCurrentView(View.HOME)} language={language} />;
      default:
        return <Home onViewChange={setCurrentView} language={language} simpleMode={a11yConfig.simpleMode} />;
    }
  };

  return (
    <>
      {a11yConfig.highContrast && (
        <style>{`
          .dark { background-color: #000000 !important; color: #ffffff !important; }
          .dark .bg-slate-800, .dark .bg-slate-900, .dark .bg-slate-950 { background-color: #000000 !important; border-color: #ffffff !important; }
          .dark button { border: 2px solid #ffffff !important; }
          .dark .text-slate-400, .dark .text-slate-500 { color: #dddddd !important; }
          .dark .text-blue-400 { color: #ffff00 !important; } 
          .dark .bg-blue-600 { background-color: #000000 !important; border: 2px solid #ffff00 !important; color: #ffff00 !important; }
        `}</style>
      )}

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {showPrivacyModal && !hasConsented && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-3xl p-8 shadow-2xl animate-scale-in">
            <div className="flex justify-center mb-6">
               <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                <Shield className="w-12 h-12 text-blue-600" />
               </div>
            </div>
            <h1 className="text-2xl font-bold text-center mb-4 text-slate-900 dark:text-white">Your Privacy Matters</h1>
            <div className="space-y-4 text-slate-600 dark:text-slate-300 mb-8 max-h-64 overflow-y-auto leading-relaxed">
              <p>Welcome to MediScan AI. Before we start, please review our privacy principles:</p>
              <ul className="list-disc pl-5 space-y-2">
                 <li><strong>Local Storage:</strong> Your health history and profiles are stored locally on this device.</li>
                 <li><strong>AI Processing:</strong> We use Google Gemini to analyze symptoms and images. Data is sent securely for processing but is not used to train models without your explicit consent.</li>
                 <li><strong>Not Medical Advice:</strong> This AI is a guidance tool, not a doctor. Always consult professionals for serious concerns.</li>
              </ul>
            </div>
            <Button onClick={() => { setHasConsented(true); setShowPrivacyModal(false); }} className="w-full">
              I Agree & Continue
            </Button>
          </div>
        </div>
      )}

      {/* Main App Container with Animated Background */}
      <div className={`min-h-screen bg-mesh text-slate-900 dark:text-slate-100 transition-colors duration-500 overflow-x-hidden relative`}>
        
        {/* Animated Blobs */}
        {!a11yConfig.simpleMode && (
          <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[100px] animate-blob"></div>
            <div className="absolute top-[40%] right-[-10%] w-[400px] h-[400px] bg-purple-400/20 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '2s' }}></div>
            <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-emerald-400/10 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '4s' }}></div>
          </div>
        )}

        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-white/20 dark:border-slate-800/50 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <button 
              onClick={() => setCurrentView(View.HOME)}
              className="flex items-center gap-2 font-extrabold text-xl text-blue-600 dark:text-blue-400 tracking-tight"
              aria-label="Go to Home"
            >
              <Activity className="w-7 h-7" />
              {!a11yConfig.simpleMode && <span className="hidden sm:inline bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{t('app_name', language)}</span>}
            </button>

            <div className="flex items-center gap-2">
              {/* Profile Menu */}
              <div className="relative">
                 <button 
                    onClick={() => { setIsProfileMenuOpen(!isProfileMenuOpen); setIsLanguageMenuOpen(false); }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/50 dark:bg-slate-800/50 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
                 >
                    <div className={`w-6 h-6 rounded-full ${activeProfile.avatarColor} text-white flex items-center justify-center text-xs font-bold shadow-sm`}>
                       {activeProfile.name.charAt(0)}
                    </div>
                    <span className="text-sm font-semibold max-w-[80px] truncate hidden xs:inline">{activeProfile.name}</span>
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                 </button>
                 
                 {isProfileMenuOpen && (
                    <div className="absolute top-full mt-2 right-0 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                       <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                          <p className="text-xs font-bold text-slate-500 uppercase px-2 mb-2">{t('switch_profile', language)}</p>
                          {profiles.map(p => (
                             <button
                                key={p.id}
                                onClick={() => { setActiveProfileId(p.id); setIsProfileMenuOpen(false); }}
                                className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${activeProfileId === p.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : ''}`}
                             >
                                <div className={`w-8 h-8 rounded-full ${p.avatarColor} text-white flex items-center justify-center text-sm font-bold shadow-sm`}>
                                   {p.name.charAt(0)}
                                </div>
                                <div className="text-left">
                                   <p className="font-bold text-sm">{p.name}</p>
                                   <p className="text-xs text-slate-500 capitalize">{p.type}</p>
                                </div>
                             </button>
                          ))}
                       </div>
                       <div className="p-3 bg-slate-50 dark:bg-slate-900/50">
                          <p className="text-xs font-bold text-slate-500 uppercase mb-2">{t('add_family', language)}</p>
                          <div className="space-y-2">
                             <input 
                               placeholder="Name" 
                               value={newProfile.name}
                               onChange={e => setNewProfile({...newProfile, name: e.target.value})}
                               className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500/50"
                             />
                             <div className="flex gap-2">
                                <select 
                                   value={newProfile.type}
                                   onChange={e => setNewProfile({...newProfile, type: e.target.value})}
                                   className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500/50"
                                >
                                   <option value="child">Child</option>
                                   <option value="spouse">Spouse</option>
                                   <option value="parent">Parent</option>
                                   <option value="other">Other</option>
                                </select>
                                <input 
                                   placeholder="Age" 
                                   value={newProfile.age}
                                   onChange={e => setNewProfile({...newProfile, age: e.target.value})}
                                   className="w-16 px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                             </div>
                             <Button onClick={handleAddProfile} className="w-full py-1.5 text-sm" disabled={!newProfile.name}>Add</Button>
                          </div>
                       </div>
                    </div>
                 )}
              </div>

              {/* Language Menu */}
              <div className="relative">
                <button 
                  onClick={() => { setIsLanguageMenuOpen(!isLanguageMenuOpen); setIsProfileMenuOpen(false); }}
                  className={`p-2 rounded-full transition-colors ${isLanguageMenuOpen ? 'bg-blue-100 dark:bg-slate-700 text-blue-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                  aria-label="Language"
                >
                  <Globe className="w-5 h-5" />
                </button>
                {isLanguageMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 max-h-80 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => { setLanguage(lang.code); setIsLanguageMenuOpen(false); }}
                        className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${language === lang.code ? 'text-blue-600 font-bold bg-blue-50 dark:bg-blue-900/20' : ''}`}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button 
                onClick={() => setSettingsOpen(true)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content with Mobile Nav Buffer */}
        <main className={`max-w-4xl mx-auto px-4 py-6 min-h-[calc(100vh-4rem)] pb-24 md:pb-6 ${a11yConfig.fontSize === 'xl' ? 'space-y-8' : ''}`}>
          {renderView()}
        </main>
        
        {/* Navigation Bar (Mobile Sticky) */}
        {!a11yConfig.simpleMode && (
          <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200/50 dark:border-slate-800 md:hidden pb-safe z-30 h-16 flex items-center justify-around">
            <button onClick={() => setCurrentView(View.HOME)} className={`flex flex-col items-center gap-1 transition-colors ${currentView === View.HOME ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
              <HomeIcon className={`w-6 h-6 ${currentView === View.HOME ? 'fill-current opacity-20' : ''}`} />
              <span className="text-[10px] font-medium">{t('home', language)}</span>
            </button>
            <button onClick={() => setCurrentView(View.SYMPTOM_CHECKER)} className={`flex flex-col items-center gap-1 transition-colors ${currentView === View.SYMPTOM_CHECKER ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
              <Stethoscope className={`w-6 h-6 ${currentView === View.SYMPTOM_CHECKER ? 'fill-current opacity-20' : ''}`} />
              <span className="text-[10px] font-medium">{t('check', language)}</span>
            </button>
            <button onClick={() => setCurrentView(View.MEDICATION_SCANNER)} className={`flex flex-col items-center gap-1 transition-colors ${currentView === View.MEDICATION_SCANNER ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
              <Pill className={`w-6 h-6 ${currentView === View.MEDICATION_SCANNER ? 'fill-current opacity-20' : ''}`} />
              <span className="text-[10px] font-medium">{t('meds', language)}</span>
            </button>
            <button onClick={() => setCurrentView(View.TIMELINE)} className={`flex flex-col items-center gap-1 transition-colors ${currentView === View.TIMELINE ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
              <Activity className={`w-6 h-6 ${currentView === View.TIMELINE ? 'fill-current opacity-20' : ''}`} />
              <span className="text-[10px] font-medium">{t('history', language)}</span>
            </button>
          </nav>
        )}

        <Modal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} title={t('settings', language)}>
           <div className="flex mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button onClick={() => setSettingsTab('general')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${settingsTab === 'general' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}>{t('general', language)}</button>
              <button onClick={() => setSettingsTab('data')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${settingsTab === 'data' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}>{t('data_privacy', language)}</button>
           </div>
           
           <div className="space-y-6">
              {settingsTab === 'general' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                     <button onClick={() => setDarkMode(!darkMode)} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all active:scale-95 ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
                        {darkMode ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                        <span className="font-medium">{darkMode ? t('light_mode', language) : t('dark_mode', language)}</span>
                     </button>
                     <button onClick={() => setA11yConfig({...a11yConfig, highContrast: !a11yConfig.highContrast})} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all active:scale-95 ${a11yConfig.highContrast ? 'bg-black text-yellow-400 border-yellow-400' : 'bg-white border-slate-200 text-slate-800'}`}>
                        <Eye className="w-6 h-6" />
                        <span className="font-medium">{t('high_contrast', language)}</span>
                     </button>
                  </div>
                  <div>
                     <label className="block text-sm font-bold mb-2">Text Size</label>
                     <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                        <button onClick={() => setA11yConfig({...a11yConfig, fontSize: 'normal'})} className={`flex-1 py-2 rounded-lg transition-all ${a11yConfig.fontSize === 'normal' ? 'bg-white dark:bg-slate-700 shadow-sm font-bold' : ''}`}>Aa</button>
                        <button onClick={() => setA11yConfig({...a11yConfig, fontSize: 'large'})} className={`flex-1 py-2 rounded-lg text-lg transition-all ${a11yConfig.fontSize === 'large' ? 'bg-white dark:bg-slate-700 shadow-sm font-bold' : ''}`}>Aa</button>
                        <button onClick={() => setA11yConfig({...a11yConfig, fontSize: 'xl'})} className={`flex-1 py-2 rounded-lg text-xl font-bold transition-all ${a11yConfig.fontSize === 'xl' ? 'bg-white dark:bg-slate-700 shadow-sm font-bold' : ''}`}>Aa</button>
                     </div>
                  </div>
                  <div className="space-y-3">
                     <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl">
                        <div className="flex items-center gap-3"><Minimize2 className="w-5 h-5 text-blue-500" /><div><p className="font-bold">{t('simple_mode', language)}</p></div></div>
                        <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={a11yConfig.simpleMode} onChange={() => setA11yConfig({...a11yConfig, simpleMode: !a11yConfig.simpleMode})} /><div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"></div></label>
                     </div>
                     <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl">
                        <div className="flex items-center gap-3"><Maximize2 className="w-5 h-5 text-blue-500" /><div><p className="font-bold">{t('low_data', language)}</p></div></div>
                        <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={a11yConfig.lowData} onChange={() => setA11yConfig({...a11yConfig, lowData: !a11yConfig.lowData})} /><div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"></div></label>
                     </div>
                  </div>
                </>
              )}
              {settingsTab === 'data' && (
                <div className="space-y-4">
                   <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-800">
                      <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2">Data Control</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-200 mb-4">You are in full control. All data is stored locally on this device.</p>
                      <Button onClick={handleExportData} className="w-full mb-3 bg-blue-600 hover:bg-blue-700"><Download className="w-4 h-4" /> {t('export_data', language)}</Button>
                   </div>
                   <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-2xl border border-red-100 dark:border-red-800">
                      <h4 className="font-bold text-red-800 dark:text-red-300 mb-2">Danger Zone</h4>
                      <p className="text-sm text-red-700 dark:text-red-200 mb-4">Once you delete your data, there is no going back.</p>
                      <Button onClick={handleClearAllData} variant="danger" className="w-full"><Trash2 className="w-4 h-4" /> {t('delete_data', language)}</Button>
                   </div>
                </div>
              )}
              <Button onClick={() => setSettingsOpen(false)} className="w-full" variant="outline">{t('close', language)}</Button>
           </div>
        </Modal>
      </div>
    </>
  );
};

export default App;