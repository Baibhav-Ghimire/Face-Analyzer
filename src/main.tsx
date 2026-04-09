import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './lib/AuthContext';
import { FaceLandmarkerProvider } from './lib/FaceLandmarkerContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <FaceLandmarkerProvider>
        <App />
      </FaceLandmarkerProvider>
    </AuthProvider>
  </StrictMode>,
);
