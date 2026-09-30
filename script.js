const videoElement = document.querySelector('.input_video');
const canvasElement = document.querySelector('.output_canvas');
const canvasCtx = canvasElement.getContext('2d');

const COLOR_CYAN = '#00ffcc';
const COLOR_WHITE = '#ffffff';

// 1. Load the 5 photos into memory
const photos = [];
for (let i = 1; i <= 5; i++) {
    const img = new Image();
    img.src = `photo${i}.jpg`; // Change to .png here if your images are PNGs
    photos.push(img);
}

// 2. Logic to accurately count fingers regardless of left/right hand
function countRaisedFingers(landmarks) {
    let count = 0;
    
    // Thumb: Check if the thumb tip (4) is stretched further horizontally from the palm (9) than the thumb knuckle (3)
    const thumbDistTip = Math.abs(landmarks[4].x - landmarks[9].x);
    const thumbDistKnuckle = Math.abs(landmarks[3].x - landmarks[9].x);
    if (thumbDistTip > thumbDistKnuckle) count++;
    
    // Index(8), Middle(12), Ring(16), Pinky(20): Check if fingertips are higher (lower Y value) than their middle joints
    if (landmarks[8].y < landmarks[6].y) count++;
    if (landmarks[12].y < landmarks[10].y) count++;
    if (landmarks[16].y < landmarks[14].y) count++;
    if (landmarks[20].y < landmarks[18].y) count++;
    
    return count;
}

// 3. Draw the Nano-Machine Array on the palm
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

function onResults(results) {
    const time = performance.now();
    
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks) {
        // Loop through every hand detected on screen independently
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const landmarks = results.multiHandLandmarks[i];
            
            // Draw Cyber-veins
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: 'rgba(0, 255, 204, 0.6)', lineWidth: 3 });
            drawLandmarks(canvasCtx, landmarks, { color: COLOR_WHITE, fillColor: COLOR_CYAN, lineWidth: 1, radius: 4 });

            const palmX = landmarks[9].x * canvasElement.width;
            const palmY = landmarks[9].y * canvasElement.height;
            
            // Draw Palm Arrays
            drawHoloArray(canvasCtx, palmX, palmY, time, 60, false);
            drawHoloArray(canvasCtx, palmX, palmY, time, 80, true);

            // Count fingers and display the corresponding photo
            const fingersRaised = countRaisedFingers(landmarks);
            
            if (fingersRaised > 0 && fingersRaised <= 5) {
                // Arrays start at 0, so 1 finger = index 0 (photo1)
                const imgToDraw = photos[fingersRaised - 1];
                
                // Ensure the image file has successfully loaded before trying to draw it
                if (imgToDraw.complete && imgToDraw.naturalHeight !== 0) {
                    const imgWidth = 180;
                    const imgHeight = 180;
                    
                    // Position the photo to float slightly above the hand
                    const drawX = palmX - (imgWidth / 2);
                    const drawY = palmY - imgHeight - 120; // 120px offset upwards

                    // Add a holographic glowing border around the photo
                    canvasCtx.shadowBlur = 20;
                    canvasCtx.shadowColor = COLOR_CYAN;
                    canvasCtx.strokeStyle = COLOR_CYAN;
                    canvasCtx.lineWidth = 4;
                    canvasCtx.strokeRect(drawX, drawY, imgWidth, imgHeight);
                    
                    // Draw the actual image inside the border
                    canvasCtx.shadowBlur = 0;
                    canvasCtx.globalAlpha = 0.85; // Give it a slight transparent hologram feel
                    canvasCtx.drawImage(imgToDraw, drawX, drawY, imgWidth, imgHeight);
                    canvasCtx.globalAlpha = 1.0; // Reset transparency
                }
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
    modelComplexity: 1, 
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
});

hands.onResults(onResults);

// Mobile-Optimized Native WebRTC Camera
async function setupMobileCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user', 
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });
        
        videoElement.srcObject = stream;
        
        return new Promise((resolve) => {
            videoElement.onloadedmetadata = () => {
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

let lastVideoTime = -1;
async function processVideoFrame() {
    if (videoElement.currentTime !== lastVideoTime) {
        lastVideoTime = videoElement.currentTime;
        await hands.send({ image: videoElement });
    }
    requestAnimationFrame(processVideoFrame);
}

setupMobileCamera().then(() => {
    videoElement.play();
    processVideoFrame();
});