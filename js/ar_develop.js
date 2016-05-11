define(['io','three.js/build/three', 'three.js/examples/js/libs/stats.min', 'numeric', 'posit_est'], function (io,a1, a2, a3, POSITEST){
    //音声
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    var context = new AudioContext();

    // Audio 用の buffer を読み込む
    var getAudioBuffer = function (url, fn) {
        var req = new XMLHttpRequest();
        // array buffer を指定
        req.responseType = 'arraybuffer';

        req.onreadystatechange = function () {
            if (req.readyState === 4) {
                if (req.status === 0 || req.status === 200) {
                    // array buffer を audio buffer に変換
                    context.decodeAudioData(req.response, function (buffer) {
                        // コールバックを実行
                        fn(buffer);
                    });
                }
            }
        };

        req.open('GET', url, true);
        req.send('');
    };

    // サウンドを再生
    var playSound = function (buffer) {
        // source を作成
        var source = context.createBufferSource();
        // buffer をセット
        source.buffer = buffer;
        // context に connect
        source.connect(context.destination);
        // 再生
        source.start(0);
    };
    //音声読み込み
    var audio_bound = null;
    getAudioBuffer('/sound/bound.mp3', function (buffer) {
        // 読み込み完了後にボタンにクリックイベントを登録
        audio_bound = buffer;
    });
    var audio_complete = null;
    getAudioBuffer('/sound/complete.mp3', function (buffer) {
        // 読み込み完了後にボタンにクリックイベントを登録
        audio_complete = buffer;
    });


    //phenox
    var phenox_pos = [0.0, 0.0, 100.0]
    //地図
    var block_map = []

    //通信部分
    var isConnected = false;
    var socket = null;
    //イベントハンドラ
    function event_px_position(data) {
        phenox_pos[0] = data[0];
        phenox_pos[1] = data[1]+200.0;
    }
    function event_bar_position(data) {

    }
    function event_reflect(data) {
        console.log("reflect")
        playSound(audio_bound);
        
    }
    function event_hit(data) {
        deleteBlock(data);
        console.log("hit")
    }
    function event_complete(data) {
        console.log("complete")
        playSound(audio_complete);
    }
    function event_gameover(data) {
        console.log("game over")
    }
    function event_timeup(data) {
        console.log("time up")
    }
    function event_map(data) {
        console.log("get map")
        for (key in block_mesh) {
            deleteBlock(key);
        }
        block_map = []
        for (key in data) {
            var block = data[key];
            var block = {
                id: key,
                x: block[0],
                y: block[1]+200,
                xL: block[2],
                yL: block[3]
            }
            block_map.push(block);
            addBlock(block);
        }
    }
    //
    function connect() {
        if (socket != null && socket.connected) { return; }
        var uri = "https://ailab-mayfestival2016-server.herokuapp.com";
        socket = io.connect(uri, { transports: ['websocket'] });
        socket.on('connect', function () {
            socket.on('px_position', event_px_position);
            socket.on('bar_position', event_bar_position);
            socket.on('reflect', event_reflect);
            socket.on('hit', event_hit);
            socket.on('complete', event_complete);
            socket.on('gameover', event_gameover);
            socket.on('timeup', event_timeup);
            socket.on('map', event_map);
            socket.on('disconnect', function (data) {
                isConnected = false;
            });
            isConnected = true;
            console.log("connected");
            socket.emit("enter_room", { 'room': "Client" });
        });
    }
    function sendData(event, room, data) {
        if (isConnected) {
            socket.emit("transfer", {
                'event': eventName,
                'room': room,
                'data': data
            });
        }
    }
    //接続開始
    connect()


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

    //ふぇのっくす
    var phenox_mesh = null;
    (function () {
        var geometry = new THREE.BoxGeometry(30, 30, 30);
        var material = new THREE.MeshNormalMaterial();
        phenox_mesh = new THREE.Mesh(geometry, material);
        phenox_mesh.position.x = 0.0;
        phenox_mesh.position.y = 0.0;
        phenox_mesh.position.z = 0.0;
        scene.add(phenox_mesh);
    })();

    //オブジェクトの作成

    /*
    for (var i = -1; i < 2; i++) {
        for (var j = -1; j < 2; j++) {
            var geometry = new THREE.BoxGeometry(50, 50, 50);
            var material = new THREE.MeshNormalMaterial(
                {
                    wireframe: true,
                    color:'#ffffff'
                });
            var cube = new THREE.Mesh(geometry, material);
            cube.position.x = i * 100.0;
            cube.position.y = 300.0 + j * 100.0;
            cube.position.z = 100.0;
            scene.add(cube);
        }
    }

    //
    var geometry = new THREE.PlaneGeometry(85, 85, 10, 10)
    var material = new THREE.MeshBasicMaterial({
        wireframe: true
    })
    var mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = -130.0;
    mesh.position.y = 497.0;
    mesh.position.z = 155.0;
    mesh.rotation.x = 3.1415 / 2.0;
    scene.add(mesh);

    var mesh = new THREE.AxisHelper
    scene.add(mesh);*/
    
    //壁
    var geometry = new THREE.PlaneGeometry(350, 4000, 10, 10)
    var material = new THREE.MeshBasicMaterial({
        wireframe: true
    })
    var mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = 175;
    mesh.position.y = 200;
    mesh.position.z = 0;
    mesh.rotation.x = 3.1415 / 2.0;
    scene.add(mesh);
    //
    var geometry = new THREE.PlaneGeometry(350, 4000, 10, 10)
    var material = new THREE.MeshBasicMaterial({
        wireframe:true
    })
    var mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = 175;
    mesh.position.y = 450;
    mesh.position.z = 0;
    mesh.rotation.x = 3.1415 / 2.0;
    scene.add(mesh);
    //
    var geometry = new THREE.PlaneGeometry(4000, 250, 10, 10)
    var material = new THREE.MeshBasicMaterial({
        wireframe: true
    })
    var mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = 0;
    mesh.position.y = 325;
    mesh.position.z = 0;
    mesh.rotation.y = 3.1415 / 2.0;
    scene.add(mesh);
    //
    var geometry = new THREE.PlaneGeometry(4000, 250, 10, 10)
    var material = new THREE.MeshBasicMaterial({
        wireframe: true
    })
    var mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = 350;
    mesh.position.y = 325;
    mesh.position.z = 0;
    mesh.rotation.y = 3.1415 / 2.0;
    scene.add(mesh);

    var mesh = new THREE.AxisHelper
    scene.add(mesh);

    var block_mesh = {};
    var block_mother = new THREE.Object3D();
    scene.add(block_mother);
    function addBlock(block) {
        var geometry = new THREE.BoxGeometry(block.xL, block.xY,100);
        var material = new THREE.MeshNormalMaterial();
        var cube = new THREE.Mesh(geometry, material);
        cube.position.x = block.x;
        cube.position.y = block.y;
        cube.position.z = 100.0;
        console.log("add",block.id,block.xL,block.yL,block.x,block.y)
        block_mother.add(cube);
        block_mesh[block.id] = cube;
    }
    function deleteBlock(id) {
        console.log("delte",id)
        disposeHierarchy(block_mesh[id], function (child) {
            child.parent.remove(child);
        })
        block_mother.remove(block_mesh[id]);
    }

    camera.position.z = 5;

    //カメラの座標などを保持しておく場所
    var pos = [0.0, 0.0, 5.0];
    var rotation = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]];
    var dict = { "x": pos, "R": rotation, "f": 1.0, "video": null };

    //内部でdictを更新し続ける位置推定ルーチンを動かす
    var map = [
        { "id": 10, "pos": [150.0, 455.0, 140.0], "mat": [[1.0, 0.0, 0.0], [0.0, 0.0, 1.0], [0.0, -1.0, 0.0]], "size": 85.0 },
        { "id": 100, "pos": [-130.0, 497.0, 155.0], "mat": [[1.0, 0.0, 0.0], [0.0, 0.0, 1.0], [0.0, -1.0, 0.0]], "size": 85.0 },
        { "id": 90, "pos": [-192.0, 397.0, 168.0], "mat": [[0.0, 1.0, 0.0], [0.0, 0.0, 1.0], [1.0, 0.0, 0.0]], "size": 85.0 },
        { "id": 150, "pos": [-192.0, 281.0, 205.0], "mat": [[0.0, 1.0, 0.0], [0.0, 0.0, 1.0], [1.0, 0.0, 0.0]], "size": 85.0 },
        { "id": 70, "pos": [-47.0, 505.0, 65.0], "mat": [[0.0, 0.0, -1.0], [1.0, 0.0, 0.0], [0.0, -1.0, 0.0]], "size": 57.0 },
        { "id": 30, "pos": [26.0, 492.0, 190.0], "mat": [[-1.0, 0.0, 0.0], [0.0, 0.0, -1.0], [0.0, -1.0, 0.0]], "size":57.0 }
    ]

    POSITEST.runPositestKalman(map, dict);

    var rotx = 0.0;
    var roty = 0.0;
    var rotz = 0.0;
    var render = function () {
        requestAnimationFrame(render);

        //phenoxの位置更新
        phenox_mesh.position.x = phenox_pos[0];
        phenox_mesh.position.y = phenox_pos[1];
        phenox_mesh.position.z = phenox_pos[2];

        //
        f = dict["f"];
        //f = 1.3;
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

        /*
        console.log("--------------")
        console.log(dict["x"]);
        for (var i = 0; i < 3; i++) {
            console.log(dict["R"][i])
        }
        */

        //描画
        renderer.render(scene, camera);
    }

    //Chromeならconsole.logでデバッグ表示できる
    console.log("render loop start!!");
    render();
});