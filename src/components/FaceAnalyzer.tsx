import React, { useRef, useState, useCallback } from 'react';
import { FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { Upload, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import LandmarkCanvas from './LandmarkCanvas';
import { useFaceLandmarker } from '@/src/lib/FaceLandmarkerContext';

interface FaceAnalyzerProps {
  onAnalysisComplete?: (result: FaceLandmarkerResult, imageBase64: string) => void;
}

export default function FaceAnalyzer({ onAnalysisComplete }: FaceAnalyzerProps) {
  const { landmarker, isLoading, error: landmarkerError } = useFaceLandmarker();
  const [isProcessing, setIsProcessing] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState<any[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback(async (imgSrc: string) => {
    if (!landmarker) return;
    
    setIsProcessing(true);
    try {
      // Create temporary image element to process
      const img = new Image();
      img.src = imgSrc;
      img.onload = () => {
        const result = landmarker.detectForVideo(img, performance.now());
        if (result.faceLandmarks.length > 0) {
          setLandmarks(result.faceLandmarks[0]);
          if (onAnalysisComplete) {
            onAnalysisComplete(result, imgSrc);
          }
        } else {
          setError("No face detected. Please use a clear portrait.");
        }
        setIsProcessing(false);
      };
    } catch (err) {
      console.error("Processing error:", err);
      setError("Error analyzing image. Try a clearer photo.");
      setIsProcessing(false);
    }
  }, [landmarker, onAnalysisComplete]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImage(result);
      setError(null);
      processImage(result);
    };
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setImage(null);
    setError(null);
    setLandmarks([]);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-sm font-medium text-gray-500">Initializing Analysis Engine...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <AnimatePresence mode="wait">
        {!image ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex flex-col items-center justify-center p-16 space-y-6 cursor-pointer",
                "bg-white rounded-3xl border-2 border-dashed border-gray-200",
                "transition-all duration-300 hover:border-blue-400 hover:bg-blue-50/30",
                "shadow-sm hover:shadow-md"
              )}
            >
              <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900">Upload Portrait</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Drag and drop or click to select a clear front-facing photo
                </p>
              </div>
              <div className="flex gap-4 text-xs font-medium text-gray-400">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> High Resolution
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Even Lighting
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Neutral Expression
                </span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="relative">
              <LandmarkCanvas 
                imageSrc={image} 
                landmarks={landmarks} 
              />
              
              {isProcessing && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-3 rounded-3xl">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-sm font-medium tracking-wider uppercase">Mapping Facial Landmarks</span>
                </div>
              )}

              {error && (
                <div className="absolute bottom-6 left-6 right-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 shadow-lg">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                  <button 
                    onClick={reset}
                    className="ml-auto p-2 hover:bg-red-100 rounded-xl transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-2">
              <div className="flex gap-3">
                <button
                  onClick={reset}
                  className="px-6 py-2.5 rounded-2xl bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors"
                >
                  New Analysis
                </button>
              </div>
              
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isProcessing ? "bg-yellow-400 animate-pulse" : (landmarks.length > 0 ? "bg-green-500" : "bg-gray-300")
                )} />
                {isProcessing ? "Analyzing..." : (landmarks.length > 0 ? "Landmarks Detected" : "Waiting for detection")}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
