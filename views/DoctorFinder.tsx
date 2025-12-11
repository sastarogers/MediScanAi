import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MapPin, Search, Star, Navigation, Stethoscope, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Card, PageTransition, LoadingOverlay } from '../components/Shared';
import { findNearbyDoctors } from '../services/geminiService';
import { DoctorListing } from '../types';

interface DoctorFinderProps {
  onBack: () => void;
  language: string;
}

const DoctorFinder: React.FC<DoctorFinderProps> = ({ onBack, language }) => {
  const [specialty, setSpecialty] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<DoctorListing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAllSpecialties, setShowAllSpecialties] = useState(false);
  
  // Track user's exact coordinates for map marker
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);

  // Map References
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null); // Leaflet Map instance
  const markersRef = useRef<any[]>([]); // Array to track markers for cleanup

  // Auto-detect location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserCoords({ lat, lng });
          // Simple reverse geocode approximation or just use coordinates for search text
          setLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        },
        (err) => console.log("Location access denied")
      );
    }
  }, []);

  // Initialize and Update Map using Leaflet (OpenStreetMap)
  useEffect(() => {
    const L = (window as any).L;
    
    // Only initialize if L is loaded and we have a container
    if (L && mapRef.current) {
      // Create Map if it doesn't exist
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapRef.current).setView([userCoords?.lat || 0, userCoords?.lng || 0], 13);
        
        // Add OpenStreetMap Tile Layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapInstanceRef.current);
      }

      // Clear existing markers
      markersRef.current.forEach(marker => mapInstanceRef.current.removeLayer(marker));
      markersRef.current = [];

      const map = mapInstanceRef.current;
      const group = new L.featureGroup();

      // Define Custom Icons using DivIcon for Tailwind styling
      const userIcon = L.divIcon({
        className: 'bg-transparent',
        html: `
          <div class="relative flex items-center justify-center w-6 h-6">
            <div class="absolute w-full h-full bg-blue-500/50 rounded-full animate-ping"></div>
            <div class="relative w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const docIcon = L.divIcon({
        className: 'bg-transparent',
        html: `
          <div class="w-8 h-8 text-red-600 drop-shadow-md transform -translate-x-1/2 -translate-y-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3" fill="white"/>
            </svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32], // Point of the pin
        popupAnchor: [0, -32]
      });

      // 1. Add User Marker
      if (userCoords) {
        const userMarker = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon }).addTo(map);
        userMarker.bindPopup("<b>You are here</b>");
        markersRef.current.push(userMarker);
        group.addLayer(userMarker);
      }

      // 2. Add Doctor Markers
      doctors.forEach(doc => {
        if (doc.lat && doc.lng) {
          const marker = L.marker([doc.lat, doc.lng], { icon: docIcon }).addTo(map);
          
          const popupContent = `
            <div style="font-family: sans-serif; min-width: 160px;">
              <h3 style="font-weight: 700; color: #1e293b; margin-bottom: 2px;">${doc.name}</h3>
              <p style="font-size: 12px; color: #64748b; margin-bottom: 4px;">${doc.address}</p>
              ${doc.rating ? `<div style="display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; color: #d97706;"><span>★</span><span>${doc.rating}</span></div>` : ''}
            </div>
          `;
          
          marker.bindPopup(popupContent);
          markersRef.current.push(marker);
          group.addLayer(marker);
        }
      });

      // Fit bounds if we have points
      if (doctors.length > 0 || userCoords) {
        const bounds = group.getBounds();
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        } else if (userCoords) {
             map.setView([userCoords.lat, userCoords.lng], 13);
        }
      }
      
      // Fix map resize issues (common in SPAs)
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }
  }, [doctors, userCoords]);

  const handleSearch = async () => {
    if (!specialty) return;
    setLoading(true);
    setDoctors([]);
    setError(null);
    
    try {
      const searchLoc = location || "me"; 
      // Pass userCoords to service to enable strict location grounding via Gemini
      const data = await findNearbyDoctors(specialty, searchLoc, language, userCoords || undefined);
      setDoctors(data);
      if (data.length === 0) {
        setError("No doctors found nearby. Please try a different location or term.");
      }
    } catch (e) {
      setError("Failed to fetch doctors. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const allSpecialties = [
    "General Practitioner", "Dentist", "Cardiologist (Heart)", "Pediatrician (Kids)", 
    "Dermatologist (Skin)", "Orthopedic (Bone)", "Gynecologist", "Ophthalmologist (Eye)",
    "ENT Specialist", "Neurologist", "Psychiatrist", "Gastroenterologist",
    "Urologist", "Pulmonologist (Lung)", "Endocrinologist", "Oncologist",
    "Rheumatologist", "Physiotherapist", "Chiropractor", "Allergist",
    "Nephrologist (Kidney)", "Surgeon", "Podiatrist (Foot)", "Urgent Care"
  ];

  const displayedSpecialties = showAllSpecialties ? allSpecialties : allSpecialties.slice(0, 8);

  return (
    <PageTransition className="pb-20">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-2 rounded-2xl border border-white/20">
          <button onClick={onBack} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-colors shadow-sm">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
             <h2 className="text-xl font-bold text-slate-900 dark:text-white">Find a Doctor</h2>
             <p className="text-xs text-slate-500">Powered by Gemini & OpenStreetMap</p>
          </div>
        </div>

        {/* Search Form */}
        <Card className="space-y-4">
           <div>
             <label className="text-sm font-bold text-slate-500 mb-1 block">Specialty or Condition</label>
             <div className="relative">
                <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="e.g. Dentist, Back Pain, Flu, Heart..."
                  className="w-full pl-10 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
             </div>
             {/* Quick Chips */}
             <div className="mt-3">
               <div className="flex flex-wrap gap-2">
                 {displayedSpecialties.map(s => (
                   <button 
                     key={s}
                     onClick={() => setSpecialty(s)}
                     className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${specialty === s ? 'bg-blue-100 border-blue-200 text-blue-700 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}
                   >
                     {s}
                   </button>
                 ))}
               </div>
               <button 
                onClick={() => setShowAllSpecialties(!showAllSpecialties)}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 mt-2 hover:underline ml-1"
               >
                 {showAllSpecialties ? (
                   <>Show Less <ChevronUp className="w-3 h-3" /></>
                 ) : (
                   <>Show All ({allSpecialties.length}) <ChevronDown className="w-3 h-3" /></>
                 )}
               </button>
             </div>
           </div>

           <div>
             <label className="text-sm font-bold text-slate-500 mb-1 block">Location (City or Zip)</label>
             <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Current Location"
                  className="w-full pl-10 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
             </div>
           </div>

           <Button onClick={handleSearch} disabled={!specialty || loading} className="w-full">
             {loading ? 'Searching...' : 'Find Doctors'}
           </Button>
        </Card>

        {/* Results */}
        {(doctors.length > 0 || userCoords || loading) && (
          <div className="animate-slide-up space-y-4">
            <div className="flex items-center justify-between px-2">
               <h3 className="font-bold text-lg text-slate-900 dark:text-white">Results</h3>
            </div>
            
            {/* Map Container */}
            <div className="h-64 w-full rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700 relative z-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
               <div ref={mapRef} className="w-full h-full" style={{ zIndex: 1 }} />
            </div>

            {/* List View */}
            {doctors.map((doc, i) => (
               <Card key={i} className="flex flex-col gap-2 border-l-4 border-blue-500 transition-all hover:scale-[1.02]">
                  <div className="flex justify-between items-start">
                     <h4 className="font-bold text-lg text-blue-700 dark:text-blue-400">{doc.name}</h4>
                     {doc.rating && (
                       <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded-lg shrink-0">
                         <Star className="w-4 h-4 text-yellow-500 fill-current" />
                         <span className="text-xs font-bold text-yellow-700 dark:text-yellow-300">{doc.rating}</span>
                       </div>
                     )}
                  </div>
                  <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300 text-sm mt-1">
                     <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                     <span>{doc.address}</span>
                  </div>
                  {doc.phone && (
                     <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 ml-6">{doc.phone}</p>
                  )}
               </Card>
            ))}
            {doctors.length > 0 && (
                <p className="text-center text-xs text-slate-400 mt-4">
                Results found via Gemini Grounding. Map visualization by OpenStreetMap.
                </p>
            )}
          </div>
        )}
        
        {error && (
           <div className="animate-slide-up bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-xl text-center font-medium">
             {error}
           </div>
        )}

        {!loading && doctors.length === 0 && !error && (
            <div className="text-center text-slate-400 mt-10">
               <Navigation className="w-12 h-12 mx-auto mb-2 opacity-20" />
               <p>Enter a specialty or medical condition to find doctors.</p>
            </div>
        )}
      </div>

      {loading && <LoadingOverlay message="Searching..." />}
    </PageTransition>
  );
};

export default DoctorFinder;