window.onload = function(){

    ui = document.getElementById("ui")
    text = document.getElementById("text")
    // canvas for snapshot
    src = document.getElementById("src");
    src_ctx = src.getContext("2d");

    // canvas for face detection
    min = document.getElementById("min");
    min_ctx = min.getContext("2d");

    // canvas for websocket (testing)
    // ws = document.getElementById("ws");
    // ws_ctx = ws.getContext("2d");
    // ws_img = new Image;
    // ws_img.onload = function (){
    //     ws_ctx.drawImage(ws_img, 0, 0, 1280, 720)
    // }

    // start webcam with max resolution
    startWebcam()
    
    // websocket connection
    var ws_protocol = "ws";
    var ws_hostname = "10.36.172.221";
    var ws_port     = "3000";
    var ws_endpoint = "";
    openWSConnection(ws_protocol, ws_hostname, ws_port, ws_endpoint);

    // face detector
    tracker = new tracking.ObjectTracker("face"); // face detector
    tracker.setInitialScale(4);
    tracker.setStepSize(2);
    tracker.setEdgesDensity(0.1);

    tracker.on("track", function(event) {
        text.innerHTML = ""
        if (event.data.length === 0) {
            // No face were detected in this frame.
            // console.log("no face");
        }
        else {
            event.data.forEach(renderBoundingBox)
            // console.log("got face");

            // send image to server
            var img_obj = {
                width: src.width,
                height: src.height, 
                frame: src.toDataURL()};
            webSocket.send(JSON.stringify(img_obj))
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
    video.srcObject = localMediaStream;
    video.addEventListener("resize", videoResizeEventListener);
    video.addEventListener("play", function() {detectInterval = setInterval(faceDetection, 100)});
    video.addEventListener("suspend", function() {clearInterval(detectInterval)});
}

function videoResizeEventListener() {
    if (video.videoWidth > 0) {
        ui.style.width = video.videoWidth + "px"
        ui.style.height = video.videoHeight + "px"
        text.style.top = video.videoHeight*3/4 + "px"
        src.width = video.videoWidth
        src.height = video.videoHeight
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
    tracking.track("#min", tracker);
}

function renderBoundingBox(rect) {
    min_ctx.strokeStyle = "red";
    min_ctx.lineWidth = 5;
    min_ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
}

function openWSConnection(protocol, hostname, port, endpoint) {
    var webSocketURL = null;
    webSocketURL = protocol + "://" + hostname + ":" + port + endpoint;
    console.log("openWSConnection::Connecting to: " + webSocketURL);
    try {
        webSocket = new WebSocket(webSocketURL);
        webSocket.onopen = function(openEvent) {
            console.log("WebSocket OPEN: " + JSON.stringify(openEvent, null, 4));
        };
        webSocket.onclose = function (closeEvent) {
            console.log("WebSocket CLOSE: " + JSON.stringify(closeEvent, null, 4));
        };
        webSocket.onerror = function (errorEvent) {
            console.log("WebSocket ERROR: " + JSON.stringify(errorEvent, null, 4));
        };
        webSocket.onmessage = function (messageEvent) {
            var wsMsg = messageEvent.data;
            // console.log("WebSocket MESSAGE: " + wsMsg);
            if (wsMsg.indexOf("error") > 0) {
                console.error(wsMsg.error);
            } else {
                text.innerHTML = "Face Detected"
                // var img_obj = JSON.parse(wsMsg)
                // ws.width = img_obj.width;
                // ws.height = img_obj.height;
                // ws_img.src = img_obj.frame;
            }
        }
    } catch (exception) {
        console.error(exception);
    }
}