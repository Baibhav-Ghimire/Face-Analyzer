import React, { useState, useEffect } from 'react';
import { 
  Scan, 
  History,
  Settings, 
  Sparkles, 
  ShieldCheck, 
  BarChart3, 
  Zap,
  ChevronRight,
  LogOut,
  User as UserIcon,
  Bell,
  Search,
  Camera,
  Upload,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import FaceAnalyzer from './components/FaceAnalyzer';
import LiveFaceAnalyzer from './components/LiveFaceAnalyzer';
import HistoryView from './components/HistoryView';
import { analyzeFaceWithAI, FacialAnalysis } from './services/geminiService';
import { cn } from './lib/utils';
import { useAuth } from './lib/AuthContext';
import { ProtectedRoute } from './lib/ProtectedRoute';
import { db, auth, handleFirestoreError, OperationType } from './lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function App() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}

function Dashboard() {
  const { user, logout } = useAuth();
  const [analysisData, setAnalysisData] = useState<FacialAnalysis | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentLandmarks, setCurrentLandmarks] = useState<any[]>([]);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'analyze' | 'history'>('analyze');
  const [analysisMode, setAnalysisMode] = useState<'upload' | 'live'>('upload');

  const handleAnalysisComplete = (result: any, imageBase64: string) => {
    setCurrentImage(imageBase64);
    setCurrentLandmarks(result.faceLandmarks[0]);
  };

  const handleLiveCapture = (imageBase64: string, landmarks: any[]) => {
    setCurrentImage(imageBase64);
    setCurrentLandmarks(landmarks);
    setAnalysisMode('upload'); // Switch to upload view to show the captured image
  };

  const runAiAnalysis = async () => {
    if (!currentImage || !user) return;
    setIsAiAnalyzing(true);
    try {
      const data = await analyzeFaceWithAI(currentImage, currentLandmarks);
      setAnalysisData(data);
      
      // Persist to Firestore
      await addDoc(collection(db, 'analyses'), {
        userId: user.uid,
        name: `Analysis - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        imageBase64: currentImage,
        landmarks: currentLandmarks,
        analysisResult: data,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("AI Analysis failed:", err);
      handleFirestoreError(err, OperationType.WRITE, 'analyses');
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleSelectHistory = (record: any) => {
    setCurrentImage(record.imageBase64);
    setAnalysisData(record.analysisResult);
    setCurrentLandmarks(record.landmarks);
    setAnalysisMode('upload');
    setActiveTab('analyze');
  };

  const resetAnalysis = () => {
    setCurrentImage(null);
    setAnalysisData(null);
    setCurrentLandmarks([]);
  };

  return (
    <div className="min-h-screen bg-[#fcfcfd]">
      {/* Sidebar Navigation */}
      <aside className="fixed left-0 top-0 bottom-0 w-20 md:w-64 bg-white border-r border-gray-100 z-50 hidden sm:flex flex-col shadow-sm">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <Scan className="w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight hidden md:block text-gray-900">Facial Studio</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <NavItem 
            icon={<Scan />} 
            label="Analyze" 
            active={activeTab === 'analyze'} 
            onClick={() => setActiveTab('analyze')} 
          />
          <NavItem 
            icon={<History />} 
            label="History" 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
          />
        </nav>

        <div className="p-4 mt-auto space-y-4">
          <div className="bg-gray-50 rounded-2xl p-4 hidden md:block">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Pro Plan</span>
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Unlock advanced cephalometric measurements and 4K exports.
            </p>
          </div>
          
          <div className="flex items-center gap-3 p-2 md:p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <UserIcon className="w-5 h-5" />
                </div>
              )}
            </div>
            <div className="hidden md:block flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{user?.displayName || 'User'}</p>
              <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
            </div>
            <button 
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="sm:ml-20 md:ml-64 p-4 md:p-8 lg:p-12">
        {/* Top Header */}
        <div className="max-w-6xl mx-auto mb-12 flex items-center justify-end">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-900">{user?.displayName}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Active Session</p>
              </div>
            </div>
          </div>
        </div>

        <header className="max-w-6xl mx-auto mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-2">
              <Sparkles className="w-4 h-4" />
              <span>{activeTab === 'analyze' ? 'Professional Analysis' : 'Analysis History'}</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
              {activeTab === 'analyze' ? 'Facial Landmark Studio' : 'Your Analysis Reports'}
            </h1>
            <p className="text-gray-500 mt-2 max-w-xl">
              {activeTab === 'analyze' 
                ? 'Upload a portrait or use your live camera to generate a precise 468-point landmark mesh and comprehensive aesthetic report.'
                : 'Review and manage your past facial analysis reports and measurements.'}
            </p>
          </div>
          
          {activeTab === 'analyze' && currentImage && !analysisData && (
            <div className="flex items-center gap-4">
              <button
                onClick={resetAnalysis}
                className="px-6 py-4 rounded-2xl bg-white border border-gray-100 text-gray-500 font-semibold hover:bg-gray-50 transition-all shadow-sm"
              >
                Reset
              </button>
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={runAiAnalysis}
                disabled={isAiAnalyzing}
                className={cn(
                  "px-8 py-4 rounded-2xl bg-gray-900 text-white font-semibold flex items-center gap-3 shadow-xl",
                  "transition-all hover:bg-black hover:scale-105 active:scale-95 disabled:opacity-50",
                  "shadow-gray-200"
                )}
              >
                {isAiAnalyzing ? (
                  <Zap className="w-5 h-5 animate-pulse text-yellow-400" />
                ) : (
                  <Sparkles className="w-5 h-5 text-blue-400" />
                )}
                {isAiAnalyzing ? "Analyzing Features..." : "Run AI Analysis"}
              </motion.button>
            </div>
          )}

          {activeTab === 'analyze' && analysisData && (
            <button
              onClick={resetAnalysis}
              className="px-8 py-4 rounded-2xl bg-white border border-gray-100 text-gray-900 font-semibold flex items-center gap-3 shadow-xl shadow-gray-100 hover:bg-gray-50 transition-all"
            >
              <RefreshCw className="w-5 h-5 text-blue-500" />
              New Analysis
            </button>
          )}

          {activeTab === 'history' && (
            <button
              onClick={() => {
                resetAnalysis();
                setActiveTab('analyze');
              }}
              className="px-8 py-4 rounded-2xl bg-blue-600 text-white font-semibold flex items-center gap-3 shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
            >
              <Scan className="w-5 h-5" />
              New Analysis
            </button>
          )}
        </header>

        <div className="max-w-6xl mx-auto">
          {activeTab === 'analyze' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Analysis Viewport */}
              <div className={cn(
                "lg:col-span-7 space-y-8",
                analysisData ? "lg:col-span-6" : "lg:col-span-12"
              )}>
                
                {!currentImage && (
                  <div className="flex p-1 bg-gray-100 rounded-2xl w-fit mb-6">
                    <button
                      onClick={() => setAnalysisMode('upload')}
                      className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                        analysisMode === 'upload' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                      )}
                    >
                      <Upload className="w-4 h-4" /> Upload
                    </button>
                    <button
                      onClick={() => setAnalysisMode('live')}
                      className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                        analysisMode === 'live' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                      )}
                    >
                      <Camera className="w-4 h-4" /> Live Camera
                    </button>
                  </div>
                )}

                {analysisMode === 'upload' ? (
                  <FaceAnalyzer onAnalysisComplete={handleAnalysisComplete} />
                ) : (
                  <LiveFaceAnalyzer onCapture={handleLiveCapture} />
                )}
                
                {!currentImage && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FeatureCard 
                      icon={<BarChart3 className="text-blue-500" />}
                      title="Cephalometrics"
                      desc="Precise facial indices and mandibular angles."
                    />
                    <FeatureCard 
                      icon={<Zap className="text-yellow-500" />}
                      title="Real-time Mesh"
                      desc="468-point tracking via MediaPipe WASM."
                    />
                    <FeatureCard 
                      icon={<Sparkles className="text-purple-500" />}
                      title="AI Aesthetic"
                      desc="Deep feature analysis using Gemini Vision."
                    />
                  </div>
                )}
              </div>

              {/* Results Sidebar */}
              <AnimatePresence>
                {analysisData && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-6 space-y-6"
                  >
                    {/* Score Header */}
                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg text-gray-900">Analysis Summary</h3>
                        <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">
                          Verified
                        </div>
                      </div>
                      
                      <div className="flex items-end gap-4 mb-8">
                        <span className="text-6xl font-bold text-gray-900 tracking-tighter">
                          {analysisData.overallScore}
                        </span>
                        <div className="mb-2">
                          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Overall Score</div>
                          <div className="text-sm font-medium text-green-600 flex items-center gap-1">
                            Top 5% of dataset <ChevronRight className="w-3 h-3" />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <StatBox label="Symmetry" value={`${analysisData.symmetry.score}%`} />
                        <StatBox label="Skin Clarity" value={`${analysisData.skinHealth.clarity}%`} />
                      </div>
                    </div>

                    {/* Detailed Features */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FeatureRating 
                        label="Eyes" 
                        rating={analysisData.features.eyes.rating} 
                        desc={analysisData.features.eyes.description} 
                      />
                      <FeatureRating 
                        label="Nose" 
                        rating={analysisData.features.nose.rating} 
                        desc={analysisData.features.nose.description} 
                      />
                      <FeatureRating 
                        label="Jawline" 
                        rating={analysisData.features.jawline.rating} 
                        desc={analysisData.features.jawline.description} 
                      />
                      <FeatureRating 
                        label="Lips" 
                        rating={analysisData.features.lips.rating} 
                        desc={analysisData.features.lips.description} 
                      />
                    </div>

                    {/* Recommendations */}
                    <div className="bg-gray-900 text-white rounded-3xl p-8 shadow-xl shadow-gray-200">
                      <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-400" />
                        Clinical Recommendations
                      </h4>
                      <ul className="space-y-3">
                        {analysisData.recommendations.map((rec, i) => (
                          <li key={i} className="flex gap-3 text-sm text-gray-300 leading-relaxed">
                            <div className="w-5 h-5 rounded-full bg-white/10 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-blue-400">
                              {i + 1}
                            </div>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <HistoryView onSelect={handleSelectHistory} />
          )}
        </div>
      </main>

      {/* Mobile Nav */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 flex items-center justify-around sm:hidden z-50">
        <MobileNavItem icon={<Scan />} active={activeTab === 'analyze'} onClick={() => setActiveTab('analyze')} />
        <MobileNavItem icon={<History />} active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200",
        active 
          ? "bg-blue-50 text-blue-600 font-semibold shadow-sm" 
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      <span className={cn("w-6 h-6", active ? "text-blue-600" : "text-gray-400")}>
        {icon}
      </span>
      <span className="hidden md:block text-sm">{label}</span>
    </button>
  );
}

function MobileNavItem({ icon, active, onClick }: { icon: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-2 rounded-xl transition-all",
        active ? "text-blue-600 bg-blue-50" : "text-gray-400"
      )}
    >
      {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
    </button>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h4 className="font-bold text-gray-900 mb-1">{title}</h4>
      <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function StatBox({ label, value }: { label: string, value: string }) {
  return (
    <div className="bg-gray-50 p-4 rounded-2xl">
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function FeatureRating({ label, rating, desc }: { label: string, rating: number, desc: string }) {
  return (
    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</span>
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-gray-900">{rating}</span>
          <span className="text-[10px] text-gray-400">/10</span>
        </div>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${rating * 10}%` }}
          className="h-full bg-blue-500 rounded-full"
        />
      </div>
      <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">{desc}</p>
    </div>
  );
}
