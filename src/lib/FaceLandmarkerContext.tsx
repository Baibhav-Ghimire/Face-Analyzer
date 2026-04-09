import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

interface FaceLandmarkerContextType {
  landmarker: FaceLandmarker | null;
  isLoading: boolean;
  error: string | null;
}

const FaceLandmarkerContext = createContext<FaceLandmarkerContextType | undefined>(undefined);

export function FaceLandmarkerProvider({ children }: { children: ReactNode }) {
  const [landmarker, setLandmarker] = useState<FaceLandmarker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function initMediaPipe() {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });
        
        if (active) {
          setLandmarker(faceLandmarker);
          setIsLoading(false);
        } else {
          faceLandmarker.close();
        }
      } catch (err) {
        console.error("Failed to initialize FaceLandmarker:", err);
        if (active) {
          setError("Failed to load facial analysis engine.");
          setIsLoading(false);
        }
      }
    }
    initMediaPipe();
    return () => {
      active = false;
      // We don't necessarily want to close it on every unmount of the provider 
      // if the provider is at the root, but it's good practice.
    };
  }, []);

  return (
    <FaceLandmarkerContext.Provider value={{ landmarker, isLoading, error }}>
      {children}
    </FaceLandmarkerContext.Provider>
  );
}

export function useFaceLandmarker() {
  const context = useContext(FaceLandmarkerContext);
  if (context === undefined) {
    throw new Error('useFaceLandmarker must be used within a FaceLandmarkerProvider');
  }
  return context;
}
