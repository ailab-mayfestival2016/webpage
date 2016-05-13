define(['io','three', 'three.js/examples/js/libs/stats.min', 'numeric', 'posit_est'], function (io,a1, a2, a3, POSITEST){
    //����
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    var context = new AudioContext();

    // Audio �p�� buffer ��ǂݍ���
    var getAudioBuffer = function (url, fn) {
        var req = new XMLHttpRequest();
        // array buffer ���w��
        req.responseType = 'arraybuffer';

        req.onreadystatechange = function () {
            if (req.readyState === 4) {
                if (req.status === 0 || req.status === 200) {
                    // array buffer �� audio buffer �ɕϊ�
                    context.decodeAudioData(req.response, function (buffer) {
                        // �R�[���o�b�N�����s
                        fn(buffer);
                    });
                }
            }
        };

        req.open('GET', url, true);
        req.send('');
    };

    // �T�E���h���Đ�
    var playSound = function (buffer) {
        // source ���쐬
        var source = context.createBufferSource();
        // buffer ���Z�b�g
        source.buffer = buffer;
        // context �� connect
        source.connect(context.destination);
        // �Đ�
        source.start(0);
    };
    //�����ǂݍ���
    var audio_bound = null;
    getAudioBuffer('/sound/bound.mp3', function (buffer) {
        // �ǂݍ��݊�����Ƀ{�^���ɃN���b�N�C�x���g��o�^
        audio_bound = buffer;
    });
    var audio_complete = null;
    getAudioBuffer('/sound/complete.mp3', function (buffer) {
        // �ǂݍ��݊�����Ƀ{�^���ɃN���b�N�C�x���g��o�^
        audio_complete = buffer;
    });
    var audio_gameover = null;
    getAudioBuffer('/sound/gameover.mp3', function (buffer) {
        // �ǂݍ��݊�����Ƀ{�^���ɃN���b�N�C�x���g��o�^
        audio_gameover = buffer;
    });
    var audio_hit = null;
    getAudioBuffer('/sound/hit.mp3', function (buffer) {
        // �ǂݍ��݊�����Ƀ{�^���ɃN���b�N�C�x���g��o�^
        audio_hit = buffer;
    });


    //phenox
    var phenox_pos = [0.0, 0.0, 100.0]
    //�n�}
    var block_map = []

    //�ʐM����
    var isConnected = false;
    var socket = null;
    //�C�x���g�n���h��
    function event_px_position(data) {
        phenox_pos[0] = data[0];
        phenox_pos[1] = data[1];
    }
    function event_bar_position(data) {

    }
    function event_reflect(data) {
        console.log("reflect")
        playSound(audio_bound); 
    }
    function event_hit(data) {
        deleteBlock(data);
        playSound(audio_hit);
        console.log("hit");
    }
    function event_complete(data) {
        console.log("complete")
        playSound(audio_complete);
    }
    function event_gameover(data) {
        console.log("game over")
        playSound(audio_gameover);
    }
    function event_timeup(data) {
        console.log("time up")
        playSound(audio_gameover);
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
                yL: block[3],
                r: block[4][0]/255.0,
                g: block[4][1]/255.0,
                b: block[4][2]/255.0,
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
    //�ڑ��J�n
    connect();


    //�V�[���̍쐬
    var scene = new THREE.Scene();
    //��������fov�͊p�x�H
    var camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

    var renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = '0px';
    renderer.domElement.style.left = '0px';
    document.body.appendChild(renderer.domElement);

    //��ʃT�C�Y���ύX���ꂽ�ۂ̃C�x���g�n���h��
    function onWindowReSize() {
        camera.aspect = window.innerWidth / window.innerHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", onWindowReSize, false);

    //�ӂ��̂�����
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

    //�I�u�W�F�N�g�̍쐬

    var mesh = new THREE.AxisHelper
    scene.add(mesh);

    var block_mesh = {};
    var block_mother = new THREE.Object3D();
    scene.add(block_mother);
    function addBlock(block) {
        var geometry = new THREE.BoxGeometry(block["xL"], block["yL"],100);
        var material = new THREE.MeshNormalMaterial();
        var cube = new THREE.Mesh(geometry, material);
        cube.position.x = block["x"];
        cube.position.y = block["y"];
        cube.position.z = 100.0;
        block_mother.add(cube);
        block_mesh[block["id"]] = cube;
    }
    function deleteBlock(id) {
        console.log("delte",id)
        POSITEST.disposeHierarchy(block_mesh[id], function (child) {
            child.parent.remove(child);
        })
        block_mother.remove(block_mesh[id]);
    }

    camera.position.z = 5;

    //�J�����̍��W�Ȃǂ�ێ����Ă����ꏊ
    var pos = [0.0, 0.0, 5.0];
    var rotation = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]];
    var dict = { "x": pos, "R": rotation, "f": 1.0, "video": null };

    //������dict���X�V��������ʒu���胋�[�`���𓮂���
    var map = [
        { "id": 100, "pos": [-41.0, 464.0, 161.0], "mat": [[0.994, -0.05, -0.133], [0.05, 0.05, 0.995], [-0.043, -0.998, 0.052]], "size": 85.0 },
        { "id": 50, "pos": [52.5, 460.0, 83.8], "mat": [[1.0, 0.0, 0.0], [0.0, 0.0, 1.0], [0.0, -1.0, 0.0]], "size": 85.0 },
        { "id": 90, "pos": [170.0,278.5, 121.5], "mat": [[0.0, -1.0, 0.0], [0.0, 0.0, 1.0], [-1.0, 0.0, 0.0]], "size": 85.0 },
        { "id": 10, "pos": [170.0,118.5, 153.5], "mat": [[0.0, -1.0, 0.0], [0.0, 0.0, 1.0], [-1.0, 0.0, 0.0]], "size": 85.0 },
        { "id": 150, "pos": [170.0,-24.0, 130.5], "mat": [[0.0, -1.0, 0.0], [0.0, 0.0, 1.0], [-1.0, 0.0, 0.0]], "size": 85.0 },
        { "id": 70, "pos": [-68.5, 0.0, 0.0], "mat": [[0.0, 1.0, 0.0], [-1.0, 0.0, 0.0], [0.0, 0.0, 1.0]], "size": 57.0 }
    ]
    POSITEST.runPositestKalman(map, dict);

    var rotx = 0.0;
    var roty = 0.0;
    var rotz = 0.0;
    var render = function () {
        requestAnimationFrame(render);

        //phenox�̈ʒu�X�V
        phenox_mesh.position.x = phenox_pos[0];
        phenox_mesh.position.y = phenox_pos[1];
        phenox_mesh.position.z = phenox_pos[2];

        //
        f = dict["f"];
        //f = 1.3;
        var fovW = Math.atan2(0.5, f) *2 * 180 / 3.1415;//canvas���̎���p
        if (dict["video"] != null) {
            var video = dict["video"];
            var vW = video.videoWidth;
            var vH = video.videoHeight;
            if (vW / vH > window.innerHeight / window.innerWidth) {//video���c��
                fovW *= (vH * window.innerWidth / vW / window.innerHeight);
            }
            else {//video������
                //���̊p�x�͕ς��Ȃ��̂łȂɂ����Ȃ�
            }
        }
        camera.fov = fovW * window.innerHeight / window.innerWidth;
        camera.updateProjectionMatrix()
        camera.position.x = dict["x"][0];
        camera.position.y = dict["x"][1];
        camera.position.z = dict["x"][2];
        //RzRyRx�s��̊e�s�����ɃO���[�o�����W�ł�i,j,k�ƂȂ��Ă��邩��]�u
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

        //�`��
        renderer.render(scene, camera);
    }

    //Chrome�Ȃ�console.log�Ńf�o�b�O�\���ł���
    console.log("render loop start!!");
    render();
});