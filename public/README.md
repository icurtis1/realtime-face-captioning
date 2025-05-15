# AR Caption

A real-time face tracking and captioning application built with React, TypeScript, and MediaPipe. This project demonstrates advanced facial landmark detection combined with speech-to-text capabilities to create an augmented reality captioning experience.

<img src="./public/media/demo1.gif" alt="Example" width="700" />

## Features

- 🎯 Real-time face detection and landmark tracking
- 🗣️ Speech-to-text captioning with multi-language support
- 👥 Multi-face tracking with active speaker detection
- 💬 Glass-like caption bubbles that follow faces
- 📱 Responsive design with mobile support
- 🎨 Beautiful minimalist UI with Tailwind CSS

## Technology Stack

- **React** - UI framework
- **TypeScript** - Type safety and better developer experience
- **MediaPipe** - ML-powered face detection and landmark tracking
- **Web Speech API** - Real-time speech recognition
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Next-generation frontend tooling

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ar-caption.git
   cd ar-caption
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Project Structure

```
src/
├── components/         # React components
│   ├── CameraPermission.tsx
│   ├── CaptionOverlay.tsx
│   ├── FaceMeshRenderer.tsx
│   └── FaceMeshView.tsx
├── hooks/             # Custom React hooks
│   ├── useFaceLandmarker.ts
│   └── useFaceMesh.ts
├── App.tsx           # Main application component
└── main.tsx         # Application entry point
```

## How It Works

1. **Camera Access**: The application requests camera permission and initializes the webcam feed.

2. **Face Detection**: MediaPipe's Face Mesh model processes each video frame to detect faces and their landmarks.

3. **Speech Recognition**: The Web Speech API listens for speech input and converts it to text in real-time.

4. **Active Speaker Detection**: The app analyzes mouth movements to determine which face is currently speaking.

5. **Caption Rendering**: Glass-like caption bubbles are rendered above each detected face, with the active speaker's caption highlighted.

## Features in Detail

### Face Tracking
- Detects up to 4 faces simultaneously
- Tracks 468 facial landmarks per face
- Real-time mesh visualization
- Smooth landmark tracking

### Speech Recognition
- Real-time speech-to-text conversion
- Support for multiple languages
- Continuous recognition mode
- Error handling and recovery

## Browser Support

This application works best in modern browsers that support:
- WebGL
- WebAssembly
- `getUserMedia` API
- Web Speech API
- Canvas API

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [MediaPipe](https://developers.google.com/mediapipe) for their excellent ML tools
- [React](https://reactjs.org/) for the UI framework
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Vite](https://vitejs.dev/) for the build tool