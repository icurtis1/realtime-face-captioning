/// <reference types="vite/client" />

interface Window {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
}

// Declaration for MediaPipe global objects
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