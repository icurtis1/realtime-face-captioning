import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { isMobile } from 'react-device-detect';
import CameraPermission from './CameraPermission';
import FaceMeshRenderer from './FaceMeshRenderer';

interface FaceMeshViewProps {
  caption: { text: string; timestamp: number };
  onActiveFaceChange: (faceId: number | null) => void;
  activeFaceId: number | null;
}

interface FaceLandmark {
  x: number;
  y: number;
  z: number;
}

interface FaceData {
  id: number;
  landmarks: FaceLandmark[];
  isMovingMouth: boolean;
  mouthOpenDistance: number;
  lastUpdateTime: number;
}

declare global {
  interface Window {
    FaceMesh: any;
    drawConnectors: any;
    drawLandmarks: any;
    Camera: any;
    FACEMESH_TESSELATION: any;
    FACEMESH_RIGHT_EYE: any;
    FACEMESH_LEFT_EYE: any;
    FACEMESH_RIGHT_EYEBROW: any;
    FACEMESH_LEFT_EYEBROW: any;
    FACEMESH_FACE_OVAL: any;
    FACEMESH_LIPS: any;
  }
}

// Upper and lower lip landmark indices for detecting mouth movements
const UPPER_LIP_LANDMARKS = [13, 14, 312, 311, 310, 415, 308];
const LOWER_LIP_LANDMARKS = [14, 17, 16, 15, 402, 318, 324, 308];
// Reduced threshold to make mouth movement detection more sensitive
const MOUTH_MOVEMENT_THRESHOLD = 0.003; 
const MOUTH_MOVEMENT_TIMEOUT = 1500; // Increased to 1.5 seconds

