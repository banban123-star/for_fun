const videoElement = document.querySelector('.input_video');
const canvasElement = document.querySelector('.output_canvas');
const canvasCtx = canvasElement.getContext('2d');

// Helper function to draw glowing energy between hands
function drawEnergyBeam(ctx, point1, point2) {
    const x1 = point1.x * canvasElement.width;
    const y1 = point1.y * canvasElement.height;
    const x2 = point2.x * canvasElement.width;
    const y2 = point2.y * canvasElement.height;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    
    // Add some random jitter for a lightning/energy effect
    const midX = (x1 + x2) / 2 + (Math.random() * 50 - 25);
    const midY = (y1 + y2) / 2 + (Math.random() * 50 - 25);
    
    ctx.quadraticCurveTo(midX, midY, x2, y2);
    
    // Glowing styling
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 8;
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#00f3ff';
    ctx.stroke();
    
    // Inner white core
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;
}

// Main function that runs every time a frame is processed
function onResults(results) {
    // Keep canvas size synced with video resolution
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Draw the webcam feed onto the canvas
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
            // Draw the hand mesh (dots and connecting lines)
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
                color: '#00f3ff', 
                lineWidth: 2
            });
            drawLandmarks(canvasCtx, landmarks, {
                color: '#ffffff', 
                lineWidth: 1, 
                radius: 3
            });
        }

        // If two hands are detected, draw the energy effect between them
        if (results.multiHandLandmarks.length === 2) {
            // Landmark 9 is the center base of the middle finger (the palm)
            const palm1 = results.multiHandLandmarks[0][9];
            const palm2 = results.multiHandLandmarks[1][9];
            
            drawEnergyBeam(canvasCtx, palm1, palm2);
            // Draw a second beam for a thicker, more chaotic look
            drawEnergyBeam(canvasCtx, palm1, palm2);
        }
    }
    canvasCtx.restore();
}

// Initialize MediaPipe Hands model
const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
    maxNumHands: 2, // Track up to 2 hands
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

hands.onResults(onResults);

// Start the webcam feed
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({image: videoElement});
    },
    width: 1280,
    height: 720
});

camera.start();