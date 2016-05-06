define(['three', 'three.js/examples/js/libs/stats.min', 'js-aruco/svd', 'js-aruco/posit1-patched', 'js-aruco/cv', 'js-aruco/aruco', 'threex/webcamgrabbing', 'threex/imagegrabbing', 'threex/videograbbing', 'threex/jsarucomarker', 'numeric', 'posit_est'], function (block_class, arcanoid_scene, UTILS) {
    //シーンの作成
    var scene = new THREE.Scene();
    //第一引数のfovは角度？
    var camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

    var renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = '0px';
    renderer.domElement.style.left = '0px';
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
    var geometry = new THREE.PlaneGeometry(60, 60, 10, 10)
    var material = new THREE.MeshBasicMaterial({
        wireframe: true
    })
    var mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    var mesh = new THREE.AxisHelper
    scene.add(mesh);

    camera.position.z = 5;

    //カメラの座標などを保持しておく場所
    var pos = [0.0, 0.0, 5.0];
    var rotation = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]];
    var dict = { "x": pos, "R": rotation,"f":1.0,"video":null };

    //内部でdictを更新し続ける位置推定ルーチンを動かす
    posest_inner(dict);

    var rotx = 0.0;
    var roty = 0.0;
    var rotz = 0.0;
    var render = function () {
        requestAnimationFrame(render);

        //
        f = dict["f"];
        var fovW = Math.atan2(0.5, f) *2 * 180 / 3.1415;//canvas横の視野角
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
        camera.fov = fovW * window.innerHeight / window.innerWidth;
        camera.updateProjectionMatrix()
        camera.position.x = dict["x"][0];
        camera.position.y = dict["x"][1];
        camera.position.z = dict["x"][2];
        //RzRyRx行列の各行が順にグローバル座標でのi,j,kとなっているから転置
        var q = POSITEST.fromMatrixToQuaternion(numeric.transpose(dict["R"]));
        var quaternion = camera.quaternion;
        quaternion.set(q[0],q[1], q[2], q[3]);
        quaternion.normalize();


        //描画
        renderer.render(scene, camera);
    }

    //Chromeならconsole.logでデバッグ表示できる
    console.log("render loop start!!");
    render();
});

