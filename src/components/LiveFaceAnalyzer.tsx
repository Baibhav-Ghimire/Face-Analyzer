import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, Loader2, AlertCircle, RefreshCw, Zap, Sparkles, ShieldCheck, CameraOff, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useCamera } from '@/src/hooks/useCamera';
import LandmarkCanvas from './LandmarkCanvas';
import { useFaceLandmarker } from '@/src/lib/FaceLandmarkerContext';

interface LiveFaceAnalyzerProps {
  onCapture?: (imageBase64: string, landmarks: any) => void;
}

export default function LiveFaceAnalyzer({ onCapture }: LiveFaceAnalyzerProps) {
  const { landmarker, isLoading, error: landmarkerError } = useFaceLandmarker();
  const [landmarks, setLandmarks] = useState<any[]>([]);
  const [isStable, setIsStable] = useState(false);
  const [alignmentStatus, setAlignmentStatus] = useState<string>("Align your face");
  
  const { videoRef, startCamera, stopCamera, captureFrame, isActive: isCameraActive, error: cameraError } = useCamera();
  const requestRef = useRef<number>(null);
  const lastVideoTimeRef = useRef<number>(-1);

  const isLoopingRef = useRef(false);

  // Detection Loop
  const detectFrame = useCallback(() => {
    if (!isLoopingRef.current) return;

    if (!landmarker || !videoRef.current || videoRef.current.readyState < 2) {
      requestRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    const video = videoRef.current;
    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      const startTimeMs = performance.now();
      const result = landmarker.detectForVideo(video, startTimeMs);
      
      if (result.faceLandmarks.length > 0) {
        const currentLandmarks = result.faceLandmarks[0];
        setLandmarks(currentLandmarks);
        
        // Stability & Alignment Logic
        // 1. Check if face is centered
        const noseTip = currentLandmarks[1];
        const isCentered = noseTip.x > 0.4 && noseTip.x < 0.6 && noseTip.y > 0.4 && noseTip.y < 0.6;
        
        // 2. Check head pose (simplified)
        const leftEye = currentLandmarks[33];
        const rightEye = currentLandmarks[263];
        const eyeLevelDiff = Math.abs(leftEye.y - rightEye.y);
        const isLevel = eyeLevelDiff < 0.02;
        
        // 3. Check distance (simplified)
        const faceWidth = Math.abs(rightEye.x - leftEye.x);
        const isCorrectDistance = faceWidth > 0.15 && faceWidth < 0.35;

        if (!isCentered) setAlignmentStatus("Center your face");
        else if (!isLevel) setAlignmentStatus("Keep your head level");
        else if (!isCorrectDistance) setAlignmentStatus(faceWidth < 0.15 ? "Move closer" : "Move back");
        else {
          setAlignmentStatus("Perfect! Hold still");
          setIsStable(true);
        }
        
        if (!isCentered || !isLevel || !isCorrectDistance) {
          setIsStable(false);
        }
      } else {
        setLandmarks([]);
        setIsStable(false);
        setAlignmentStatus("No face detected");
      }
    }

    requestRef.current = requestAnimationFrame(detectFrame);
  }, [landmarker, videoRef]);

  // Start/Stop loop based on camera activity
  useEffect(() => {
    if (isCameraActive && landmarker) {
      isLoopingRef.current = true;
      requestRef.current = requestAnimationFrame(detectFrame);
    } else {
      isLoopingRef.current = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      isLoopingRef.current = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isCameraActive, landmarker, detectFrame]);

  const toggleCamera = async () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      await startCamera();
    }
  };

  const handleCapture = () => {
    const frame = captureFrame();
    if (frame && onCapture) {
      onCapture(frame, landmarks);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-sm font-medium text-gray-500">Initializing Live Tracking...</p>
      </div>
    );
  }

  if (landmarkerError) {
    return (
      <div className="p-8 bg-red-50 border border-red-100 rounded-3xl flex flex-col items-center gap-4 text-center">
        <AlertCircle className="w-10 h-10 text-red-500" />
        <div className="space-y-1">
          <h3 className="font-bold text-gray-900">Analysis Engine Error</h3>
          <p className="text-sm text-red-600">{landmarkerError}</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
        >
          Reload App
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="relative aspect-[4/3] bg-black rounded-3xl overflow-hidden shadow-2xl group">
        {!isCameraActive ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6 text-white p-8 text-center">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md">
              <CameraOff className="w-10 h-10 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Live Camera Analysis</h3>
              <p className="text-sm text-gray-400 max-w-xs mx-auto">
                Enable your camera for real-time facial landmark tracking and alignment guidance.
              </p>
            </div>
            <button
              onClick={toggleCamera}
              className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20"
            >
              Enable Live Feed
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover scale-x-[-1]"
            />
            
            {/* Landmark Overlay - Note: We need to mirror the landmarks if we mirror the video */}
            <div className="absolute inset-0 scale-x-[-1]">
              <LandmarkCanvas 
                imageSrc="" 
                landmarks={landmarks} 
                className="bg-transparent shadow-none"
              />
            </div>

            {/* Alignment Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className={cn(
                "w-64 h-80 border-2 border-dashed rounded-[100px] transition-all duration-500",
                isStable ? "border-green-500 bg-green-500/5 scale-105" : "border-white/20"
              )} />
            </div>

            {/* Status Badge */}
            <div className="absolute top-6 left-6 flex items-center gap-3">
              <div className="px-4 py-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isStable ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-yellow-400"
                )} />
                <span className="text-xs font-bold text-white uppercase tracking-widest">
                  {alignmentStatus}
                </span>
              </div>
              
              <div className="px-4 py-2 bg-blue-600/80 backdrop-blur-md rounded-xl flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 text-white" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                  Processing Locally
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-6">
              <button
                onClick={toggleCamera}
                className="p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white hover:bg-white/20 transition-all"
              >
                <CameraOff className="w-6 h-6" />
              </button>
              
              <button
                onClick={handleCapture}
                disabled={!isStable}
                className={cn(
                  "w-20 h-20 rounded-full border-4 transition-all flex items-center justify-center group",
                  isStable 
                    ? "border-green-500 bg-white shadow-[0_0_20px_rgba(34,197,94,0.4)]" 
                    : "border-white/40 bg-white/10 cursor-not-allowed"
                )}
              >
                <div className={cn(
                  "w-14 h-14 rounded-full transition-all",
                  isStable ? "bg-green-500 scale-90 group-hover:scale-100" : "bg-white/20"
                )} />
              </button>

              <div className="w-14 h-14" /> {/* Spacer for symmetry */}
            </div>
          </>
        )}
      </div>

      {cameraError && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">{cameraError}</p>
        </div>
      )}
    </div>
  );
}
