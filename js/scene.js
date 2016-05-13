define(['io','engine/block', 'engine/scene', 'engine/utils', 'three', 'three.js/examples/js/libs/stats.min', 'numeric', 'posit_est'], function (io,block_class, arcanoid_scene, UTILS,a1,a2,a3,POSITEST) {
    //‰¹º
    var SCENE = {};
    SCENE.init = function(environment, stereo, opts) {
        var texture_set = null;
        if (opts && opts.hires) {
            texture_set = UTILS.HIRES_TEXTURES;
        }
        var scene = new arcanoid_scene(texture_set);

        var fence = [[120, 0, 0], [120, 400, 0], [-120, 400, 0], [-120, 0, 0]];

        //scene.init_controls();
        if (stereo) {
            SCENE.stereo = stereo;
            scene.default_renderer = scene.effect;
        }
        scene.init_environment_default();
        scene.set_environment(environment);
        scene.init_materials(!(opts && !opts.opaque));
        scene.load_geometry();
        scene.create_particle_system();
        scene.animate();
        document.getElementById("example").addEventListener('click', scene.fullscreen.bind(scene), false);

        SCENE.scene = scene;

        var material = new THREE.LineBasicMaterial({
            color: 0x0f0fff,
            linewidth: 10,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });

        var geometry = new THREE.Geometry();
        for (var i = 0; i < fence.length - 1; i++) {
            var l = [fence[i+1][0] - fence[i][0], fence[i+1][1] - fence[i][1], fence[i+1][2] - fence[i][2]];
            var length = Math.sqrt(l[0]*l[0] + l[1]*l[1] + l[2]*l[2]);
            for (var k = 0; k <= length; k+=40.0) {
                var inc = k/length;
                geometry.vertices.push(
                    new THREE.Vector3( fence[i][0] + l[0]*(inc + Math.random()/50.0 - 0.01), fence[i][1] + l[1]*(inc + Math.random()/50.0 - 0.01), fence[i][2] + l[2]*inc)
                );
            }
        }
        var lines_count = 10;
        var lines = [];
        for (var i = 0; i < lines_count; i++) {
            lines.push(new THREE.Line( geometry.clone(), material ));
            scene.scene.add( lines[i] );
        }

        scene.add_update_callback(function(dt) {
            for (var i = 0; i < lines.length; i++) {
                for (var j = 0; j < lines[i].geometry.vertices.length; j++) {
                    lines[i].geometry.vertices[j].z = Math.random()*40 - 20;
                }
                lines[i].geometry.verticesNeedUpdate = true;
            }
            console.log(10);
        });

        var geometry = new THREE.PlaneGeometry(200, 500, 10, 10);
        var material = new THREE.MeshBasicMaterial({
            wireframe: true,
            color: 0xffffff
        })
        groundPlane = new THREE.Mesh(geometry, material);
        groundPlane.position.y = 250
        if (!opts || !opts.hide_debug) {
            scene.scene.add(groundPlane);
        }

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
        SCENE.bar_mesh = bar_mesh;
        SCENE.bar_pos = [0.0, 100.0, 0.0]



        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        SCENE.context = new AudioContext();
        SCENE.audio_bound = null;
        getAudioBuffer('./sound/bound.mp3', function (buffer) {
            // “Ç‚Ýž‚ÝŠ®—¹Œã‚Éƒ{ƒ^ƒ“‚ÉƒNƒŠƒbƒNƒCƒxƒ“ƒg‚ð“o˜^
            SCENE.audio_bound = buffer;
        });
        SCENE.audio_hit = null;
        getAudioBuffer('./sound/hit.mp3', function (buffer) {
            // “Ç‚Ýž‚ÝŠ®—¹Œã‚Éƒ{ƒ^ƒ“‚ÉƒNƒŠƒbƒNƒCƒxƒ“ƒg‚ð“o˜^
            SCENE.audio_hit = buffer;
        });
        SCENE.audio_explosion = null;
        getAudioBuffer('./sound/explosion.mp3', function (buffer) {
            // “Ç‚Ýž‚ÝŠ®—¹Œã‚Éƒ{ƒ^ƒ“‚ÉƒNƒŠƒbƒNƒCƒxƒ“ƒg‚ð“o˜^
            SCENE.audio_explosion = buffer;
        });
        SCENE.audio_complete = null;
        getAudioBuffer('./sound/complete.mp3', function (buffer) {
            // “Ç‚Ýž‚ÝŠ®—¹Œã‚Éƒ{ƒ^ƒ“‚ÉƒNƒŠƒbƒNƒCƒxƒ“ƒg‚ð“o˜^
            SCENE.audio_complete = buffer;
        });

        SCENE.phenox_mesh = null;
        (function () {
            var geometry = new THREE.BoxGeometry(30, 30, 30);
            var material = new THREE.MeshNormalMaterial();
            SCENE.phenox_mesh = new THREE.Mesh(geometry, material);
            SCENE.phenox_mesh.position.x = 0.0;
            SCENE.phenox_mesh.position.y = 0.0;
            SCENE.phenox_mesh.position.z = 100.0;
            SCENE.scene.scene.add(SCENE.phenox_mesh);
        })();

        //phenox
        SCENE.phenox_pos = [0.0, 0.0, 100.0]
        //’n}
        SCENE.block_map = {};

        //’ÊM•”•ª
        SCENE.isConnected = false;
        SCENE.socket = null;
    }

    // Audio —p‚Ì buffer ‚ð“Ç‚Ýž‚Þ
    var getAudioBuffer = function (url, fn) {
        var req = new XMLHttpRequest();
        // array buffer ‚ðŽw’è
        req.responseType = 'arraybuffer';

        req.onreadystatechange = function () {
            if (req.readyState === 4) {
                if (req.status === 0 || req.status === 200) {
                    // array buffer ‚ð audio buffer ‚É•ÏŠ·
                    SCENE.context.decodeAudioData(req.response, function (buffer) {
                        // ƒR[ƒ‹ƒoƒbƒN‚ðŽÀs
                        fn(buffer);
                    });
                }
            }
        };

        req.open('GET', url, true);
        req.send('');
    };

    // ƒTƒEƒ“ƒh‚ðÄ¶
    var playSound = function (buffer) {
        // source ‚ðì¬
        var source = SCENE.context.createBufferSource();
        // buffer ‚ðƒZƒbƒg
        source.buffer = buffer;
        // context ‚É connect
        source.connect(SCENE.context.destination);
        // Ä¶
        source.start(0);
    };
    //‰¹º“Ç‚Ýž‚Ý

    //ƒCƒxƒ“ƒgƒnƒ“ƒhƒ‰
    function event_px_position(data) {
        console.log(data);
        SCENE.phenox_pos[0] = data[0];
        SCENE.phenox_pos[1] = data[1] + 160.0;
        if (data.length == 3) {
            SCENE.phenox_pos[2] = data[2];
        }
    }
    function event_bar_position(data) {
        console.log("bar ->", data);
        SCENE.bar_pos[0] = data;
    }

    function event_abort(data) {
        //$(".background_div").show();
    }
    function event_opening(data) {
        $(".background_div").show();
    }
    function event_game_start(data) {
        $(".background_div").addClass("fade");
        setTimeout(function() {
            console.log("hide")
            $(".background_div").hide();
            $(".background_div").removeClass("fade");
        }, 2000);
    }
    function event_reflect(data) {
        console.log("reflect")
        playSound(SCENE.audio_bound);

    }
    function event_hit(data) {
        SCENE.scene.kill_block(data);
        playSound(SCENE.audio_explosion);
        console.log("hit", data);
    }
    function event_complete(data) {
        console.log("complete")
        playSound(SCENE.audio_complete);
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
        SCENE.block_map = {}
        for (key in data) {
            var block = data[key];
            var block = {
                id: key,
                x: block[0],
                y: block[1] + 160,
                x_scale: block[2],
                y_scale: block[3],
                color: [block[4][0]/255.0, block[4][1]/255.0, block[4][2]/255.0]
            }
            SCENE.block_map[key] = block;
            //addBlock(block);
        }
        SCENE.scene.set_blocks(SCENE.block_map)
    }
    //
    SCENE.connect = function() {
        if (SCENE.socket != null && SCENE.socket.connected) { return; }
        var uri = "https://ailab-mayfestival2016-server.herokuapp.com";
        SCENE.socket = io.connect(uri, { transports: ['websocket'] });
        SCENE.socket.on('connect', function () {
            SCENE.socket.on('px_position', event_px_position);
            SCENE.socket.on('bar_position', event_bar_position);
            SCENE.socket.on('reflect', event_reflect);
            SCENE.socket.on('hit', event_hit);
            SCENE.socket.on('complete', event_complete);
            SCENE.socket.on('gameover', event_gameover);
            SCENE.socket.on('timeup', event_timeup);
            SCENE.socket.on('map', event_map);
            SCENE.socket.on('opening', event_opening);
            SCENE.socket.on('game_start', event_game_start);
            SCENE.socket.on('abort', event_abort);
            SCENE.socket.on('disconnect', function (data) {
                SCENE.isConnected = false;
            });
            SCENE.isConnected = true;
            console.log("connected");
            SCENE.socket.emit("enter_room", { 'room': "Client" });
        });
    }
    SCENE.sendData = function(event, room, data) {
        if (isConnected) {
            socket.emit("transfer", {
                'event': eventName,
                'room': room,
                'data': data
            });
        }
    }

    SCENE.test = function(){
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
        setTimeout(event_opening, 5000);
        setTimeout(event_game_start, 50000);
        //setTimeout(event_game_init, 55000);
        event_map(mapp);
        var kkk = 0;
        //setInterval(function() {event_hit(kkk++)}, 2000);
    };
    //test();

    //Ú‘±ŠJŽn

    //ƒV[ƒ“‚Ìì¬

    SCENE.start = function(ar) {

        if (ar) {
            //ƒJƒƒ‰‚ÌÀ•W‚È‚Ç‚ð•ÛŽ‚µ‚Ä‚¨‚­êŠ
            var pos = [0.0, 0.0, 5.0];
            var rotation = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]];
            var dict = { "x": pos, "R": rotation, "f": 1.0, "video": null };

            //“à•”‚Ådict‚ðXV‚µ‘±‚¯‚éˆÊ’u„’èƒ‹[ƒ`ƒ“‚ð“®‚©‚·
            var map = [
                { "id": 10, "pos": [-150.0, 232.0, 92.0], "mat": [[0.0, 1.0, 0.0], [0.0, 0.0, 1.0], [1.0, 0.0, 0.0]], "size": 85.0 },
                { "id": 100, "pos": [-150.0, 382.0, 97.0], "mat": [[0.0, 1.0, 0.0], [0.0, 0.0, 1.0], [1.0, 0.0, 0.0]], "size": 85.0 },
                { "id": 150, "pos": [-72.0, 505.0, 87.0], "mat": [[1.0, 0.0, 0.0], [0.0, 0.0, 1.0], [0.0, -1.0, 0.0]], "size": 85.0 },
                { "id": 90, "pos": [72.0, 460.0, 82.0], "mat": [[1.0, 0.0, 0.0], [0.0, 0.0, 1.0], [0.0, -1.0, 0.0]], "size": 85.0 },
                { "id": 70, "pos": [0.0, 71, 0.0], "mat": [[0.0, 1.0, 0.0], [-1.0, 0.0, 0.0], [0.0, 0.0, 1.0]], "size": 57.0 },
            ];

            //“à•”‚Ådict‚ðXV‚µ‘±‚¯‚éˆÊ’u„’èƒ‹[ƒ`ƒ“‚ð“®‚©‚·
            var opts = null;
            if (SCENE.stereo) {
                opts = {stereo: true};
            }
            POSITEST.runPositestKalman(map, dict, opts);
            var rotx = 0.0;
            var roty = 0.0;
            var rotz = 0.0;
        }
        var render = function () {
            SCENE.phenox_mesh.position.x = SCENE.phenox_pos[0];
            SCENE.phenox_mesh.position.y = SCENE.phenox_pos[1];
            SCENE.phenox_mesh.position.z = SCENE.phenox_pos[2];

            SCENE.bar_mesh.position.x = SCENE.bar_pos[0];
            SCENE.bar_mesh.position.y = SCENE.bar_pos[1] - 135;
            SCENE.bar_mesh.position.z = SCENE.bar_pos[2];

            if (ar) {

                f = dict["f"];
                var fovW = Math.atan2(0.5, f) * 2 * 180 / 3.1415;//canvas‰¡‚ÌŽ‹–ìŠp
                if (dict["video"] != null) {
                    var video = dict["video"];
                    var vW = video.videoWidth;
                    var vH = video.videoHeight;
                    if (vW / vH > window.innerHeight/ window.innerWidth) {//video‚ªc’·
                        fovW *= (vH * (window.innerWidth) / vW / window.innerHeight);
                    }
                    else {//video‚ª‰¡’·
                        //‰¡‚ÌŠp“x‚Í•Ï‚í‚ç‚È‚¢‚Ì‚Å‚È‚É‚à‚µ‚È‚¢
                    }
                }
                SCENE.scene.camera.fov = fovW * window.innerHeight/ window.innerWidth;
                SCENE.scene.camera.updateProjectionMatrix()
                SCENE.scene.camera.position.x = dict["x"][0];
                SCENE.scene.camera.position.y = dict["x"][1];
                SCENE.scene.camera.position.z = dict["x"][2];
                //RzRyRxs—ñ‚ÌŠe—ñ‚ª‡‚ÉƒOƒ[ƒoƒ‹À•W‚Å‚Ìi,j,k‚Æ‚È‚Á‚Ä‚¢‚é‚©‚ç“]’u
                var q = POSITEST.fromMatrixToQuaternion(numeric.transpose(dict["R"]));
                var quaternion = SCENE.scene.camera.quaternion;
                quaternion.set(q[0], q[1], q[2], q[3]);
                quaternion.normalize();
            }

        }

        setInterval(render, 20);
    }
    return SCENE

});
