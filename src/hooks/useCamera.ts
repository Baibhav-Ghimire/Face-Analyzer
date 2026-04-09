import { useState, useCallback, useRef, useEffect } from 'react';

export function useCamera() {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load(); // Force release
    }
    setIsActive(false);
  }, []);

  // Sync stream to video element when it becomes available
  useEffect(() => {
    if (isActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(err => console.warn("Video play failed:", err));
    }
  }, [isActive]);

  const startCamera = useCallback(async () => {
    // Stop any existing stream first
    stopCamera();
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      streamRef.current = mediaStream;
      setIsActive(true);
      setError(null);
      return mediaStream;
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Camera access denied or not available.");
      setIsActive(false);
      return null;
    }
  }, [stopCamera]);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !isActive) return null;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    // Draw the current video frame
    ctx.drawImage(videoRef.current, 0, 0);
    
    // Return as base64
    return canvas.toDataURL('image/jpeg', 0.9);
  }, [isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  return {
    isActive,
    error,
    videoRef,
    startCamera,
    stopCamera,
    captureFrame
  };
}
