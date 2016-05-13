


define(['three', 'TrackballControls', 'js-aruco/svd', 'js-aruco/posit1-patched', 'js-aruco/cv', 'js-aruco/aruco', 'threex/webcamgrabbing', 'threex/jsarucomarker', 'numeric'], function () {
    var POSITEST = {}
    if (!Array.prototype.fill) {
        Array.prototype.fill = function(x) {
            for (var i = 0; i < this.length; i++) {
                this[i] = x;
            }
        }
    }

    function disposeNode(node) {
        if (node instanceof THREE.Camera) {
            node = undefined;
        }
        else if (node instanceof THREE.Light) {
            node.dispose();
            node = undefined;
        }
        else if (node instanceof THREE.Mesh) {
            if (node.geometry) {
                node.geometry.dispose();
                node.geometry = undefined;
            }

            if (node.material) {
                if (node.material instanceof THREE.MeshFaceMaterial) {
                    $.each(node.material.materials, function (idx, mtrl) {
                        if (mtrl.map) mtrl.map.dispose();
                        if (mtrl.lightMap) mtrl.lightMap.dispose();
                        if (mtrl.bumpMap) mtrl.bumpMap.dispose();
                        if (mtrl.normalMap) mtrl.normalMap.dispose();
                        if (mtrl.specularMap) mtrl.specularMap.dispose();
                        if (mtrl.envMap) mtrl.envMap.dispose();

                        mtrl.dispose();    // disposes any programs associated with the material
                        mtrl = undefined;
                    });
                }
                else {
                    if (node.material.map) node.material.map.dispose();
                    if (node.material.lightMap) node.material.lightMap.dispose();
                    if (node.material.bumpMap) node.material.bumpMap.dispose();
                    if (node.material.normalMap) node.material.normalMap.dispose();
                    if (node.material.specularMap) node.material.specularMap.dispose();
                    if (node.material.envMap) node.material.envMap.dispose();

                    node.material.dispose();   // disposes any programs associated with the material
                    node.material = undefined;
                }
            }

            node = undefined;
        }
        else if (node instanceof THREE.Object3D) {
            node = undefined;
        }
    }   // disposeNode

    function disposeHierarchy(node, callback) {
        for (var i = node.children.length - 1; i >= 0; i--) {
            var child = node.children[i];
            disposeHierarchy(child, callback);
            callback(child);
        }
    }

    POSITEST.disposeHierarchy = disposeHierarchy;

    //require

    //各軸が行
    //http://marupeke296.com/DXG_No58_RotQuaternionTrans.html
    //xyzw
    POSITEST.fromMatrixToQuaternion = function (mat) {
        var elem = [0.0, 0.0, 0.0, 0.0];
        elem[0] = mat[0][0] - mat[1][1] - mat[2][2] + 1.0;
        elem[1] = -mat[0][0] + mat[1][1] - mat[2][2] + 1.0;
        elem[2] = -mat[0][0] - mat[1][1] + mat[2][2] + 1.0;
        elem[3] = mat[0][0] + mat[1][1] + mat[2][2] + 1.0;

        var biggestindex = 0;
        for (var i = 0; i < 4; i++) {
            if (elem[i] > elem[biggestindex]) {
                biggestindex = i;
            }
        }

        if (elem[biggestindex] < 0.0) {
            //console.log("ILLEGAL ARGUMENT");
            return null;
        }

        var q = [0.0, 0.0, 0.0, 0.0];
        var v = Math.sqrt(elem[biggestindex]) * 0.5;

        q[biggestindex] = v;
        var mult = 0.25 / v;

        switch (biggestindex) {
            case 0:
                q[1] = (mat[0][1] + mat[1][0]) * mult;
                q[2] = (mat[2][0] + mat[0][2]) * mult;
                q[3] = (mat[1][2] - mat[2][1]) * mult;
                break;
            case 1:
                q[0] = (mat[0][1] + mat[1][0]) * mult;
                q[2] = (mat[1][2] + mat[2][1]) * mult;
                q[3] = (mat[2][0] - mat[0][2]) * mult;
                break;
            case 2:
                q[0] = (mat[2][0] + mat[0][2]) * mult;
                q[1] = (mat[1][2] + mat[2][1]) * mult;
                q[3] = (mat[0][1] - mat[1][0]) * mult;
                break;
            case 3:
                q[0] = (mat[1][2] - mat[2][1]) * mult;
                q[1] = (mat[2][0] - mat[0][2]) * mult;
                q[2] = (mat[0][1] - mat[1][0]) * mult;
                break;
        }
        return q;
    }
    /**
    qはx,y,z,wの順
    */
    POSITEST.fromQuaternionToMatrix = function(q){
        var x = q[0];
        var y = q[1];
        var z = q[2];
        var w = q[3]; 
        return [[1 - 2 * y * y - 2 * z * z, 2 * x * y + 2 * w * z, 2 * x * z - 2 * w * y],
            [2 * x * y - 2 * w * z, 1 - 2 * x * x - 2 * z * z, 2 * y * z + 2 * w * x],
            [2 * x * z + 2 * w * y, 2 * y * z - 2 * w * x, 1 - 2 * x * x - 2 * y * y]];
    }

    POSITEST.createRotationMatrix = function (n, t) {
        var nx = n[0], ny = n[1], nz = n[2];
        var c = Math.cos(t), s = Math.sin(t);

        return [
            [nx * nx * (1 - c) + c, nx * ny * (1 - c) + nz * s, nx * nz * (1 - c) - ny * s],
            [nx * ny * (1 - c) - nz * s, ny * ny * (1 - c) + c, ny * nz * (1 - c) + nx * s],
            [nx * nz * (1 - c) + ny * s, ny * nz * (1 - c) - nx * s, nz * nz * (1 - c) + c]
        ]
    }

    //mapdataのフォーマット
    //マーカーの配列　各マーカーはidとpos,mat,sizeをキーとして持つ
    //id　マーカーのIDで整数
    //pos　マーカーの中心の位置の絶対座標
    //mat マーカーを上向きにおいたとき、右、手前、下をu,v,w軸と定義する　各列に順にu,v,wが納められた行列
    //size マーカーの絶対座標におけるサイズ
    POSITEST.positionEstimater = function (mapdata, ifdebug) {
        var _this = this;

        this.ifdebug = ifdebug;
        this.last_observation = null;
        this.updated_flag = false;
        this.focus = 2.5;
        this.last_estimation = null;
        this.updated_estimation_flag = false;

        this.n_marker = mapdata.length
        this.ids = []
        this.pos = {};
        this.mat = {};
        this.size = {};
        for (var i = 0; i < this.n_marker; i++) {
            var id = mapdata[i].id;

            this.ids.push(id);

            this.pos[id] = mapdata[i].pos;
            this.mat[id] = numeric.transpose(mapdata[i].mat);//必要なmatは各列が各マーカー座標基底だから
            this.size[id] = mapdata[i].size;
        }

        this.jsArucoMarker = new THREEx.JsArucoMarker();

        this.changeFocus = function(v){
            this.focus = v;
            this.jsArucoMarker.focus = v;
        }

        //デバッグ用の画面
        this.scene = null;
        if (this.ifdebug) {
            //画面の初期設定
            this.scene = {};
            this.scene.scene = new THREE.Scene();
            this.scene.camera = new THREE.PerspectiveCamera(70, 600.0 / 450.0, 0.1, 100000);
            this.scene.camera.position.set(100, 500, 100);
            this.scene.camera.rotation.set(0.44, 0.51, 0.37);
            this.scene.camera.lookAt({ "x": this.pos[mapdata[0].id][1], "y": this.pos[mapdata[0].id][1], "z": this.pos[mapdata[0].id][2] });
            this.scene.renderer = new THREE.WebGLRenderer({ alpha: true })
            this.scene.renderer.setClearColor(0x000000, 0.4);
            this.scene.renderer.setSize(600.0, 450.0);
            this.scene.renderer.domElement.style.position = "absolute";
            this.scene.renderer.domElement.style.top = '200px';
            this.scene.renderer.domElement.style.left = '200px';
            document.body.appendChild(this.scene.renderer.domElement);
            //オブジェクトモデルの作成
            this.scene.obj_marker = {}
            for (var i = 0; i < this.n_marker; i++) {
                var id = mapdata[i].id;
                //マーカー本体
                var geometry = new THREE.PlaneGeometry(this.size[id], this.size[id], 10, 10);
                var material = new THREE.MeshBasicMaterial({
                    wireframe: true
                })
                var marker_mesh = new THREE.Mesh(geometry, material);
                marker_mesh.position.x = this.pos[id][0];
                marker_mesh.position.y = this.pos[id][1];
                marker_mesh.position.z = this.pos[id][2];
                var q = POSITEST.fromMatrixToQuaternion(numeric.transpose(this.mat[id]));
                marker_mesh.quaternion.set(q[0], q[1], q[2], q[3]);
                //
                this.scene.obj_marker[id] = marker_mesh;
                this.scene.scene.add(marker_mesh);
            }
            function deleteCamera(id) {
                disposeHierarchy(_this.scene.obj_marker[id], function (child) {child.parent.remove(child) });
            }
            function addCamera(id, D, R) {
                //マーカーから見たカメラ
                geometry = new THREE.PlaneBufferGeometry(50.0, 25.0, 10, 10);
                material = new THREE.MeshBasicMaterial({
                    wireframe: true
                })
                var camera_mesh = new THREE.Mesh(geometry, material);
                var q = POSITEST.fromMatrixToQuaternion(numeric.transpose(R));
                camera_mesh.quaternion.set(q[0], q[1], q[2], q[3]);

                var v = numeric.dot(R, D);
                camera_mesh.position.set(v[0], v[1], v[2]);
                //カメラからマーカーの直線
                geometry = new THREE.Geometry();
                geometry.vertices.push(new THREE.Vector3(0.0,0.0,0.0));
                geometry.vertices.push(new THREE.Vector3(v[0], v[1], v[2]));

                var line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x990000 }));
                //
                _this.scene.obj_marker[id].add(camera_mesh);
                _this.scene.obj_marker[id].add(line);
            }
            //推定位置
            var geometry = new THREE.PlaneGeometry(100, 50, 10, 10);
            var material = new THREE.MeshBasicMaterial({
                wireframe: true,
                color: 0x0000ff
            })
            this.scene.estimatePose = new THREE.Mesh(geometry, material);
            this.scene.scene.add(this.scene.estimatePose);
            //
            geometry = new THREE.Geometry();
            geometry.vertices.push(new THREE.Vector3(0.0, 0.0, 100.0));
            geometry.vertices.push(new THREE.Vector3(-50.0, 25.0, 0.0));
            var line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x00ff00 }));
            this.scene.estimatePose.add(line);
            //
            geometry = new THREE.Geometry();
            geometry.vertices.push(new THREE.Vector3(0.0, 0.0, 100.0));
            geometry.vertices.push(new THREE.Vector3(50.0, 25.0, 0.0));
            line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x0000ff }));
            this.scene.estimatePose.add(line);
            geometry = new THREE.Geometry();
            geometry.vertices.push(new THREE.Vector3(0.0, 0.0, 100.0));
            geometry.vertices.push(new THREE.Vector3(50.0, -25.0, 0.0));
            line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x0000ff }));
            this.scene.estimatePose.add(line);
            geometry = new THREE.Geometry();
            geometry.vertices.push(new THREE.Vector3(0.0, 0.0, 100.0));
            geometry.vertices.push(new THREE.Vector3(-50.0, -25.0, 0.0));
            line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x0000ff }));
            this.scene.estimatePose.add(line);
            //床面
            var BaseLen = 1000;
            geometry = new THREE.PlaneGeometry(BaseLen, BaseLen, 10, 10);
            material = new THREE.MeshBasicMaterial({
                wireframe: true,
                color:0xffffff
            })
            var marker_mesh = new THREE.Mesh(geometry, material);
            this.scene.scene.add(marker_mesh);
            geometry = new THREE.Geometry();
            geometry.vertices.push(new THREE.Vector3(-BaseLen, 0.0, 0.0));
            geometry.vertices.push(new THREE.Vector3(BaseLen, 0.0, 0.0));
            var xline = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x990000, linewidth:10 }));
            this.scene.scene.add(xline);
            geometry = new THREE.Geometry();
            geometry.vertices.push(new THREE.Vector3(0.0, -BaseLen, 0.0));
            geometry.vertices.push(new THREE.Vector3(0.0, BaseLen, 0.0));
            var yline = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x009900, linewidth:10 }));
            this.scene.scene.add(yline);
            //カメラ移動系
            // トラックボールの作成
            console.log(THREE)
            var trackball = new THREE.TrackballControls(this.scene.camera);
            // 回転無効化と回転速度の設定
            trackball.noRotate = false; // false:有効 true:無効
            trackball.rotateSpeed = 1.0;
            // ズーム無効化とズーム速度の設定
            trackball.noZoom = false; // false:有効 true:無効
            trackball.zoomSpeed = 1.0;
            // パン無効化とパン速度の設定
            trackball.noPan = false; // false:有効 true:無効
            trackball.panSpeed = 1.0;
            // スタティックムーブの有効化
            trackball.staticMoving = true; // true:スタティックムーブ false:ダイナミックムーブ
            // ダイナミックムーブ時の減衰定数
            trackball.dynamicDampingFactor = 0.3;


            
            
            function animate() {
                // アニメーション
                requestAnimationFrame(animate);
                // トラックボールによるカメラのプロパティの更新
                trackball.update();
                // レンダリング
                if (_this.last_observation != null && _this.updated_flag) {
                    _this.updated_flag = false;
                    //各オブジェクトに対して
                    _this.ids.forEach(function (id) {
                        deleteCamera(id);
                    })
                    //観測にあるオブジェクトに対して
                    _this.last_observation.forEach(function (marker) {
                        addCamera(marker["id"], marker["D1"], marker["R1"]);
                    })
                }
                //
                if (_this.last_estimation != null && _this.updated_estimation_flag) {
                    _this.updated_estimation_flag = false;
                    var dict = _this.last_estimation
                    _this.scene.estimatePose.position.set(dict["x"][0], dict["x"][1], dict["x"][2]);
                    var q = POSITEST.fromMatrixToQuaternion(numeric.transpose(dict["R"]));
                    _this.scene.estimatePose.quaternion.set(q[0], q[1], q[2], q[3]);
                }
                //
                _this.scene.renderer.render(_this.scene.scene, _this.scene.camera);
            }
            animate();
        }

        this.updateEstimation = function (dict) {
            this.last_estimation = dict;
            this.updated_estimation_flag = true;
        }

        this.observeMarkers = function (domElement) {
            //var start_time = Date.now();
            //マーカーの取得
            var _this = this;
            //console.log("1", Date.now());
            var markers = this.jsArucoMarker.detectMarkers(domElement);
            //console.log("2", Date.now());
            if (markers.length == 0) {
                //console.log("No Marker Detected");
                return [];
            }

            delete_ids = []
            result_lst = {}
            //座標と姿勢を取得
            markers.forEach(function (marker) {
                var id = marker.id;
                //想定外のマーカーなら除外
                if (!(id in _this.mat)) {
                    //console.log("Not in map");
                    return;
                }
                //マーカーによる位置推定
                var pos = _this.jsArucoMarker.getMarkerPosition(marker);
                if (pos == null) {
                    return;
                }
                //
                var rot = pos.bestRotation;
                rot = [[rot[0][0], rot[1][0], -rot[2][0]],
                        [rot[0][1], rot[1][1], -rot[2][1]],
                        [-rot[0][2], -rot[1][2], rot[2][2]]];
                var trans = pos.bestTranslation;
                trans = [-trans[0], -trans[1], trans[2]];
                trans = numeric.mul(trans, _this.size[id]);
                var error = pos.bestError;
                var global_R = numeric.dot(_this.mat[id], rot);
                //重複していないときのみ追加
                if (id in result_lst) {
                    delete_ids.push(id);
                } else {
                    result_lst[id] = { "D1": trans, "R1": rot, "GR1":global_R, "E1":error, "Xm": _this.pos[id], "Rm": _this.mat[id], "id": id,"C":pos.corners,"size":_this.size[id] };
                }
            });
            //重複していたIDを削除
            delete_ids.forEach(function (id) {
                if (id in result_lst) {
                    delete result_lst[id];
                }
            })
            //結果を配列に変換
            var result_array = [];
            Object.keys(result_lst).forEach(function (key) {
                result_array.push(result_lst[key]);
            })

            //DEBUG表示用に保管しておく
            this.last_observation = result_array;
            this.updated_flag = true;
            return result_array;
        }

        this.averageRotationMatrix = function (R) {
            var R_ = [[0.0, 0.0, 0.0], [0.0, 0.0, 0.0], [0.0, 0.0, 0.0]];
            var n_marker = 0;
            R.forEach(function (r) {
                R_ = numeric.add(R_, r);

                n_marker += 1;
            });
            //平均姿勢行列を求める
            R_ = numeric.mul(R_, 1.0 / n_marker);
            var ret = numeric.svd(R_);
            R_ = numeric.dot(ret.U, numeric.transpose(ret.V));
            return R_;
        }
    }

    POSITEST.runPositestKalman = function (map, dict, opts) {
        var corner_threshold = 10000.0;//位置の分散がこれ以下のときのみコーナーの観測を用いる
        var use_corner = true;

        //ウェブカメラ起動
        var imageGrabbing = new THREEx.WebcamGrabbing(opts && ('stereo' in opts) ? opts.stereo : false);

        //画像を表示
        document.getElementById("example").insertBefore(imageGrabbing.domElement, document.getElementById("example").childNodes[0]);

        var domElement = imageGrabbing.domElement;
        dict["video"] = domElement;

        var estimater = new POSITEST.positionEstimater(map, opts && opts.debug);

        //カルマンフィルタの状態ベクトルは x,q,f,omegaの順
        //カルマンフィルタ関数群
        //pxとpy(画像中心が原点で横の長さが1.0のやつ)に対する観測行列部分を作成する mは点の座標
        //もしm_x_kが正なら、まずいことになるのでこの点の情報を捨てられるようにする
        function createPointH(m, x,q,f,didq,djdq,dkdq) {
            var Hx = []
            for (var _i = 0; _i < 2; _i++) {
                Hx.push(new Array(11).fill(0.0));
            }
            //
            var tmpR = POSITEST.fromQuaternionToMatrix(q);
            var i = tmpR[0], j = tmpR[1], k = tmpR[2];

            var m_x = numeric.sub(m, x);
            var m_x_i = numeric.dot(m_x, i);
            var m_x_j = numeric.dot(m_x, j);
            var m_x_k = numeric.dot(m_x, k);

            var dpxdx = numeric.mul(- f / (m_x_k * m_x_k), numeric.sub(numeric.mul(m_x_i, k), numeric.mul(m_x_k, i)));
            var dpydx = numeric.mul(- f / (m_x_k * m_x_k), numeric.sub(numeric.mul(m_x_j, k), numeric.mul(m_x_k, j)));
            var dpdij = numeric.mul(- f / m_x_k, m_x);
            var dpxdk = numeric.mul(- f * m_x_i / (m_x_k * m_x_k), m_x);
            var dpydk = numeric.mul(-f * m_x_j / (m_x_k * m_x_k), m_x);

            var dpxdq = numeric.add(numeric.dot(dpdij, didq), numeric.dot(dpxdk, dkdq));
            var dpydq = numeric.add(numeric.dot(dpdij, djdq), numeric.dot(dpydk, dkdq));
            
            Hx = numeric.setBlock(Hx, [0, 0], [0, 2], [dpxdx]);
            Hx = numeric.setBlock(Hx, [1, 0], [1, 2], [dpydx]);
            Hx = numeric.setBlock(Hx, [0, 3], [0, 6], [dpxdq]);
            Hx = numeric.setBlock(Hx, [1, 3], [1, 6], [dpydq]);

            Hx[0][7] = - m_x_i / m_x_k;
            Hx[1][7] = - m_x_j / m_x_k;

            var z_est = [- f * m_x_i / m_x_k, - f * m_x_j / m_x_k];

            
            return {
                H: Hx,
                Z: z_est,
                validity: !(m_x_k > 0.0)
            }
        }
        function calcHZ_marker(marker, x, q, f) {
            var qx = q[0], qy = q[1], qz = q[2], qw = q[3];
            var didq = [[0, -4 * qy, -4 * qz, 0],
                [2 * qy, 2 * qx, 2 * qw, 2 * qz],
                [2 * qz, -2 * qw, 2 * qx, -2 * qy]
            ];
            var djdq = [[2 * qy, 2 * qx, -2 * qw, -2 * qz],
                [-4 * qx, 0, -4 * qz, 0],
                [2 * qw, 2 * qz, 2 * qy, 2 * qx]
            ];
            var dkdq = [
                [2 * qz, 2 * qw, 2 * qx, 2 * qy],
                [-2 * qw, 2 * qz, 2 * qy, -2 * qx],
                [-4 * qx, -4 * qy, 0, 0]
            ];

            var H_marker = []
            var Z_marker = []
            var z_est = []
            var R_marker = []
            //各マーカー頂点
            var L = marker["size"]/2;
            var vertice = [[-L, L, 0], [L, L, 0], [L, -L, 0], [-L, -L, 0]];
            for (var _i = 0; _i < 4; _i++) {
                var p = numeric.dot(marker["Rm"], vertice[_i]);
                p = numeric.add(marker["Xm"], p);
                var Hx = createPointH(p, x, q, f, didq, djdq, dkdq);
                if (use_corner) {
                    if (Hx.validity) {
                        var delta_max = Math.max(Math.abs(Hx.Z[0] - marker["C"][_i][0]), Math.abs(Hx.Z[1] - marker["C"][_i][1]));
                        if (delta_max < 0.5) {
                            //観測行列
                            H_marker.push(Hx.H[0]);
                            H_marker.push(Hx.H[1]);
                            //実測値
                            Z_marker.push(marker["C"][_i][0]);
                            Z_marker.push(marker["C"][_i][1]);
                            //推定値
                            z_est.push(Hx.Z[0]);
                            z_est.push(Hx.Z[1]);
                            //測定誤差
                            R_marker = R_marker.concat([error_pixel, error_pixel])
                        }
                    }
                }
            }
            //直接観測と推定値の部分
            //x
            for (var _i = 0; _i < 3; _i++) {
                var tmp = new Array(11).fill(0.0);
                tmp[_i] = 1.0;
                H_marker.push(tmp);
            }
            var est_x = numeric.add(marker["Xm"], numeric.dot(marker["GR1"], marker["D1"]));
            R_marker = R_marker.concat([error_pos, error_pos, error_pos]);
            //IJK
            var start_i = H_marker.length;
            for (var i = 0; i < 9; i++) {
                var tmp = new Array(11).fill(0.0);
                H_marker.push(tmp);
            }
            H_marker = numeric.setBlock(H_marker, [start_i, 3], [start_i + 2, 6], didq);
            H_marker = numeric.setBlock(H_marker, [start_i+3, 3], [start_i + 5, 6], djdq);
            H_marker = numeric.setBlock(H_marker, [start_i+6, 3], [start_i + 8, 6], dkdq);
            var R_T = numeric.transpose(marker["GR1"]);
            Z_marker = Z_marker.concat(est_x, R_T[0], R_T[1], R_T[2]);

            R_T = POSITEST.fromQuaternionToMatrix(q);//fromQuaternionTOMatrixの戻り値において各行がカメラ座標系の基底
            z_est = z_est.concat(x, R_T[0], R_T[1], R_T[2]);
            R_marker = R_marker.concat([error_angle, error_angle, error_angle]);
            R_marker = R_marker.concat([error_angle, error_angle, error_angle]);
            R_marker = R_marker.concat([error_angle, error_angle, error_angle]);
            return {
                H: H_marker,
                Z: Z_marker,
                ZE: z_est,
                R: R_marker
            }
        }
        

        //初期状態
        var X = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.4,0.0,0.0,0.0];
        var s_init_pos = 1000000.0;
        var s_init_angle = 100.0;
        var s_init_focus = 0.1;
        var s_init_rot = 1.0;
        var P = numeric.diag([s_init_pos, s_init_pos, s_init_pos, s_init_angle, s_init_angle, s_init_angle, s_init_angle, s_init_focus,
        s_init_rot,s_init_rot,s_init_rot]);
        var P_dash = null;
        
        //状態遷移行列
        F = []
        for (var i = 0; i < 11; i++) {
            F.push(new Array(11).fill(0.0));
            if (i < 8) {
                F[i][i] = 1.0;
            }
        }

        //100ミリ秒くらいでの誤差の増分
        var s_dt_pos = 1.0;
        var s_dt_angle = 0.0;
        var s_dt_focus = 0.00001;
        var s_dt_rot = 0.01;
        var P_dt = numeric.diag([s_dt_pos, s_dt_pos, s_dt_pos, s_dt_angle, s_dt_angle, s_dt_angle, s_dt_angle, s_dt_focus,
        s_dt_rot,s_dt_rot,s_dt_rot]);
        //観測誤差
        var error_pixel = 0.001;
        var error_pos = 10000.0;
        var error_angle = 0.2;
        var error_rot = 0.0001;

        var last_time = null;


        //モーションの変化を受信して画面の方向を計算するイベントハンドラ
        var latest_motion = [0.0, 0.0, 0.0];//最後に確認してからの足し合わせ
        var n_motion = 0;//足し合わせてあった数
        function motionEventHandler(event) {
            var motion = [event.rotationRate.alpha, event.rotationRate.beta, event.rotationRate.gamma];
            var sc_ori = screen.orientation.angle;//角速度は画面の向きが縦向きか横向きかにかかわらず表示されるのでそれの補正を行う
            //カメラ座標の向き+I,J,Kと角速度の軸+X,Y,Zの対応
            var newmotion = null;
            //console.log(sc_ori);
            if (sc_ori == 0) {
                //+I=+X, +J=+Y
                newmotion = [motion[0], motion[1], motion[2]];
            } else if (sc_ori == 90) {
                //+J=+X,-I=+Y
                newmotion = [-motion[1], motion[0], motion[2]];
            } else if (sc_ori == 180) {
                //+I=-X, +J=-Y
                newmotion = [-motion[0], -motion[1], motion[2]];
            } else if (sc_ori == 270) {
                newmotion = [motion[1], -motion[0], motion[2]];
            }
            motion = newmotion;
            latest_motion = numeric.add(latest_motion, motion);
            n_motion += 1;
            //console.log(motion)
        }
        window.addEventListener('devicemotion', motionEventHandler);

        var timerID = setInterval(function () {

            if (!(dict["run"])) {
                return;
            }
            console.log("Running")

            var markers = estimater.observeMarkers(domElement);

            var H = [];//観測行列
            var Z = [];//実測値ベクトル
            var ZE = [];//推定値ベクトル
            var R = [];//観測値の誤差分散ベクトル

            var omega = [0.0, 0.0, 0.0];
            if (n_motion > 0) {
                //最後に確認してからの平均
                omega = numeric.mul(1.0 / n_motion, latest_motion);
                omega = numeric.mul(1.0 / 3.14156, omega);//これをかけると、なぜかちょうどよくなる
                latest_motion = [0.0, 0.0, 0.0];
                n_motion = 0;
            }

            //カルマンフィルタ予測
            if (last_time == null) {
                //初回は特になにもしない
                last_time = Date.now();
                P_dash = numeric.clone(P);
            } else {
                var nowtime = Date.now();
                var dt = (nowtime - last_time) / 100;//100ミリ秒単位で
                //角度変化の部分のFを作る
                var qx = X[3], qy = X[4], qz = X[5], qw = X[6], wx = X[8], wy = X[9], wz = X[10];
                var F_motion = [
                    [1, wz, -wy, wx, 0, qw, -qz, qy],
                    [-wz, 1, wx, wy, 0, qz, qw, qx],
                    [wy, -wx, 1, wz, 0, -qy, qx, qw],
                    [-wx, -wy, -wz, 1, 0, -qx, -qy, -qz]
                ];
                F_motion = numeric.mul(F_motion, dt / 10);//角速度は1秒ごとの値であるため
                F_motion[0][0] = F_motion[1][1] = F_motion[2][2] = F_motion[3][3] = 1.0;
                F = numeric.setBlock(F, [3, 3], [6, 10], F_motion);
                //X更新
                var nextq = numeric.dot(F_motion, [X[3], X[4], X[5], X[6], X[7], X[8], X[9], X[10]]);
                nextq = numeric.mul(1.0 / numeric.norm2(nextq),nextq);
                X[3] = nextq[0], X[4] = nextq[1], X[5] = nextq[2], X[6] = nextq[3];
                X[8] = X[9] = X[10] = 0.0;
                //P更新
                P_dash = numeric.add(numeric.dot(F, numeric.dot(P, numeric.transpose(F))), numeric.mul(dt * dt, P_dt));
                last_time = nowtime;
            }

            //各速度の観測
            var H_motion = []
            for (var i = 0; i < 3; i++) {
                var arr = new Array(11).fill(0);
                H_motion.push(arr);
                H_motion[i][8 + i] = 1.0;
            }
            H = H.concat(H_motion);
            Z = Z.concat(omega);
            ZE = ZE.concat([0.0, 0.0, 0.0]);
            R = R.concat([error_rot, error_rot, error_rot]);

            

            //マーカー観測による行列の作成
            if (markers.length > 0) {
                var _x = [X[0], X[1], X[2]];
                var _q = [X[3], X[4], X[5], X[6]];
                var _f = X[7];

                for (var i = 0; i < markers.length; i++) {
                    var ret = calcHZ_marker(markers[i], _x, _q, _f);
                    H = H.concat(ret.H);
                    Z = Z.concat(ret.Z);
                    ZE = ZE.concat(ret.ZE);
                    R = R.concat(ret.R);
                }

                markers = [];
            }



            //観測があればカルマンフィルタにより更新
            if (R.length > 0) {
                R = numeric.diag(R);

                //カルマンフィルタ更新
                var E = numeric.sub(Z, ZE);
                var S = numeric.add(numeric.dot(H, numeric.dot(P_dash, numeric.transpose(H))), R);
                var K = numeric.dot(P_dash, numeric.dot(numeric.transpose(H), numeric.inv(S)));
                X = numeric.add(X, numeric.dot(K, E));
                P = numeric.dot(numeric.sub(numeric.diag(new Array(K.length).fill(1.0)), numeric.dot(K, H)), P_dash);
                //クォータニオンの正規化
                var tmpq = [X[3], X[4], X[5], X[6]]
                tmpq = numeric.div(tmpq, numeric.norm2(tmpq));
                X[3] = tmpq[0];
                X[4] = tmpq[1];
                X[5] = tmpq[2];
                X[6] = tmpq[3];
                //焦点距離の正規化
                if (X[7] < 1.0) {
                    X[7] = 1.0;
                } else if (X[7] > 2.0) {
                    X[7] = 2.0;
                }

                dict["x"] = [X[0], X[1], X[2]]
                dict["R"] = numeric.transpose(POSITEST.fromQuaternionToMatrix(tmpq));
                dict["f"] = X[7];
                //
                estimater.updateEstimation(dict);
                estimater.changeFocus(X[7]);
            }
        }, 50);
    }

    /**
    画像の座標は、画像の横の長さが1.0で、中央が原点、右、上が順にx,y座標となるようなものと定める
    Ax - 画像中の特徴点の画像上での位置ベクトル(x,y)を行ベクトルとする行列
    AX - 実世界での特徴点の位置ベクトル（ただし全て同一平面上にあるとする）の位置ベクトル(X,Y)を行ベクトルとする行列
    
    https://www.cs.ubc.ca/grads/resources/thesis/May09/Dubrofsky_Elan.pdf
    
    あまりよくは動いていない？
    */
    POSITEST.cameraCalibrationHomography = function (Ax, AX) {
        var A = []
        for (var i = 0; i < Ax.length; i++) {
            var x = AX[i][0];
            var y = AX[i][1];
            var u = Ax[i][0];
            var v = Ax[i][1];
            A.push([-x, -y, -1.0, 0.0, 0.0, 0.0, u * x, u * y, u]);
            A.push([0.0, 0.0, 0.0, -x, -y, -1.0, v * x, v * y, v]);
        }
        A.push([0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]);
        var Asvd = numeric.svd(A);
        var h = numeric.transpose(Asvd.V)[8];
        var H = [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], h[8]]];
        var h12 = [H[0][0] - H[0][1], H[1][0] - H[1][1], H[2][0] - H[2][1]];
        var f = (h12[0] * h12[0] + h12[1] * h12[1]) / (h12[2] * h12[2]);
        return f;
    }

    POSITEST.calibrateFromMarker = function (pose,size) {
        var Ax = pose.corners;
        var AX = [[-size / 2.0, -size / 2.0, size / 2.0, size / 2.0], [size / 2.0, -size / 2.0, -size / 2.0, size / 2.0]];
        AX = numeric.transpose(AX);
        var f = POSITEST.cameraCalibrationHomography(Ax, AX);
        return f;
    }

    return POSITEST;
})