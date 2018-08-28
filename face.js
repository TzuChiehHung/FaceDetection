window.onload = function(){

    // canvas for snapshot
    src = document.getElementById("src");
    src_ctx = src.getContext("2d");

    // canvas for face detection
    min = document.getElementById("min");
    min_ctx = min.getContext("2d");

    // canvas for render
    render = document.getElementById("render");
    render_ctx = render.getContext("2d");

    startWebcam()

    // face detector
    tracker = new tracking.ObjectTracker("face"); // face detector
    tracker.setInitialScale(4);
    tracker.setStepSize(2);
    tracker.setEdgesDensity(0.1);

    tracker.on("track", function(event) {
        render_ctx.clearRect(0, 0, render.width, render.height);
        if (event.data.length === 0) {
            // No face were detected in this frame.
            // console.log("no face");
        }
        else {
            renderText()
            event.data.forEach(renderBoundingBox)
            // console.log("got face");
        }
    })
    // toc = performance.now()
    // console.log(toc-tic)
}

function startWebcam() {
    var constraints = {
        audio: false,
        video: {
            width: { ideal: 4096 },
            height: { ideal: 2160 } 
        }
    };

    // get user media
    navigator.getUserMedia = ( navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia);

    if (navigator.getUserMedia) {
        navigator.getUserMedia (constraints, dealWithStream, console.error);
    } else {
        console.log("getUserMedia not supported");
    }  
}

function dealWithStream(localMediaStream) {
    video = document.querySelector("video");
    // video.src = window.URL.createObjectURL(localMediaStream);
    video.srcObject = localMediaStream;
    // webcamStream = localMediaStream;
    video.addEventListener("resize", videoResizeEventListener);
    video.addEventListener("play", function() {detectInterval = setInterval(faceDetection, 33)});
    video.addEventListener("suspend", function() {clearInterval(detectInterval)});
}

function videoResizeEventListener() {
    if (video.videoWidth > 0) {
        console.log("Best captured video quality: " +video.videoWidth+ "×" +video.videoHeight);
    }
    else {
        // Error case faced in Chrome
        console.error("SourceUnavailableError");
    }
}

function faceDetection() {
    // update canvas
    src_ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    min_ctx.drawImage(src, 0, 0, min.width, min.height);

    // face detection
    tracking.track('#min', tracker);
}

function renderText() {
    render_ctx.font = "36px Helvetica";
    render_ctx.fillStyle = "#f00";
    render_ctx.fillText("Face Detected!", 500, 480);
}

function renderBoundingBox(rect) {
    min_ctx.strokeStyle = "#a64ceb";
    min_ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    min_ctx.font = "11px Helvetica";
    min_ctx.fillStyle = "#fff";
    min_ctx.fillText("x: " + rect.x + "px", rect.x + rect.width + 5, rect.y + 11);
    min_ctx.fillText("y: " + rect.y + "px", rect.x + rect.width + 5, rect.y + 22);
}