const FaceMeshView: React.FC<FaceMeshViewProps> = ({ caption, onActiveFaceChange, activeFaceId }) => {
  const webcamRef = useRef<Webcam | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const faceMeshRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  const [showPermissionRequest, setShowPermissionRequest] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [cdnAvailable, setCdnAvailable] = useState(true);
  
  // State to track multiple faces
  const [faces, setFaces] = useState<FaceData[]>([]);
  const facesRef = useRef<FaceData[]>([]);
  const previousMouthOpennessRef = useRef<{[key: number]: number}>({});

  // Update facesRef whenever faces state changes
  useEffect(() => {
    facesRef.current = faces;
  }, [faces]);

  // Calculate dimensions based on device type and screen size
  const getDimensions = () => {
    if (isMobile) {
      const width = Math.min(window.innerWidth, 360); // Smaller width on mobile
      const aspectRatio = 4/3; // Standard camera aspect ratio
      const height = Math.floor(width / aspectRatio);
      
      return {
        width,
        height,
        videoWidth: 320, // Lower resolution for better performance
        videoHeight: 240 // Keep height larger for portrait orientation
      };
    }
    
    return {
      width: 640,
      height: 480,
      videoWidth: 640,
      videoHeight: 480
    };
  };

  // Set dimensions based on device type
  const dimensions = getDimensions();

  // Store the latest caption in a ref to access it in callbacks
  const latestCaptionRef = useRef(caption);
  useEffect(() => {
    latestCaptionRef.current = caption;
  }, [caption]);

  // Store the latest activeFaceId in a ref to access it in callbacks
  const activeFaceIdRef = useRef(activeFaceId);
  useEffect(() => {
    activeFaceIdRef.current = activeFaceId;
  }, [activeFaceId]);

  useEffect(() => {
    const check = () => {
      const ok =
        typeof window.FaceMesh !== 'undefined' &&
        typeof window.Camera !== 'undefined' &&
        typeof window.drawConnectors !== 'undefined';
      setCdnAvailable(ok);
      return ok;
    };
    check();
    const iid = setInterval(check, 1000);
    const tid = setTimeout(() => {
      if (!check()) {
        const head = document.getElementsByTagName('head')[0];
        ['camera_utils', 'drawing_utils', 'face_mesh'].forEach((lib) => {
          const s = document.createElement('script');
          s.src = `https://cdn.jsdelivr.net/npm/@mediapipe/${lib}/${lib}.js`;
          s.crossOrigin = 'anonymous';
          head.appendChild(s);
        });
      }
    }, 3000);
    return () => {
      clearInterval(iid);
      clearTimeout(tid);
    };
  }, []);

  const handleRequestCameraAccess = () => {
    setShowPermissionRequest(false);
    setIsLoading(true);
  };

  const handleWebcamLoad = () => {
    setCameraReady(true);
    setIsLoading(false);
  };

  const handleWebcamError = (error: any) => {
    const msg =
      error instanceof DOMException
        ? error.message
        : typeof error === 'string'
        ? error
        : 'Error accessing camera';
    if (msg.toLowerCase().includes('permission')) {
      setShowPermissionRequest(true);
    }
    setLastError(msg);
    setIsLoading(false);
  };

  // Helper function to calculate distance between two landmarks
  const calculateDistance = (landmark1: FaceLandmark, landmark2: FaceLandmark): number => {
    const dx = landmark1.x - landmark2.x;
    const dy = landmark1.y - landmark2.y;
    const dz = landmark1.z - landmark2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };

  // Function to calculate the average vertical distance between upper and lower lips
  const calculateMouthOpenness = (landmarks: FaceLandmark[]): number => {
    let totalDistance = 0;
    let pairsCount = 0;

    // Using more landmark pairs for better detection
    // Upper lip points
    const upperLipPoints = [0, 13, 14, 17, 37, 39, 40, 61, 185, 267, 269, 270, 409];
    // Lower lip points
    const lowerLipPoints = [14, 17, 84, 87, 91, 146, 181, 306, 308, 324, 375, 402, 405];

    // Calculate distance between corresponding upper and lower lip points
    for (let i = 0; i < Math.min(upperLipPoints.length, lowerLipPoints.length); i++) {
      const upperIdx = upperLipPoints[i];
      const lowerIdx = lowerLipPoints[i];
      
      if (landmarks[upperIdx] && landmarks[lowerIdx]) {
        totalDistance += calculateDistance(landmarks[upperIdx], landmarks[lowerIdx]);
        pairsCount++;
      }
    }

    return pairsCount > 0 ? totalDistance / pairsCount : 0;
  };

  // Detect mouth movement by comparing current and previous mouth openness
  const detectMouthMovement = (
    faceId: number,
    currentOpenness: number
  ): boolean => {
    // Get previous openness for this face or default to current if not available
    const previousOpenness = previousMouthOpennessRef.current[faceId] || currentOpenness;
    
    // Calculate the difference
    const difference = Math.abs(currentOpenness - previousOpenness);
    
    // Store current openness as previous for next frame
    previousMouthOpennessRef.current[faceId] = currentOpenness;
    
    // Consider it movement if the difference exceeds threshold
    return difference > MOUTH_MOVEMENT_THRESHOLD;
  };

  // Update face data with new landmarks and mouth movement detection
  const updateFaceData = (
    faceLandmarks: FaceLandmark[], 
    faceIndex: number
  ): FaceData => {
    // Find existing face or create new face data
    const existingFace = facesRef.current.find(face => face.id === faceIndex);
    const currentTime = Date.now();
    
    // Calculate current mouth openness
    const currentMouthOpenness = calculateMouthOpenness(faceLandmarks);
    
    // Detect if mouth is moving compared to previous state
    const isMoving = detectMouthMovement(faceIndex, currentMouthOpenness);
    
    // Return updated face data
    return {
      id: faceIndex,
      landmarks: faceLandmarks,
      mouthOpenDistance: currentMouthOpenness,
      isMovingMouth: isMoving,
      lastUpdateTime: currentTime
    };
  };

  // Determine which face is currently speaking
  const determineSpeakingFace = (updatedFaces: FaceData[]): number | null => {
    const currentTime = Date.now();
    
    // Find faces that are moving their mouths
    const movingFaces = updatedFaces.filter(
      face => face.isMovingMouth || 
      (currentTime - face.lastUpdateTime) < MOUTH_MOVEMENT_TIMEOUT
    );
    
    if (movingFaces.length === 0) {
      // If no face is moving its mouth, keep the current active face if it exists
      // or default to the first face if available
      return activeFaceIdRef.current !== null ? 
        activeFaceIdRef.current : 
        (updatedFaces.length > 0 ? updatedFaces[0].id : null);
    }
    
    // Sort by mouth movement (most movement first)
    movingFaces.sort((a, b) => 
      b.mouthOpenDistance - a.mouthOpenDistance
    );
    
    // Return the ID of the face with the most mouth movement
    return movingFaces[0].id;
  };

  const onResults = useCallback((results: any) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match video size
    if (webcamRef.current?.video) {
      const v = webcamRef.current.video;
      if (canvas.width !== v.videoWidth || canvas.height !== v.videoHeight) {
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
      }
    }

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);

    const updatedFaces: FaceData[] = [];

    // Process all detected faces
    if (results.multiFaceLandmarks) {
      results.multiFaceLandmarks.forEach((landmarks: FaceLandmark[], index: number) => {
        // Update face data with new landmarks and mouth movement detection
        const updatedFace = updateFaceData(landmarks, index);
        updatedFaces.push(updatedFace);
      });
    }

    // Determine which face is speaking
    const speakingFaceId = determineSpeakingFace(updatedFaces);
    
    // If the speaking face has changed, update the active face
    if (speakingFaceId !== activeFaceIdRef.current) {
      onActiveFaceChange(speakingFaceId);
    }

    // Render all faces
    if (results.multiFaceLandmarks) {
      results.multiFaceLandmarks.forEach((landmarks: FaceLandmark[], index: number) => {
        // Always pass the caption to all faces
        // This allows captions to be displayed on all detected faces
        FaceMeshRenderer({
          ctx,
          landmarks,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          caption: latestCaptionRef.current,
          // Indicate if this is the active speaking face
          isActiveFace: index === speakingFaceId
        });
      });
    }

    // Update faces state
    setFaces(updatedFaces);

    ctx.restore();
  }, [onActiveFaceChange]); 

  const startFaceMesh = () => {
    if (!webcamRef.current?.video || !canvasRef.current || isRunning) return;
    try {
      setIsLoading(true);
      if (!cdnAvailable) throw new Error('MediaPipe not loaded yet');
      faceMeshRef.current = new window.FaceMesh({
        locateFile: (f: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
      });
      faceMeshRef.current.setOptions({
        maxNumFaces: 4, // Increased from 1 to 4 to support multiple faces
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      faceMeshRef.current.onResults(onResults);

      cameraRef.current = new window.Camera(
        webcamRef.current.video,
        {
          onFrame: async () => {
            await faceMeshRef.current.send({
              image: webcamRef.current!.video,
            });
          },
          width: dimensions.videoWidth,
          height: dimensions.videoHeight,
        }
      );

      cameraRef.current
        .start()
        .then(() => {
          setIsRunning(true);
          setLastError(null);
        })
        .catch((e: any) => setLastError(e.message))
        .finally(() => setIsLoading(false));
    } catch (e: any) {
      setLastError(e.message);
      setIsLoading(false);
    }
  };

  const stopFaceMesh = () => {
    cameraRef.current?.stop();
    faceMeshRef.current?.close();
    setIsRunning(false);
  };

  useEffect(() => () => stopFaceMesh(), []);
  useEffect(() => {
    if (!showPermissionRequest && cameraReady && !isRunning) {
      startFaceMesh();
    }
  }, [showPermissionRequest, cameraReady, isRunning]);

  return (
    <div 
      ref={containerRef}
      className="relative mx-auto w-full max-w-full"
      style={{ 
        width: dimensions.width,
        height: dimensions.height,
        aspectRatio: `${dimensions.width} / ${dimensions.height}`
      }}
    >
      {showPermissionRequest ? (
        <CameraPermission onRequestAccess={handleRequestCameraAccess} />
      ) : (
        <>
          {isLoading && !cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-30 text-white">
              <p>Loading camera...</p>
            </div>
          )}
          {lastError && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-500 bg-opacity-80 z-40 text-white p-4 rounded-md">
              <div className="text-center">
                <p className="font-medium mb-2">Error</p>
                <p>{lastError}</p>
                <div className="mt-4 flex gap-2 justify-center">
                  <button
                    onClick={() => {
                      stopFaceMesh();
                      setLastError(null);
                      setTimeout(startFaceMesh, 500);
                    }}
                    className="px-3 py-1 bg-white text-red-600 rounded-md"
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-3 py-1 bg-white text-red-600 rounded-md"
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="absolute inset-0 rounded-md overflow-hidden bg-black">
            <Webcam
              ref={webcamRef}
              width={dimensions.width}
              height={dimensions.height}
              mirrored
              audio={false}
              onUserMedia={handleWebcamLoad}
              onUserMediaError={handleWebcamError}
              className="absolute inset-0 w-full h-full object-cover"
              videoConstraints={{
                width: dimensions.videoWidth,
                height: dimensions.videoHeight,
                facingMode: "user",
              }}
            />
            <canvas
              ref={canvasRef}
              width={dimensions.videoWidth}
              height={dimensions.videoHeight}
              className="absolute inset-0 w-full h-full z-10"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default FaceMeshView;