const videoElement = document.querySelector('.input_video');
const canvasElement = document.querySelector('.output_canvas');
const canvasCtx = canvasElement.getContext('2d');

const COLOR_CYAN = '#00ffcc';
const COLOR_BLUE = '#0066ff';
const COLOR_WHITE = '#ffffff';

function getDistance(p1, p2) {
    const dx = (p1.x - p2.x) * canvasElement.width;
    const dy = (p1.y - p2.y) * canvasElement.height;
    return Math.sqrt(dx * dx + dy * dy);
}

function drawHoloArray(ctx, x, y, time, radius, reverse = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((reverse ? -time : time) * 0.002);
    ctx.strokeStyle = COLOR_CYAN;
    ctx.shadowBlur = 15;
    ctx.shadowColor = COLOR_CYAN;
    
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 10]);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for(let i = 0; i < 6; i++) {
        let angle = (Math.PI / 3) * i;
        let hx = Math.cos(angle) * (radius * 0.7);
        let hy = Math.sin(angle) * (radius * 0.7);
        if(i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
}

function drawQiOrb(ctx, x, y, size, time) {
    const pulse = Math.sin(time * 0.005) * 20;
    const currentRadius = Math.max(10, size + pulse); // Prevent negative radius calculation
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, currentRadius);
    gradient.addColorStop(0, COLOR_WHITE);
    gradient.addColorStop(0.2, COLOR_CYAN);
    gradient.addColorStop(0.6, 'rgba(0, 102, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(time * 0.005);
    ctx.strokeStyle = COLOR_WHITE;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 20;
    ctx.shadowColor = COLOR_CYAN;
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius * 0.8, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
}

function drawNanoLightning(ctx, p1, p2, width, height) {
    const x1 = p1.x * width;
    const y1 = p1.y * height;
    const x2 = p2.x * width;
    const y2 = p2.y * height;

    const segments = 10;
    ctx.beginPath();
    ctx.moveTo(x1, y1);

    for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const targetX = x1 + (x2 - x1) * t;
        const targetY = y1 + (y2 - y1) * t;
        
        const jitterX = (Math.random() - 0.5) * 60;
        const jitterY = (Math.random() - 0.5) * 60;
        
        if (i === segments) {
            ctx.lineTo(x2, y2);
        } else {
            ctx.lineTo(targetX + jitterX, targetY + jitterY);
        }
    }

    ctx.strokeStyle = COLOR_CYAN;
    ctx.lineWidth = 4;
    ctx.shadowBlur = 20;
    ctx.shadowColor = COLOR_BLUE;
    ctx.stroke();

    ctx.strokeStyle = COLOR_WHITE;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 5;
    ctx.stroke();
    ctx.shadowBlur = 0;
}

function onResults(results) {
    const time = performance.now();
    
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
                color: 'rgba(0, 255, 204, 0.6)', 
                lineWidth: 3
            });
            
            drawLandmarks(canvasCtx, landmarks, {
                color: COLOR_WHITE, 
                fillColor: COLOR_CYAN,
                lineWidth: 1, 
                radius: 4
            });

            const palmX = landmarks[9].x * canvasElement.width;
            const palmY = landmarks[9].y * canvasElement.height;
            drawHoloArray(canvasCtx, palmX, palmY, time, 60, false);
            drawHoloArray(canvasCtx, palmX, palmY, time, 80, true);
        }

        if (results.multiHandLandmarks.length === 2) {
            const palm1 = results.multiHandLandmarks[0][9];
            const palm2 = results.multiHandLandmarks[1][9];
            
            const distance = getDistance(palm1, palm2);
            
            const midX = ((palm1.x + palm2.x) / 2) * canvasElement.width;
            const midY = ((palm1.y + palm2.y) / 2) * canvasElement.height;

            if (distance < 250) {
                drawQiOrb(canvasCtx, midX, midY, 100 - (distance * 0.2), time);
            } else {
                drawNanoLightning(canvasCtx, palm1, palm2, canvasElement.width, canvasElement.height);
                drawNanoLightning(canvasCtx, palm1, palm2, canvasElement.width, canvasElement.height);
            }
        }
    }
    canvasCtx.restore();
}

const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1, // Change this to 0 if older Android devices suffer from low frame rates
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
});

hands.onResults(onResults);

// --- NATIVE WEBRTC CAMERA INTEGRATION (MOBILE OPTIMIZED) ---
async function setupMobileCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user', // strictly requests front-facing camera on mobile
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });
        
        videoElement.srcObject = stream;
        
        return new Promise((resolve) => {
            videoElement.onloadedmetadata = () => {
                // Dynamically sizes the canvas memory to match the exact mobile device orientation
                canvasElement.width = videoElement.videoWidth;
                canvasElement.height = videoElement.videoHeight;
                resolve(videoElement);
            };
        });
    } catch (error) {
        console.error("Camera access error:", error);
        alert("Please allow camera access in your browser settings.");
    }
}

// Custom rendering loop replacing the MediaPipe Camera Utility
let lastVideoTime = -1;
async function processVideoFrame() {
    if (videoElement.currentTime !== lastVideoTime) {
        lastVideoTime = videoElement.currentTime;
        await hands.send({ image: videoElement });
    }
    // Efficiently requests the next frame matched to the device's screen refresh rate
    requestAnimationFrame(processVideoFrame);
}

// Boot up sequence
setupMobileCamera().then(() => {
    videoElement.play();
    processVideoFrame();
});