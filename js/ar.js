define(['engine/block', 'engine/scene', 'engine/utils', 'three.js/build/three', 'three.js/examples/js/libs/stats.min', 'three.js/examples/js/controls/TrackballControls', 'js-aruco/svd', 'js-aruco/posit1-patched', 'js-aruco/cv', 'js-aruco/aruco', 'threex/webcamgrabbing', 'threex/imagegrabbing', 'threex/videograbbing', 'threex/jsarucomarker', 'numeric', 'posit_est'], function (block_class, arcanoid_scene, UTILS) {
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
    //FOR DEBUG
    //オブジェクトの作成
    var geometry = new THREE.BoxGeometry(1, 1, 1);
    var material = new THREE.MeshNormalMaterial();
    var cube = new THREE.Mesh(geometry, material);
    cube.position.x = 0;
    cube.position.y = 0;
    cube.position.z = 0;
    scene.scene.add(cube);

    //
    var geometry = new THREE.PlaneGeometry(5, 5, 10, 10)
    var material = new THREE.MeshBasicMaterial({
        wireframe: true
    })
    var mesh = new THREE.Mesh(geometry, material);
    scene.scene.add(mesh);

    var mesh = new THREE.AxisHelper
    scene.scene.add(mesh);
    //END FOR DEBUG
    scene.load_geometry();
    scene.create_particle_system();
    scene.animate();

    //カメラの座標などを保持しておく場所
    var map = [
        { "id": 10, "pos": [150.0, 455.0, 140.0], "mat": [[1.0, 0.0, 0.0], [0.0, 0.0, 1.0], [0.0, -1.0, 0.0]], "size": 85.0 },
        { "id": 100, "pos": [-130.0, 497.0, 155.0], "mat": [[1.0, 0.0, 0.0], [0.0, 0.0, 1.0], [0.0, -1.0, 0.0]], "size": 85.0 },
        { "id": 90, "pos": [-192.0, 397.0, 168.0], "mat": [[0.0, 1.0, 0.0], [0.0, 0.0, 1.0], [1.0, 0.0, 0.0]], "size": 85.0 },
        { "id": 150, "pos": [-192.0, 281.0, 205.0], "mat": [[0.0, 1.0, 0.0], [0.0, 0.0, 1.0], [1.0, 0.0, 0.0]], "size": 85.0 },
        { "id": 70, "pos": [-47.0, 505.0, 65.0], "mat": [[0.0, 0.0, -1.0], [1.0, 0.0, 0.0], [0.0, -1.0, 0.0]], "size": 57.0 },
        { "id": 30, "pos": [26.0, 492.0, 190.0], "mat": [[-1.0, 0.0, 0.0], [0.0, 0.0, -1.0], [0.0, -1.0, 0.0]], "size": 57.0 }
    ]
    var pos = [0.0, 0.0, 5.0];
    var rotation = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]];
    var dict = { "x": pos, "R": rotation ,"f":1.0, "video": null};

    //内部でdictを更新し続ける位置推定ルーチンを動かす
    POSITEST.runPositestKalman(map, dict);

    var rotx = 0.0;
    var roty = 0.0;
    var rotz = 0.0;
    var render = function () {
        f = dict["f"];
        var fovW = Math.atan2(0.5, f) * 2 * 180 / 3.1415;//canvas横の視野角
        if (dict["video"] != null) {
            var video = dict["video"];
            var vW = video.videoWidth;
            var vH = video.videoHeight;
            if (vW / vH > window.innerHeight / window.innerWidth) {//videoが縦長
                fovW *= (vH * window.innerWidth / vW / window.innerHeight);
            }
            else {//videoが横長
                //横の角度は変わらないのでなにもしない
            }
        }
        scene.camera.fov = fovW * window.innerHeight / window.innerWidth;
        scene.camera.updateProjectionMatrix()
        scene.camera.position.x = dict["x"][0];
        scene.camera.position.y = dict["x"][1];
        scene.camera.position.z = dict["x"][2];
        //RzRyRx行列の各列が順にグローバル座標でのi,j,kとなっているから転置
        var q = POSITEST.fromMatrixToQuaternion(numeric.transpose(dict["R"]));
        var quaternion = scene.camera.quaternion;
        quaternion.set(q[0], q[1], q[2], q[3]);
        quaternion.normalize();
    }

    setInterval(render, 20);
});