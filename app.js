window.onload = function(){

    ui = document.getElementById("ui");

    // canvas for snapshot
    src = document.getElementById("src");
    src_ctx = src.getContext("2d");
    render = document.getElementById("render");
    render_ctx = render.getContext("2d");

    // canvas for face detection and recognition
    min = document.getElementById("min");
    min_ctx = min.getContext("2d");
    this.console.log("Face Detection/Recognition Resolution: " + min.width + "x" + min.height);
    result = document.getElementById("result");
    result.width = min.width;
    result.height = min.height;
    result_ctx = result.getContext("2d");

    // start webcam with max resolution
    startWebcam();
    
    // websocket connection
    var ws_protocol = "ws";
    var ws_hostname = "10.36.172.221";
    var ws_port     = "3001";
    var ws_endpoint = "";
    openWSConnection(ws_protocol, ws_hostname, ws_port, ws_endpoint);

    // fps gui
    stat = new Stats();
    stat.domElement.style.position = "fixed";
    stat.domElement.style.left = "20px";
    stat.domElement.style.top = "20px";
    stat.domElement.style.zIndex = "100"
    document.body.appendChild(stat.domElement);
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
    video.addEventListener("play", function() {sendInterval = setInterval(function() {grabImage(); sendImage();}, 50)});
    video.addEventListener("suspend", function() {clearInterval(sendInterval)});
}

function videoResizeEventListener() {
    if (video.videoWidth > 0) {
        src.width = video.videoWidth;
        src.height = video.videoHeight;
        console.log("Camera Resolution: " +video.videoWidth+ "×" +video.videoHeight);
    }
    else {
        // Error case faced in Chrome
        console.error("SourceUnavailableError");
    }
}

function grabImage() {
    // stat.begin();
    // update canvas
    src_ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    min_ctx.drawImage(src, 0, 0, min.width, min.height);
}

function sendImage() {
    var head = 'data:image/jpeg;base64,';
    var imgDataURI = min.toDataURL("image/jpeg");
    var imgFileSize = Math.round((imgDataURI.length - head.length)*3/4);
    var img_obj = {
        width: src.width,
        height: src.height,
        frame: imgDataURI
    };
    webSocket.send(JSON.stringify(img_obj));
    console.log("WebSocket SEND: " + img_obj.width + "x" + img_obj.height + " (" + imgFileSize/1024**2 + "MB)");
}

function renderResult(jsonData, flip) {
    if (flip) {
        var x = min.width - jsonData.BBX[2]
    }
    else {
        var x = jsonData.BBX[0]
    }
    var y = jsonData.BBX[1]
    var w = jsonData.BBX[2] - jsonData.BBX[0]
    var h = jsonData.BBX[3] - jsonData.BBX[1]

    result_ctx.font = "28px Georgia";
    result_ctx.fillStyle = "green";
    result_ctx.fillText(jsonData.Name, x, y);
    result_ctx.strokeStyle = "cyan";
    result_ctx.strokeRect(x, y, w, h)
}

function openWSConnection(protocol, hostname, port, endpoint) {
    var webSocketURL = null;
    webSocketURL = protocol + "://" + hostname + ":" + port + endpoint;
    webSocket = new WebSocket(webSocketURL);
    console.log("openWSConnection::Connecting to: " + webSocketURL);
    try {
        webSocket.onopen = function(openEvent) {
            console.log("WebSocket OPEN: " + JSON.stringify(openEvent, null, 4));
        }
        webSocket.onclose = function (closeEvent) {
            console.log("WebSocket CLOSE: " + JSON.stringify(closeEvent, null, 4));
        }
        webSocket.onerror = function (errorEvent) {
            console.log("WebSocket ERROR: " + JSON.stringify(errorEvent, null, 4));
        }
        webSocket.onmessage = function (messageEvent) {
            if (messageEvent.data.indexOf("error") > 0) {
                console.error(messageEvent.data.error);
            } else {
                if (messageEvent.data === "NoFace"){
                    // no face
                }
                else {
                    // var jsonData = JSON.parse(messageEvent.data);
                    var jsonData = {"Name":"TC Hung","BBX":[69, 26, 156, 156]};
                    renderResult(jsonData, flip=true);
                    render.width = 1280;
                    render.height = 720;
                    render_ctx.drawImage(result, 0, 0, 1280, 720);
                }
            }
        }
    } catch (exception) {
        console.error(exception);
    }
}