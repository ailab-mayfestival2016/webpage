define(['three', 'SPE'], function () {
	var countdown = function (secs) {
        this.camera = new THREE.PerspectiveCamera(90, 1, 0.001, 1000);
        this.camera.position.set(0, 20, 0);

        this.scene = new THREE.Scene();
        this.scene.add(this.camera);

            var material = new THREE.MeshPhongMaterial({
        color: 0xdddddd
    });
    var textGeom = new THREE.TextGeometry( 'Hello World!', {
        font: 'font/gentilis.bold' // Must be lowercase!
    });
    var textMesh = new THREE.Mesh( textGeom, material );

    scene.add( textMesh );

    // Do some optional calculations. This is only if you need to get the
    // width of the generated text
    textGeom.computeBoundingBox();
    textGeom.textWidth = textGeom.boundingBox.max.x - textGeom.boundingBox.min.x;


	}

	countdown.render = function(renderer) {

	}
	countdown.render_with_effect = function(effect) {

	}

});