var THREEx = THREEx || {};

/**
 * Handle jsaruco markers
 * @constructor
 */

THREEx.JsArucoMarker = function(){
	var _this = this;

	this.debugEnabled = true;
	this.videoScaleDown = 5;
	this.modelSize = 1.0; //unit length
	this.focus = 1.3;

	var canvasElement = document.createElement('canvas');
	var context = canvasElement.getContext("2d");

	// create debug element
	var debugElement	= document.createElement('div');
	debugElement.appendChild(canvasElement);
	debugElement.style.position = 'absolute';
	debugElement.style.top = '200px';
	debugElement.style.left = '0px';
	debugElement.style.opacity = 0.8;
	
	var debugInfoElement	= document.createElement('div');
	debugElement.appendChild( debugInfoElement );
	debugInfoElement.classList.add('info');
	debugInfoElement.innerHTML = ''
		+ '<div>canvasSize: <span class="canvasSize">n/a</span></div>'
		+ '<div>videoScaleDown: <span class="videoScaleDown">n/a</span></div>'
		+ '<div>videoSize: <span class="videoSize">n/a</span></div>';
	
	/**
	 * Detect Marker in a videoElement or imageElement
	 *
	 * @param {HTMLVideoElement|HTMLImageElement} videoElement - the source element
	 * @return {Object[]} - array of found markers
	 */
	this.detectMarkers = function(videoElement){
		// if domElement is a video
		if( videoElement instanceof HTMLVideoElement ){
			// if no new image for videoElement do nothing
			if (videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA){
				console.log("videoElement.readyState");
				return []
			}

			canvasElement.width = videoElement.videoWidth/_this.videoScaleDown
			canvasElement.height = videoElement.videoHeight/_this.videoScaleDown
		// if domElement is a image
		}else if( videoElement instanceof HTMLImageElement ){
			if( videoElement.naturalWidth === 0 ){
				console.log("videoElement.naturalWidth==0");
				return []
			}

			canvasElement.width = videoElement.naturalWidth/_this.videoScaleDown
			canvasElement.height = videoElement.naturalHeight/_this.videoScaleDown
		}else console.assert(false)

		// get imageData from videoElement
		context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
		var imageData = context.getImageData(0, 0, canvasElement.width, canvasElement.height);

	    // detect markers
		var detector = new AR.Detector();
		var markers = detector.detect(imageData);
		//console.log("%d Markers detected at jsarucomarker",markers.length);

		//////////////////////////////////////////////////////////////////////////////////
		//		update debug
		//////////////////////////////////////////////////////////////////////////////////

		// TODO put that in a special class ?

		var debugAttached = debugElement.parentNode !== null ? true : false

		if( this.debugEnabled === true && debugAttached === false ){
			document.body.appendChild(debugElement)
		}

		if( this.debugEnabled === false && debugAttached === true ){
			debugElement.parentNode.removeChild( debugElement )
		}

		// display markers on canvas for debug
		if( this.debugEnabled === true ){
			debugElement.querySelector('.info .videoScaleDown').innerHTML = this.videoScaleDown
			if( videoElement.videoWidth !== undefined ){
				debugElement.querySelector('.info .videoSize').innerHTML = videoElement.videoWidth + 'x' + videoElement.videoHeight
			}else{
				debugElement.querySelector('.info .videoSize').innerHTML = videoElement.naturalWidth + 'x' + videoElement.naturalHeight				
			}
			debugElement.querySelector('.info .canvasSize').innerHTML = canvasElement.width + 'x' + canvasElement.height
			drawDebug(markers, canvasElement)
		}

		//////////////////////////////////////////////////////////////////////////////////
		//		TO COMMENT
		//////////////////////////////////////////////////////////////////////////////////

		// return the result
		return markers
	};
	
	this.getMarkerPosition = function(marker){
		// convert corners coordinate - not sure why
		// 画面中央を0,0とし、左、上方向がそれぞれ+x,+yの座標
		// cornersの最初の要素はマーカーの左上の頂点位置
		//console.log("getMarkerPosition");
	    var corners = []//marker.corners;
        //console.log("1",Date.now())
		for (var i = 0; i < marker.corners.length; ++ i){
			corners.push({
				x : marker.corners[i].x - (canvasElement.width / 2),
				y : (canvasElement.height / 2) - marker.corners[i].y,
			})
		}
		//console.log("2", Date.now())
	    // compute the pose from the canvas
        var posit = new POS.Posit(this.modelSize, canvasElement.width * this.focus);
        //console.log("3", Date.now())
        var pose = posit.pose(corners);
        //console.log("4", Date.now())
		console.assert(pose !== null)
		if (pose === null) return null;

		normal_corners = []
		for (var i = 0; i < marker.corners.length; i++) {
		    normal_corners.push([corners[i].x / canvasElement.width, corners[i].y / canvasElement.width]);
		}
		pose.corners = normal_corners;
		//console.log("5", Date.now())
		return pose;
	}

	return;

	//////////////////////////////////////////////////////////////////////////////////
	//		Comments
	//////////////////////////////////////////////////////////////////////////////////

	/**
	* draw corners on a canvas - useful to debug
	*
	* @param {Object[]} markers - array of found markers
	*/
	function drawDebug(markers, canvasElement){
		var context = canvasElement.getContext("2d");
		context.lineWidth = 3;

		for (var i = 0; i < markers.length; ++ i){
			var marker = markers[i]
			var corners = marker.corners;

			context.strokeStyle = "red";
			context.beginPath();

			for (var j = 0; j < corners.length; ++ j){
				var corner = corners[j];
				context.moveTo(corner.x, corner.y);
				corner = corners[(j + 1) % corners.length];
				context.lineTo(corner.x, corner.y);
			}

			context.stroke();
			context.closePath();

			context.strokeStyle = "green";
			context.strokeRect(corners[0].x - 2, corners[0].y - 2, 4, 4);
			context.strokeStyle = "#00ffff";
			context.strokeRect(corners[1].x - 2, corners[1].y - 2, 4, 4);
			context.strokeStyle = "#ff00ff";
			context.strokeRect(corners[2].x - 2, corners[2].y - 2, 4, 4);
			context.strokeStyle = "#ffff00";
			context.strokeRect(corners[3].x - 2, corners[3].y - 2, 4, 4);
			// console.log('marker', marker.id)

			context.fillStyle = "blue";
			context.font = "bold 10px Arial";
			context.fillText("id: "+marker.id, corners[0].x, corners[0].y);
		}
	};
}