function posest_inner(dict) {
    //dictのxとRにそれぞれグローバル座標系でのカメラの位置とカメラ座標基底(I右、J上、K手前)が各列の行列を入れる
    //markerのmatは各「行」が各方向のベクトルになっていることに注意
    
    var map = [{ "id": 0, "pos": [-7.5, 7.5, 0.0], "mat": [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]], "size": 5.0 },
		{ "id": 10, "pos": [7.5, 7.5, 0.0], "mat": [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]], "size": 5.0 },
		{ "id": 20, "pos": [-7.5, -7.5, 0.0], "mat": [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]], "size": 5.0 },
		{ "id": 30, "pos": [7.5, -7.5, 0.0], "mat": [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]], "size": 5.0 },
		{ "id": 40, "pos": [0.0, 15.2, 5.5], "mat": [[1.0, 0.0, 0.0], [0.0, 0.0, 1.0], [0.0, -1.0, 0.0]], "size": 5.0 },
		{ "id": 50, "pos": [15.5, 0.0, 5.0], "mat": [[0.0, -1.0, 0.0], [0.0, 0.0, 1.0], [-1.0, 0.0, 0.0]], "size": 5.0 },
		{ "id": 60, "pos": [0.0, -14.5, 5.0], "mat": [[-1.0, 0.0, 0.0], [0.0, 0.0, 1.0], [0.0, 1.0, 0.0]], "size": 5.0 },
		{ "id": 70, "pos": [-17.5, 0.0, 5.0], "mat": [[0.0, 1.0, 0.0], [0.0, 0.0, 1.0], [1.0, 0.0, 0.0]], "size": 5.0 }]
    
    /*
    var onVert = [[0.0, -1.0, 0.0], [0.0, 0.0, 1.0], [-1.0, 0.0, 0.0]];
    var onHori = [[0.0, -1.0, 0.0], [1.0, 0.0, 0.0], [0.0, 0.0, 1.0]];
    var size = 5.0;
    var map = [
        { "id": 0, "pos": [8.5, 6.5, 9.9], "mat": onVert },
        { "id": 10, "pos": [8.5, 0.3, 9.9], "mat": onVert },
        { "id": 20, "pos": [8.5, -5.4, 7.4], "mat": onVert },
        { "id": 30, "pos": [8.5, 5.7, 3.5], "mat": onVert },
        { "id": 40, "pos": [8.5, -0.4, 3.5], "mat": onVert },
        { "id": 50, "pos": [8.5, -6.6, 3.5], "mat": onVert },
        { "id": 60, "pos": [5.6, 6.4, 0.0], "mat": onHori },
        { "id": 70, "pos": [5.6, 0.4, 0.0], "mat": onHori },
        { "id": 80, "pos": [5.6, -5.5, 0.0], "mat": onHori },
        { "id": 90, "pos": [-0.7, 6.4, 0.0], "mat": onHori }
    ]
    for (var i = 0; i < map.length; i++) {
        map[i]["size"] = size;
    }*/
    /*
    var onHori = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]];
    var onVert = [[1.0, 0.0, 0.0], [0.0, 0.0, 1.0], [0.0, -1.0, 0.0]];
    var size = 18.4;
    var L = 59.5;
    var map = [
        { "id": 0, "pos": [-L, -L, 0.0] ,"mat":onHori},
        { "id": 10, "pos": [-L, 0.0, 0.0], "mat": onHori },
        { "id": 20, "pos": [-L, L, 0.0], "mat": onHori },
        { "id": 30, "pos": [0.0, -L, 0.0], "mat": onHori },
        { "id": 40, "pos": [0.0, 0.0, 0.0], "mat": onHori },
        { "id": 50, "pos": [0.0, L, 0.0], "mat": onHori },
        { "id": 60, "pos": [L, -L, 0.0], "mat": onHori },
        { "id": 70, "pos": [L, 0.0, 0.0], "mat": onHori },
        { "id": 80, "pos": [L, L, 0.0], "mat": onHori },
        { "id": 190, "pos": [0.0, L + 100.0, 105.0], "mat": onVert }
    ]
    for (var i = 0; i < map.length; i++) {
        map[i]["size"] = size;
    }*/
    /*
    var map=[
        { "id": 30, "pos": [-50.0, 0.0, 45.0], "mat": [[0.0, 1.0, 0.0], [0.0, 0.0, 1.0], [1.0, 0.0, 0.0]], "size": 75 },
        { "id": 70, "pos": [0.0, 60.0, 35.0], "mat": [[1.0, 0.0, 0.0], [0.0, 0.0, 1.0], [0.0, -1.0, 0.0]], "size": 75 }
    ]
    */
    var imageGrabbing = new THREEx.WebcamGrabbing();

    //画像を表示
    document.body.appendChild(imageGrabbing.domElement);

    var domElement = imageGrabbing.domElement;
    dict["video"] = domElement;

    var estimater = new POSITEST.positionEstimater(map);

    var f = 1.0;
    var n = 0.01;

    var prev = [1.0, 0.0, 0.0];

    var markers = [];

    var counter = 0;

    var timerID = setInterval(function () {
        //観測したマーカーを逐一ためていく
        var new_markers = estimater.observeMarkers(domElement);
        markers = markers.concat(new_markers);
        
        var pos_ = null;
        //定期的にたまったマーカーに対し処理
        if (counter == 0) {
            if (markers.length > 0) {
                //マーカーの情報をパース
                var R = []
                var Xm = []
                var D = []
                markers.forEach(function (marker) {
                    R.push(marker["GR1"]);
                    Xm.push(marker["Xm"]);
                    D.push(marker["D1"]);
                });
                var R_ = estimater.averageRotationMatrix(R);
                var n_marker = R.length;
                //位置推定
                if (n_marker > 1) {
                    //マーカーが二個以上あれば焦点距離を更新
                    console.log(n_marker,markers.length);
                    var f_wo = estimater.estimate_without_f(R_, Xm, D, n_marker);
                    if (f_wo > 0.5 && f_wo < 2.0) {
                        f = (n * f + _pos["f_wo"]) / (n + 1);
                        n = n + 1;
                        dict["f"] = f;
                    }
                }
                if (n_marker > 0) {
                    //マーカーがあれば位置推定
                    var _pos = estimater.estimate_with_f(R_, Xm, D, n_marker, dict["f"]);
                    dict["x"] = _pos["x"];
                    dict["R"] = _pos["R"];
                }
                //array初期化
                markers = [];
            }
        }
        //更新処理
        counter += 1;
        if (counter == 3) {
            counter = 0;
        }
    }, 10);
}