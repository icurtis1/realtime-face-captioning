import React from 'react';

interface FaceMeshRendererProps {
  ctx: CanvasRenderingContext2D;
  landmarks: any[];
  canvasWidth: number;
  canvasHeight: number;
  caption: { text: string; timestamp: number };
  isActiveFace?: boolean;
}

const drawSphere = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string
) => {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.stroke();
};

const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    // Test adding the word to the current line
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    
    // If adding this word exceeds the maxWidth, start a new line
    if (metrics.width > maxWidth && currentLine !== '') {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });
  
  // Don't forget to add the last line
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
};

const FaceMeshRenderer: React.FC<FaceMeshRendererProps> = ({
  ctx,
  landmarks,
  canvasWidth,
  canvasHeight,
  caption,
  isActiveFace = true,
}) => {
  // Draw mesh tesselation
  window.drawConnectors(ctx, landmarks, window.FACEMESH_TESSELATION, {
    color: "rgba(255,255,255,0.08)",
    lineWidth: 0.5,
  });

  // Draw facial features
  const features = [
    { name: window.FACEMESH_RIGHT_EYE },
    { name: window.FACEMESH_LEFT_EYE },
    { name: window.FACEMESH_RIGHT_EYEBROW },
    { name: window.FACEMESH_LEFT_EYEBROW },
    { name: window.FACEMESH_FACE_OVAL },
    { name: window.FACEMESH_LIPS },
  ];

  features.forEach(feature => {
    window.drawConnectors(ctx, landmarks, feature.name, {
      color: "rgba(255,255,255,0.3)",
      lineWidth: 0.8,
    });
  });

  // Draw landmarks
  window.drawLandmarks(ctx, landmarks, {
    color: "rgba(255,255,255,0.2)",
    lineWidth: 0.5,
    radius: 0.8,
  });

  // Draw a sphere at the forehead (landmark 10) - blue for active face, gray otherwise
  const forehead = landmarks[10];
  if (forehead) {
    const x = forehead.x * canvasWidth;
    const y = forehead.y * canvasHeight;
    drawSphere(ctx, x, y, 6, isActiveFace ? '#ADD8E6' : '#AAAAAA');
  }

  // Only draw caption if there is text to display (always show on all faces)
  if (forehead && caption.text) {
    const x = forehead.x * canvasWidth;
    const y = forehead.y * canvasHeight;
    
    ctx.save();
    
    // Set up text properties
    ctx.font = '16px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Get the text to display
    const displayText = caption.text || 'Speak to add captions...';
    
    // Define max width for the caption box
    const maxBoxWidth = 300;
    const lineHeight = 20; // Height for each line of text
    
    // Wrap text into multiple lines
    const textLines = wrapText(ctx, displayText, maxBoxWidth - 40); // Subtract padding
    
    // Calculate text box dimensions based on number of lines
    const textWidth = maxBoxWidth;
    const textHeight = Math.max(lineHeight * textLines.length + 20, 46); // Add padding, min 46px
    const indicatorHeight = 12;
    
    const verticalOffset = textHeight + 50;
    
    // Draw glass-like background
    // First, add a blur effect to simulate glass
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 8;
    
    // Semi-transparent background for glass effect - different style for active vs inactive
    ctx.fillStyle = isActiveFace 
      ? 'rgba(0, 132, 255, 0.85)' // Active face - iMessage blue
      : 'rgba(0, 132, 255, 0.45)'; // Inactive faces - muted blue
    
    // Draw the combined shape (caption box + indicator)
    ctx.beginPath();
    // Start with the main rectangle
    ctx.roundRect(x - textWidth/2, y - verticalOffset, textWidth, textHeight, 12);
    // Add the indicator triangle as part of the same path
    ctx.moveTo(x - 12, y - verticalOffset + textHeight); // Left point
    ctx.lineTo(x, y - verticalOffset + textHeight + indicatorHeight); // Bottom point
    ctx.lineTo(x + 12, y - verticalOffset + textHeight); // Right point
    ctx.fill();
    
    // Add subtle glow effect - brighter for active face
    ctx.shadowColor = isActiveFace
      ? 'rgba(255, 255, 255, 0.5)' 
      : 'rgba(255, 255, 255, 0.3)';
    ctx.shadowBlur = 10;
    
    // Reset shadow for text
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    
    // Add a subtle highlight at the top to enhance glass effect
    const gradient = ctx.createLinearGradient(
      x - textWidth/2,
      y - verticalOffset,
      x - textWidth/2,
      y - verticalOffset + 20
    );
    gradient.addColorStop(0, isActiveFace ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.15)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x - textWidth/2, y - verticalOffset, textWidth, 20, { 
      topLeft: 12, 
      topRight: 12, 
      bottomLeft: 0, 
      bottomRight: 0 
    });
    ctx.fill();
    
    // Draw text - brighter for active face
    ctx.fillStyle = isActiveFace ? 'white' : 'rgba(255, 255, 255, 0.8)';
    
    // Apply mirror transformation for text
    ctx.scale(-1, 1);
    
    // Draw each line of text
    textLines.forEach((line, index) => {
      const lineY = y - verticalOffset + (index * lineHeight) + (lineHeight / 2) + 10; // 10px padding
      ctx.fillText(line, -x, lineY);
    });
    
    // Reset the transformation
    ctx.scale(-1, 1);
    
    ctx.restore();
  }
};

export default FaceMeshRenderer;