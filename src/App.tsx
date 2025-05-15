import React, { useState, useEffect } from 'react';
import { Camera } from 'lucide-react';
import FaceMeshView from './components/FaceMeshView';
import CaptionOverlay from './components/CaptionOverlay';

interface CaptionState {
  text: string;
  timestamp: number;
}

function App() {
  const [isCdnAvailable, setIsCdnAvailable] = useState(true);
  const [isCheckingCdn, setIsCheckingCdn] = useState(true);
  const [caption, setCaption] = useState<CaptionState>({ text: '', timestamp: 0 });
  const [faceMeshCaption, setFaceMeshCaption] = useState<CaptionState>({ text: '', timestamp: 0 });
  const [activeFaceId, setActiveFaceId] = useState<number | null>(null);

  // Check CDN availability on component mount
  useEffect(() => {
    const checkCdnAvailability = async () => {
      setIsCheckingCdn(true);
      try {
        // Check the MediaPipe face mesh file availability
        const faceMeshResponse = await fetch(
          'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js',
          { method: 'HEAD' }
        );
        
        // Check the camera utils file availability
        const cameraResponse = await fetch(
          'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
          { method: 'HEAD' }
        );
        
        // Check the drawing utils file availability
        const drawingResponse = await fetch(
          'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
          { method: 'HEAD' }
        );
        
        setIsCdnAvailable(faceMeshResponse.ok && cameraResponse.ok && drawingResponse.ok);
      } catch (error) {
        console.error('Error checking CDN availability:', error);
        setIsCdnAvailable(false);
      } finally {
        setIsCheckingCdn(false);
      }
    };

    checkCdnAvailability();
    
    // Check availability periodically
    const intervalId = setInterval(checkCdnAvailability, 60000); // every minute
    
    return () => clearInterval(intervalId);
  }, []);

  // Update faceMeshCaption whenever caption changes
  useEffect(() => {
    setFaceMeshCaption(caption);
  }, [caption]);

  // Handler for when active speaking face changes
  const handleActiveFaceChange = (faceId: number | null) => {
    setActiveFaceId(faceId);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <main className="flex flex-col items-center justify-center gap-4">
        {!isCheckingCdn && !isCdnAvailable && (
          <div className="w-full max-w-2xl mb-4 p-3 bg-yellow-50 text-yellow-800 rounded-md flex items-start">
            <div>
              <p className="text-sm">
                We're having trouble connecting to the required resources. Please check your internet connection.
              </p>
            </div>
          </div>
        )}
        
        <div className="overflow-hidden rounded-md">
          <FaceMeshView 
            caption={faceMeshCaption} 
            onActiveFaceChange={handleActiveFaceChange}
            activeFaceId={activeFaceId}
          />
        </div>

        <CaptionOverlay 
          onCaptionChange={(text) => setCaption({ text, timestamp: Date.now() })}
          caption={caption.text}
        />
      </main>
    </div>
  );
}

export default App;