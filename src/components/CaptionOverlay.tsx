import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { isMobile } from 'react-device-detect';

// Define a type for the SpeechRecognition API which isn't standardized in TypeScript
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  onstart: () => void;
  onspeechend: () => void;
  onsoundend: () => void;
  onsoundstart: () => void;
  onaudioend: () => void;
  onaudiostart: () => void;
  onnomatch: () => void;
}

interface SpeechRecognitionEventInit {
  resultIndex?: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface CaptionOverlayProps {
  caption: string;
  onCaptionChange: (text: string) => void;
}

// Get the SpeechRecognition constructor
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const CaptionOverlay: React.FC<CaptionOverlayProps> = ({ caption, onCaptionChange }) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isSpeechApiSupported, setIsSpeechApiSupported] = useState(true);

  // Check if the Speech API is supported
  useEffect(() => {
    if (!SpeechRecognition) {
      setIsSpeechApiSupported(false);
      setError('Speech recognition is not supported in this browser. Try Chrome, Edge, or Safari.');
    }
  }, []);

  const startListening = () => {
    try {
      setError(null);
      
      if (!SpeechRecognition) {
        setError('Speech recognition is not supported in this browser. Try Chrome, Edge, or Safari.');
        return;
      }

      // Create a new speech recognition instance
      recognitionRef.current = new SpeechRecognition();
      
      // Configure the recognition
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;

      // Handle results
      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        
        onCaptionChange(transcript);
      };

      // Handle errors
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please allow microphone access and try again.');
        } else {
          setError(`Speech recognition error: ${event.error}`);
        }
        stopListening();
      };

      // Handle when recognition stops
      recognitionRef.current.onend = () => {
        if (isListening) {
          // Restart if it stops but we're still supposed to be listening
          recognitionRef.current?.start();
        }
      };

      // Start listening
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while starting speech recognition');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  return (
    <div className="w-full max-w-2xl mt-8 p-6 bg-white rounded-lg shadow-sm">
      <div className="flex items-center justify-center mb-4">
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={!isSpeechApiSupported}
          className={`flex items-center px-4 py-2 rounded-md text-white font-medium transition-colors font-inter ${
            isMobile ? 'px-3 py-3' : 'px-4 py-2'} ${
            !isSpeechApiSupported 
              ? 'bg-gray-400 cursor-not-allowed' 
              : isListening 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-indigo-500 hover:bg-indigo-600'
          }`}
        >
          {isListening ? (
            <>
              <MicOff size={18} className={isMobile ? '' : 'mr-2'} />
              {!isMobile && 'Stop Listening'}
            </>
          ) : (
            <>
              <Mic size={18} className={isMobile ? '' : 'mr-2'} />
              {!isMobile && 'Start Listening'}
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {!isSpeechApiSupported && !error && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-700">
            Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.
          </p>
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-md min-h-[100px]">
        <p className="text-gray-700 font-inter">
          {caption || (isListening ? 'Listening...' : 'Captions will appear here...')}
        </p>
      </div>
    </div>
  );
};

export default CaptionOverlay;