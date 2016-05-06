define(['engine/block', 'engine/scene', 'engine/utils', 'three.js/examples/js/libs/stats.min', 'js-aruco/svd', 'js-aruco/posit1-patched', 'js-aruco/cv', 'js-aruco/aruco', 'threex/webcamgrabbing', 'threex/imagegrabbing', 'threex/videograbbing', 'threex/jsarucomarker', 'numeric', 'posit_est'], function (block_class, arcanoid_scene, UTILS) {
    /*
    //シーンの作成
    var scene = new THREE.Scene();
    //第一引数のfovは角度？
    var camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

    var renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    //画面サイズが変更された際のイベントハンドら
    function onWindowReSize() {
        camera.aspect = window.innerWidth / window.innerHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", onWindowReSize, false);

    //オブジェクトの作成
    var geometry = new THREE.BoxGeometry(1, 1, 1);
    var material = new THREE.MeshNormalMaterial();
    var cube = new THREE.Mesh(geometry, material);
    cube.position.x = 0;
    cube.position.y = 0;
    cube.position.z = 0;
    scene.add(cube);

    //
    var geometry = new THREE.PlaneGeometry(10, 10, 10, 10)
    var material = new THREE.MeshBasicMaterial({
        wireframe: true
    })
    var mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    var mesh = new THREE.AxisHelper
    scene.add(mesh);

    camera.position.z = 5;*/

    var scene = new arcanoid_scene();

    var map = [];
    for (var i = 0; i < 100; i++) {
        map.push({
            x: i % 10,
            y: Math.floor(i / 10),
            color: UTILS.PCB_COLORS[UTILS.randi(0, UTILS.PCB_COLORS.length)]
        })
    }
    scene.init_controls();
    scene.init_environment_default();
    scene.set_environment("ar");
    scene.init_blocks(map);
    scene.load_geometry();
    scene.create_particle_system();
    scene.animate();

    //カメラの座標などを保持しておく場所
    var pos = [0.0, 0.0, 5.0];
    var rotation = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]];
    var dict = { "x": pos, "R": rotation };

    //内部でdictを更新し続ける位置推定ルーチンを動かす
    posest_inner(dict);

    var rotx = 0.0;
    var roty = 0.0;
    var rotz = 0.0;
    var render = function () {
        scene.camera.position.x = dict["x"][0];
        scene.camera.position.y = dict["x"][1];
        scene.camera.position.z = dict["x"][2];
        //RzRyRx行列の各行が順にグローバル座標でのi,j,kとなっているから転置
        var q = POSITEST.fromMatrixToQuaternion(numeric.transpose(dict["R"]));
        var quaternion = scene.camera.quaternion;
        quaternion.set(q[0],q[1], q[2], q[3]);
        quaternion.normalize();
    }

    setInterval(render, 20);
});

function posest_inner(dict) {
    var map = [{ "id": 0, "pos": [-7.5, 7.5, 0.0], "mat": [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]], "size": 5.0 },
		{ "id": 10, "pos": [7.5, 7.5, 0.0], "mat": [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]], "size": 5.0 },
		{ "id": 20, "pos": [-7.5, -7.5, 0.0], "mat": [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]], "size": 5.0 },
		{ "id": 30, "pos": [7.5, -7.5, 0.0], "mat": [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]], "size": 5.0 },
		{ "id": 40, "pos": [0.0, 15.2, 5.5], "mat": [[1.0, 0.0, 0.0], [0.0, 0.0, 1.0], [0.0, -1.0, 0.0]], "size": 5.0 },
		{ "id": 50, "pos": [15.5, 0.0, 5.0], "mat": [[0.0, -1.0, 0.0], [0.0, 0.0, 1.0], [-1.0, 0.0, 0.0]], "size": 5.0 },
		{ "id": 60, "pos": [0.0, -14.5, 5.0], "mat": [[-1.0, 0.0, 0.0], [0.0, 0.0, 1.0], [0.0, 1.0, 0.0]], "size": 5.0 },
		{ "id": 70, "pos": [-17.5, 0.0, 5.0], "mat": [[0.0, 1.0, 0.0], [0.0, 0.0, 1.0], [1.0, 0.0, 0.0]], "size": 5.0 }]
    //var imageGrabbing = new THREEx.ImageGrabbing("images/test2.jpg");
    //var imageGrabbing = new THREEx.VideoGrabbing("videos/sample.3gp");
    var imageGrabbing = new THREEx.WebcamGrabbing();

    //画像を表示
    document.body.appendChild(imageGrabbing.domElement);

    var domElement = imageGrabbing.domElement;

    var estimater = new POSITEST.positionEstimater(map);

    var f = 1.0;
    var n = 1.0;

    var timerID = setInterval(function () {
        var _pos = estimater.est_pos(domElement, 1.0, true);

        if (_pos != null) {

            //表示
            console.log("-----CAMERA POSITION-------")
            console.log("position:%5.2f, %5.2f, %5.2f", _pos["x"][0], _pos["x"][1], _pos["x"][2]);
            console.log("rotation");
            for (var i = 0; i < 3; i++) {
                console.log("%5.2f, %5.2f, %5.2f", _pos["R"][i][0], _pos["R"][i][1], _pos["R"][i][2]);
            }
            console.log("f %.2f", _pos["f_wo"]);
            console.log("ave. f %.2f", f);

            //更新
            f = (n * f + _pos["f_wo"]) / (n + 1);
            n = n + 1;

            //
            dict["x"] = _pos["x"];
            dict["R"] = _pos["R"];
        }
    }, 50);
}