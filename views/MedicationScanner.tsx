import React, { useState, useRef, useEffect } from 'react';
import { Camera, AlertTriangle, CheckCircle, Clock, ArrowLeft, UploadCloud, Pill, Info, ShieldAlert, Trash2, Database, Heart, Stethoscope } from 'lucide-react';
import { Button, Card, LoadingOverlay, Badge, Modal, PageTransition, Skeleton } from '../components/Shared';
import { scanMedication, fileToBase64 } from '../services/geminiService';
import { HealthRecord, MedicationResponse, SavedMedication, TriageLevel } from '../types';
import { t } from '../utils/translations';

interface MedicationScannerProps {
  onBack: () => void;
  onSaveRecord: (record: HealthRecord) => void;
  onSaveToCabinet: (med: SavedMedication) => void;
  onRemoveFromCabinet: (id: string) => void;
  savedMedications: SavedMedication[];
  language: string;
}

const MedicationScanner: React.FC<MedicationScannerProps> = ({ 
  onBack, 
  onSaveRecord, 
  onSaveToCabinet,
  onRemoveFromCabinet,
  savedMedications, 
  language 
}) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'cabinet'>('scan');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MedicationResponse | null>(null);
  
  // We use two states: one for the raw base64 (for API/Saving) and one for Preview (for display)
  const [scannedImageBase64, setScannedImageBase64] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [selectedMed, setSelectedMed] = useState<SavedMedication | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Create immediate preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setLoading(true);

      try {
        const base64 = await fileToBase64(file);
        setScannedImageBase64(base64);
        
        const existingMedsNames = savedMedications.map(m => `${m.name} (${m.dosage})`);
        const medData = await scanMedication(base64, existingMedsNames, language);
        setResult(medData);
      } catch (err) {
        console.error("Scan failed:", err);
        alert("We couldn't analyze that image.");
        setResult(null);
        setScannedImageBase64(null);
        setPreviewUrl(null);
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleDiscard = () => {
    setResult(null);
    setScannedImageBase64(null);
    setPreviewUrl(null);
  };

  const handleSave = () => {
    if (result && scannedImageBase64) {
      const savedMed: SavedMedication = {
        ...result,
        id: Date.now().toString(),
        profileId: '',
        dateAdded: Date.now(),
        image: scannedImageBase64
      };
      onSaveToCabinet(savedMed);
      onSaveRecord({
        id: Date.now().toString(),
        profileId: '',
        date: Date.now(),
        type: 'medication',
        summary: result.name,
        details: `**Dosage:** ${result.dosage}\n**Usage:** ${result.usageInstructions}\n**Warnings:** ${result.warnings.join(', ')}`,
        confidence: result.confidence,
        attachments: [scannedImageBase64],
        triageLevel: result.interactionsWithList.some(i => i.severity === 'Major' || i.severity === 'Contraindicated') ? TriageLevel.HIGH : TriageLevel.LOW
      });
      setActiveTab('cabinet');
      handleDiscard();
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6 pb-24">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><ArrowLeft className="w-6 h-6" /></button>
            <h2 className="text-2xl font-bold">{t('med_scanner', language)}</h2>
          </div>
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shadow-inner">
            <button onClick={() => setActiveTab('scan')} className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${activeTab === 'scan' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-slate-500'}`}>{t('scan_new', language)}</button>
            <button onClick={() => setActiveTab('cabinet')} className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${activeTab === 'cabinet' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-slate-500'}`}>{t('my_cabinet', language)} ({savedMedications.length})</button>
          </div>
        </div>

        {activeTab === 'scan' && (
          <div className="animate-slide-up duration-300">
            {!result && !loading && (
              <Card className="text-center py-12 border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:border-blue-400 transition-colors cursor-pointer group">
                <div className="max-w-xs mx-auto space-y-6">
                  <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-sm"><Camera className="w-12 h-12 text-emerald-600 dark:text-emerald-400" /></div>
                  <h3 className="text-xl font-semibold">Scan Pill or Bottle</h3>
                  <div onClick={() => fileInputRef.current?.click()} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"><UploadCloud className="w-5 h-5" /> {t('upload_photo', language)}</div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </div>
              </Card>
            )}

            {loading && <LoadingOverlay message="Analyzing Medication..." />}

            {result && (
              <div className="space-y-6 animate-fade-in">
                {/* Result Header & Image */}
                <div className="relative h-64 w-full rounded-3xl overflow-hidden shadow-xl bg-slate-900 border border-slate-700 group">
                   {/* Image Layer - z-0 */}
                   {previewUrl ? (
                     <img 
                       src={previewUrl} 
                       className="absolute inset-0 w-full h-full object-cover z-0" 
                       alt="Scanned Medication" 
                     />
                   ) : (
                     <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-slate-500 z-0">
                       <Camera className="w-12 h-12" />
                     </div>
                   )}
                   
                   {/* Gradient Overlay - z-10 */}
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10"></div>
                   
                   {/* Content Layer - z-20 */}
                   <div className="absolute bottom-0 left-0 right-0 p-6 text-white z-20">
                      <div className="flex items-end justify-between">
                         <div>
                            <h1 className="text-3xl font-extrabold mb-1 leading-tight drop-shadow-md">{result.name}</h1>
                            <p className="text-slate-200 font-medium text-lg drop-shadow-sm">{result.genericName}</p>
                         </div>
                         <Badge level={result.isExpired ? 'Emergency' : 'Low'} />
                      </div>
                   </div>
                </div>

                {/* Interactions Alert */}
                {result.interactionsWithList.length > 0 && (
                  <div className="space-y-3">
                    {result.interactionsWithList.map((inter, i) => (
                      <Card key={i} className="border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-900/20">
                        <div className="flex items-start gap-3">
                          <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
                          <div>
                            <h4 className="font-bold text-amber-800 dark:text-amber-200">Interaction: {inter.drugName}</h4>
                            <p className="text-sm text-amber-700 dark:text-amber-300">{inter.description}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <Card className="border-l-4 border-emerald-500">
                     <div className="flex items-center gap-3 mb-3 text-emerald-700 dark:text-emerald-400 font-semibold"><Clock className="w-5 h-5" /> Usage</div>
                     <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">{result.dosage}</p>
                     <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{result.usageInstructions}</p>
                   </Card>
                   <Card className="border-l-4 border-blue-500">
                     <div className="flex items-center gap-3 mb-3 text-blue-700 dark:text-blue-400 font-semibold"><Info className="w-5 h-5" /> Side Effects</div>
                     <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{result.sideEffects.common.join(', ')}</p>
                   </Card>
                </div>

                <div className="flex gap-3 pt-4 pb-4">
                  <Button onClick={handleDiscard} variant="outline" className="flex-1">{t('discard', language)}</Button>
                  <Button onClick={handleSave} className="flex-1">{t('save', language)}</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'cabinet' && (
          <div className="animate-slide-up duration-300">
            {savedMedications.length === 0 ? (
              <div className="text-center py-20 text-slate-400 flex flex-col items-center">
                <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-4">
                  <Pill className="w-12 h-12 opacity-30" />
                </div>
                <p>Your cabinet is empty.</p>
                <Button onClick={() => setActiveTab('scan')} variant="outline" className="mt-4">Scan Medication</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {savedMedications.map((med) => (
                  <div key={med.id} onClick={() => setSelectedMed(med)} className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-700 flex h-32 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all active:scale-95 group">
                    <div className="w-32 h-32 bg-slate-100 dark:bg-slate-700 flex-shrink-0 relative overflow-hidden">
                      {med.image ? (
                        <img 
                          src={`data:image/jpeg;base64,${med.image}`} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                          alt={med.name}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400"><Pill className="w-8 h-8" /></div>
                      )}
                    </div>
                    <div className="p-4 flex flex-col justify-center min-w-0 flex-1">
                       <h3 className="font-bold text-slate-900 dark:text-white truncate">{med.name}</h3>
                       <p className="text-sm text-slate-500 truncate">{med.dosage}</p>
                       <span className="text-xs text-blue-500 mt-2 font-medium">View Details</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <Modal isOpen={!!selectedMed} onClose={() => setSelectedMed(null)} title={selectedMed?.name || ''}>
          {selectedMed && (
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden h-64 w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-inner relative flex items-center justify-center">
                 {selectedMed.image ? (
                    <img 
                        src={`data:image/jpeg;base64,${selectedMed.image}`} 
                        className="w-full h-full object-contain" 
                        alt={selectedMed.name} 
                    />
                 ) : (
                    <Pill className="w-16 h-16 text-slate-300" />
                 )}
              </div>
              <div className="space-y-4">
                 <div>
                    <h4 className="font-bold text-sm text-slate-500 uppercase mb-1">Usage</h4>
                    <p className="text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg text-sm leading-relaxed">{selectedMed.usageInstructions}</p>
                 </div>
                 <div>
                    <h4 className="font-bold text-sm text-slate-500 uppercase mb-1">Dosage</h4>
                    <p className="text-slate-800 dark:text-slate-200 font-medium">{selectedMed.dosage}</p>
                 </div>
              </div>
              <Button variant="danger" className="w-full gap-2 mt-4" onClick={() => { onRemoveFromCabinet(selectedMed.id); setSelectedMed(null); }}>
                <Trash2 className="w-4 h-4" /> Remove from Cabinet
              </Button>
            </div>
          )}
        </Modal>
      </div>
    </PageTransition>
  );
};

export default MedicationScanner;