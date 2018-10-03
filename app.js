window.onload = function(){

    // canvas for snapshot
    src = document.getElementById("src");
    src_ctx = src.getContext("2d");

    // canvas for face detection and recognition
    min = document.getElementById("min");
    min_ctx = min.getContext("2d");
    this.console.log("Face Detection/Recognition Resolution: " + min.width + "x" + min.height);
    result = document.getElementById("result");
    result.width = min.width;
    result.height = min.height;
    result_ctx = result.getContext("2d");

    // overlay results on video
    overlay = document.getElementById("overlay");
    overlay_ctx = overlay.getContext("2d");

    // start webcam with max resolution
    startWebcam();
    
    // websocket connection
    var ws_protocol = "ws";
    var ws_hostname = "10.36.172.221";
    var ws_port     = "3001";
    var ws_endpoint = "";
    openWSConnection(ws_protocol, ws_hostname, ws_port, ws_endpoint);

    // send fps gui
    send_stat = new Stats();
    send_stat.domElement.style.position = "fixed";
    send_stat.domElement.style.left = "20px";
    send_stat.domElement.style.top = "20px";
    send_stat.domElement.style.zIndex = "100"
    document.body.appendChild(send_stat.domElement);

    // receive fps gui
    receive_stat = new Stats();
    receive_stat.domElement.style.position = "fixed";
    receive_stat.domElement.style.left = "120px";
    receive_stat.domElement.style.top = "20px";
    receive_stat.domElement.style.zIndex = "100"
    document.body.appendChild(receive_stat.domElement);
}

function startWebcam() {
    var constraints = {
        audio: false,
        video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 }
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
    container = document.querySelector('#container');
    video = document.querySelector("#video");
    video.srcObject = localMediaStream;
    video.addEventListener("resize", videoResizeEventListener);
    video.addEventListener("play", function() {sendInterval = setInterval(function() {send_stat.end();send_stat.begin();grabImage(); sendImage();}, 0)});
    video.addEventListener("suspend", function() {clearInterval(sendInterval)});
    video.addEventListener('loadedmetadata', setVideoDimensions, false);
    window.addEventListener('resize', setVideoDimensions, false);
}

var setVideoDimensions = function () {
    // Video's intrinsic dimensions
    var w = video.videoWidth;
    var h = video.videoHeight;

    // Intrinsic Ratio
    // Will be more than 1 if W > H and less if W < H
    var videoRatio = (w / h).toFixed(2);

    // Get the container's computed styles
    //
    // Also calculate the min dimensions required (this will be
    // the container dimentions)
    var containerStyles = window.getComputedStyle(container);
    var minW = parseInt( containerStyles.getPropertyValue('width'));
    var minH = parseInt( containerStyles.getPropertyValue('height'));

    // What's the min:intrinsic dimensions
    //
    // The idea is to get which of the container dimension
    // has a higher value when compared with the equivalents
    // of the video. Imagine a 1200x700 container and
    // 1000x500 video. Then in order to find the right balance
    // and do minimum scaling, we have to find the dimension
    // with higher ratio.
    //
    // Ex: 1200/1000 = 1.2 and 700/500 = 1.4 - So it is best to
    // scale 500 to 700 and then calculate what should be the
    // right width. If we scale 1000 to 1200 then the height
    // will become 600 proportionately.
    var widthRatio = minW / w;
    var heightRatio = minH / h;

    // Whichever ratio is more, the scaling
    // has to be done over that dimension
    if (widthRatio > heightRatio) {
      var newWidth = minW;
      var newHeight = Math.ceil( newWidth / videoRatio );
    }
    else {
      var newHeight = minH;
      var newWidth = Math.ceil( newHeight * videoRatio );
    }

    video.width = newWidth;
    video.height = newHeight;
    overlay.width = newWidth;
    overlay.height = newHeight;
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
    // update canvas
    src_ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    min_ctx.drawImage(src, 0, 0, min.width, min.height);
}

function sendImage() {
    var head = 'data:image/jpeg;base64,';
    var imgDataURI = min.toDataURL("image/jpeg");
    var imgFileSize = Math.round((imgDataURI.length - head.length)*3/4);
    var img_obj = {
        width: min.width,
        height: min.height,
        frame: imgDataURI
    };
    webSocket.send(JSON.stringify(img_obj));
    console.log("WebSocket SEND: " + img_obj.width + "x" + img_obj.height + " (" + imgFileSize/1024**2 + "MB)");
}

function overlayResult(jsonData, flip) {
    if (flip) {
        var x = min.width - jsonData.BBX[2];
    }
    else {
        var x = jsonData.BBX[0];
    }
    var y = jsonData.BBX[1];
    var w = jsonData.BBX[2] - jsonData.BBX[0];
    var h = jsonData.BBX[3] - jsonData.BBX[1];

    result_ctx.font = "14px Arial";
    result_ctx.fillStyle = "yellow";
    result_ctx.fillText(jsonData.Name, x+5, y-5);
    // result_ctx.strokeRect(x, y, w, h);
    drawBoundingBox(result_ctx, x, y, w, h);
}

function drawBoundingBox(cvs, x, y, w, h) {
    cvs.strokeStyle = "yellow";
    cvs.lineWidth = 2;
    var dw = Math.round(0.2 * w);
    var dh = Math.round(0.2 * h);

    cvs.beginPath();
    // top left
    cvs.moveTo(x, y+dh);
    cvs.lineTo(x, y);
    cvs.lineTo(x+dw, y);
    // top right
    cvs.moveTo(x+w-dw, y);
    cvs.lineTo(x+w, y);
    cvs.lineTo(x+w, y+dh);
    // bottom left
    cvs.moveTo(x, y+h-dh);
    cvs.lineTo(x, y+h);
    cvs.lineTo(x+dw, y+h);
    // bottom right
    cvs.moveTo(x+w-dw, y+h);
    cvs.lineTo(x+w, y+h);
    cvs.lineTo(x+w, y+h-dh);
    cvs.stroke();
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
            receive_stat.end();
            receive_stat.begin();

            result_ctx.clearRect(0, 0, result.width, result.height);
            overlay_ctx.clearRect(0, 0, overlay.width, overlay.height);
            if (messageEvent.data.indexOf("error") > 0) {
                console.error(messageEvent.data.error);
            } else {
                if (messageEvent.data == ""){
                    console.log("No Face");
                }
                else {
                    var jsonData = JSON.parse(messageEvent.data);
                    jsonData.FaceList.forEach(function(face) {
                        overlayResult(face, flip=true);
                    })
                    overlay_ctx.drawImage(result, 0, 0, overlay.width, overlay.height);
                }
            }
        }
    } catch (exception) {
        console.error(exception);
    }
}