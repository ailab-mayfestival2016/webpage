define(['io','engine/block', 'engine/scene', 'engine/utils', 'three', 'three.js/examples/js/libs/stats.min', 'numeric', 'posit_est'], function (io,block_class, arcanoid_scene, UTILS,a1,a2,a3,POSITEST) {
    //音声
    var scene = new arcanoid_scene();

    //scene.init_controls();
    scene.default_renderer = scene.effect;
    scene.init_environment_default();
    scene.set_environment("ar");
    scene.init_materials(true);
    scene.load_geometry();
    scene.create_particle_system();
    scene.animate();
    console.log(scene.element);
    scene.element.addEventListener('click', scene.fullscreen.bind(scene), false);

    var geometry = new THREE.PlaneGeometry(200, 500, 10, 10);
    var material = new THREE.MeshBasicMaterial({
        wireframe: true,
        color: 0xffffff
    })
    groundPlane = new THREE.Mesh(geometry, material);
    groundPlane.position.y = 250
    scene.scene.add(groundPlane);

    var geometry = new THREE.BoxGeometry(60, 1000, 10);
    var material = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.6
    });
    bar_mesh = new THREE.Mesh(geometry, material);
    bar_mesh.position.x = 0.0;
    bar_mesh.position.y = 40.0;
    bar_mesh.position.z = 100.0;
    scene.scene.add(bar_mesh);
    var bar_pos = [0.0, 100.0, 0.0]



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
    var audio_hit = null;
    getAudioBuffer('/sound/hit.mp3', function (buffer) {
        // 読み込み完了後にボタンにクリックイベントを登録
        audio_hit = buffer;
    });
    var audio_explosion = null;
    getAudioBuffer('/sound/explosion.mp3', function (buffer) {
        // 読み込み完了後にボタンにクリックイベントを登録
        audio_explosion = buffer;
    });
    var audio_complete = null;
    getAudioBuffer('/sound/complete.mp3', function (buffer) {
        // 読み込み完了後にボタンにクリックイベントを登録
        audio_complete = buffer;
    });


    //phenox
    var phenox_pos = [0.0, 0.0, 100.0]
    //地図
    var block_map = {};

    //通信部分
    var isConnected = false;
    var socket = null;
    //イベントハンドラ
    function event_px_position(data) {
        phenox_pos[0] = data[0];
        phenox_pos[1] = data[1] + 200.0;
    }
    function event_bar_position(data) {
        console.log("bar ->", data);
        bar_pos[0] = data;
    }

    function event_game_init(data) {
        $(".background_div").show();
    }
    function event_gameplay_start(data) {
        $(".background_div").addClass("fade");
        setTimeout(function() {
            console.log("hide")
            $(".background_div").hide();
            $(".background_div").removeClass("fade");
        }, 2000);
    }
    function event_reflect(data) {
        console.log("reflect")
        playSound(audio_hit);

    }
    function event_hit(data) {
        scene.kill_block(data);
        playSound(audio_explosion);
        console.log("hit", data);
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
        console.log("get map", data);
        /*for (key in block_mesh) {
            deleteBlock(key);
        }*/
        block_map = {}
        for (key in data) {
            var block = data[key];
            var block = {
                id: key,
                x: block[0],
                y: block[1] + 200,
                x_scale: block[2],
                y_scale: block[3],
                color: [block[4][0]/255.0, block[4][1]/255.0, block[4][2]/255.0]
            }
            block_map[key] = block;
            //addBlock(block);
        }
        scene.set_blocks(block_map)
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

    //カメラの座標などを保持しておく場所
    var pos = [0.0, 0.0, 5.0];
    var rotation = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]];
    var dict = { "x": pos, "R": rotation, "f": 1.0, "video": null };

    //内部でdictを更新し続ける位置推定ルーチンを動かす
    var map = [
        { "id": 10, "pos": [-150.0, 232.0, 92.0], "mat": [[0.0, 1.0, 0.0], [0.0, 0.0, 1.0], [1.0, 0.0, 0.0]], "size": 85.0 },
        { "id": 100, "pos": [-150.0, 382.0, 97.0], "mat": [[0.0, 1.0, 0.0], [0.0, 0.0, 1.0], [1.0, 0.0, 0.0]], "size": 85.0 },
        { "id": 150, "pos": [-72.0, 505.0, 87.0], "mat": [[1.0, 0.0, 0.0], [0.0, 0.0, 1.0], [0.0, -1.0, 0.0]], "size": 85.0 },
        { "id": 90, "pos": [72.0, 460.0, 82.0], "mat": [[1.0, 0.0, 0.0], [0.0, 0.0, 1.0], [0.0, -1.0, 0.0]], "size": 85.0 },
        { "id": 70, "pos": [0.0, 71, 0.0], "mat": [[0.0, 1.0, 0.0], [-1.0, 0.0, 0.0], [0.0, 0.0, 1.0]], "size": 57.0 },
    ];

    //内部でdictを更新し続ける位置推定ルーチンを動かす
    POSITEST.runPositestKalman(map, dict, {stereo: true});

    function test(){
        var mapp = {};
        for (var i = 0; i < 16; i++) {
            mapp[i] = [
                (i % 4)* 70 - 100,
                200 + (Math.floor(i / 4))* 70,
                50,
                50,
                [255, 0, 0],//UTILS.PCB_COLORS[UTILS.randi(0, UTILS.PCB_COLORS.length)]
            ];
        }
        setTimeout(event_game_init, 5000);
        setTimeout(event_gameplay_start, 7000);
        //setTimeout(event_game_init, 55000);
        event_map(mapp);
        var kkk = 0;
        //setInterval(function() {event_hit(kkk++)}, 2000);
    };
    //test();

    var rotx = 0.0;
    var roty = 0.0;
    var rotz = 0.0;
    var render = function () {
        /*phenox_mesh.position.x = phenox_pos[0];
        phenox_mesh.position.y = phenox_pos[1];
        phenox_mesh.position.z = phenox_pos[2];*/

        bar_mesh.position.x = bar_pos[0];
        bar_mesh.position.y = bar_pos[1] - 135;
        bar_mesh.position.z = bar_pos[2];

        f = dict["f"];
        var fovW = Math.atan2(0.5, f) * 2 * 180 / 3.1415;//canvas横の視野角
        if (dict["video"] != null) {
            var video = dict["video"];
            var vW = video.videoWidth;
            var vH = video.videoHeight;
            if (vW / vH > window.innerHeight/ window.innerWidth) {//videoが縦長
                fovW *= (vH * (window.innerWidth) / vW / window.innerHeight);
            }
            else {//videoが横長
                //横の角度は変わらないのでなにもしない
            }
        }
        scene.camera.fov = fovW * window.innerHeight/ window.innerWidth;
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
