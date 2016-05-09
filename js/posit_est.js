
var POSITEST = POSITEST || {};

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

    //mapdataのフォーマット
    //マーカーの配列　各マーカーはidとpos,mat,sizeをキーとして持つ
    //id　マーカーのIDで整数
    //pos　マーカーの中心の位置の絶対座標
    //mat マーカーを上向きにおいたとき、右、手前、下をu,v,w軸と定義する　各列に順にu,v,wが納められた行列
    //size マーカーの絶対座標におけるサイズ
    POSITEST.positionEstimater = function (mapdata) {
        var _this = this;

        this.ifdebug = true;
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
            //マーカーの取得
            var _this = this;
            var markers = this.jsArucoMarker.detectMarkers(domElement);

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

        this.estimate_with_f = function (R_, Xm, D, n_marker, f) {
            var A = [1.0, 1.0, f];
            //推定位置を、全マーカーの平均として求める
            var possum = [0.0, 0.0, 0.0];
            var est_pos = [];
            for (var i = 0; i < n_marker; i++) {
                var pos = numeric.add(Xm[i], numeric.dot(R_, numeric.mul(A, D[i])));
                possum = numeric.add(possum, pos);
                est_pos.push(pos);
            }
            var pos = numeric.mul(possum, 1.0 / n_marker);
            return { "x": pos, "R": R_};
        };

        this.estimate_without_f = function (R_, Xm, D, n_marker) {
            //初期値設定
            var f = 1.0;
            var A = [0.0, 0.0, f]
            var x = numeric.add(Xm[0], numeric.dot(R_, numeric.mul(A, D[0])));
            var prev_x = null;

            var n_iter = 0;
            var max_iter = 2;//誤差関数が二次関数だから二回で収束する
            var min_err = 1.0;
            while (n_iter < max_iter) {
                var A = [1.0, 1.0, f];
                var I = [0.0, 0.0, 1.0];
                //ヘッセ行列用バッファ
                var B = [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0]];
                //勾配用バッファ
                var _D = [0.0, 0.0, 0.0, 0.0];
                //
                for (var i = 0; i < n_marker; i++) {
                    var m = Xm[i];
                    var d = D[i];
                    //
                    var RAfd = numeric.dot(R_, numeric.mul(A, d));
                    var RId = numeric.dot(R_, numeric.mul(I, d));
                    //勾配
                    var dJdx = numeric.sub(x, numeric.add(m, RAfd));
                    var dJdf = -numeric.dot(dJdx, RId);
                    _D[0] += dJdx[0]; _D[1] += dJdx[1]; _D[2] += dJdx[2]; _D[3] += dJdf;
                    //ヘッセ行列
                    B[0][0] += 1.0; B[1][1] += 1.0; B[2][2] += 1.0; //ddJddx
                    var ddJdxdf = numeric.mul(RId, -1.0);
                    B[3][0] += ddJdxdf[0]; B[0][3] += ddJdxdf[0];
                    B[3][1] += ddJdxdf[1]; B[1][3] += ddJdxdf[1];
                    B[3][2] += ddJdxdf[2]; B[2][3] += ddJdxdf[2];
                    B[3][3] += numeric.dot(RId, RId);//ddJddf
                }
                //
                var Binv = numeric.inv(B);
                var delta = numeric.mul(numeric.dot(Binv, _D), -1.0); //準ニュートン法

                prev_x = numeric.clone(x);
                x[0] += delta[0]; x[1] += delta[1]; x[2] += delta[2];
                f += delta[3];


                //終了処理
                if (prev_x == null) {

                } else if (numeric.norm2(numeric.sub(x, prev_x)) < min_err) {
                    break;
                }
                //更新処理
                n_iter = n_iter + 1;
            }

            return { "x": x, "R": R_, "f": f };
        }
    }

    POSITEST.runPositest = function (map, dict) {
        var delete_threshold = 10000;//この範囲内に収まっていればマーカーの結果は正しいという長さの二乗

        //ウェブカメラ起動
        var imageGrabbing = new THREEx.WebcamGrabbing();

        //画像を表示
        document.body.appendChild(imageGrabbing.domElement);

        var domElement = imageGrabbing.domElement;
        dict["video"] = domElement;

        var estimater = new POSITEST.positionEstimater(map);

        //焦点距離の事前情報
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
                    //平均から離れたデータは外れ値として除いて処理
                    var A = [1.0, 1.0, f];
                    var possum = [0.0, 0.0, 0.0];
                    var est_pos = [];
                    for (var i = 0; i < markers.length; i++) {
                        //パース
                        R.push(markers[i]["GR1"]);
                        Xm.push(markers[i]["Xm"]);
                        D.push(markers[i]["D1"]);
                        //個別の情報で位置推定
                        var pos = numeric.add(Xm[i], numeric.dot(R[i], numeric.mul(A, D[i])));
                        possum = numeric.add(possum, pos);
                        est_pos.push(pos);
                    }
                    var avepos = numeric.mul(possum, 1.0 / markers.length);
                    var errors = []
                    for (var i = 0; i < markers.length; i++) {
                        var dist = numeric.sub(est_pos[i], avepos);
                        dist = numeric.dot(dist, dist);
                        errors.push([i,dist]);
                    }
                    errors.sort(function (a, b) {
                        if (a[1] < b[1]) {
                            return 1;
                        }
                        if (a[1] > b[1]) {
                            return -1;
                        }
                        return 0;
                    });
                    var n_delete = Math.floor(markers.length *0.4 - 0.1);
                    for (var i = 0; i < n_delete; i++) {
                        if (errors[i][1] > delete_threshold) {
                            var idx = errors[i][0];
                            //console.log("delete", markers[idx]["id"],i)
                            R[idx] = null;
                            Xm[idx] = null;
                            D[idx] = null;
                        }
                    }
                    R = R.filter(function (v) {
                        return v != null;
                    });
                    Xm = Xm.filter(function (v) {
                        return v != null;
                    });
                    D = D.filter(function (v) {
                        return v != null;
                    });
                    //平均姿勢を求める
                    var R_ = estimater.averageRotationMatrix(R);
                    var n_marker = R.length;
                    //位置推定
                    if (n_marker > 1) {
                        //マーカーが二個以上あれば焦点距離を更新
                        var f_wo = estimater.estimate_without_f(R_, Xm, D, n_marker);
                        if (f_wo["f"] > 0.5 && f_wo["f"] < 2.0) {
                            f = (n * f + f_wo["f"]) / (n + 1);
                            n = n + 1;
                            dict["f"] = f;
                        }
                    }
                    if (n_marker > 0) {
                        //マーカーがあれば位置推定
                        var _pos = estimater.estimate_with_f(R_, Xm, D, n_marker, 1.0);//dict["f"]);
                        dict["x"] = _pos["x"];
                        dict["R"] = _pos["R"];
                    }
                    //
                    estimater.updateEstimation(dict);
                    //array初期化
                    markers = [];
                }
            }
            //更新処理
            counter += 1;
            if (counter == 1) {
                counter = 0;
            }
        }, 10);
    }

    POSITEST.runPositestKalman = function (map, dict) {
        var delete_threshold = 10000;//この範囲内に収まっていればマーカーの結果は正しいという長さの二乗

        //ウェブカメラ起動
        var imageGrabbing = new THREEx.WebcamGrabbing();

        //画像を表示
        document.body.appendChild(imageGrabbing.domElement);

        var domElement = imageGrabbing.domElement;
        dict["video"] = domElement;

        var estimater = new POSITEST.positionEstimater(map);

        //カルマンフィルタの状態ベクトルは x,i,j,k,fの順
        //カルマンフィルタ関数群
        //pxとpy(画像中心が原点で横の長さが1.0のやつ)に対する観測行列部分を作成する mは点の座標
        function createPointH(m, x,i,j,k,f) {
            var Hx = []
            for (var _i = 0; _i < 2; _i++) {
                Hx.push(new Array(13).fill(0.0));
            }
            var m_x = numeric.sub(m, x);
            var m_x_i = numeric.dot(m_x, i);
            var m_x_j = numeric.dot(m_x, j);
            var m_x_k = numeric.dot(m_x, k);

            var dpxdx = numeric.mul(- f / (m_x_k * m_x_k), numeric.sub(numeric.mul(m_x_i, k), numeric.mul(m_x_k, i)));
            var dpydx = numeric.mul(- f / (m_x_k * m_x_k), numeric.sub(numeric.mul(m_x_j, k), numeric.mul(m_x_k, j)));
            var dpdij = numeric.mul(- f / m_x_k, m_x);
            var dpxdk = numeric.mul(- f * m_x_i / (m_x_k * m_x_k), m_x);
            var dpydk = numeric.mul(- f * m_x_j / (m_x_k * m_x_k), m_x);
            var I = numeric.diag([1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]);
            
            Hx = numeric.setBlock(Hx, [0, 0], [0, 2], [dpxdx]);
            Hx = numeric.setBlock(Hx, [1, 0], [1, 2], [dpydx]);
            Hx = numeric.setBlock(Hx, [0, 3], [0, 5], [dpdij]);
            Hx = numeric.setBlock(Hx, [1, 6], [1, 8], [dpdij]);
            Hx = numeric.setBlock(Hx, [0, 9], [0, 11], [dpxdk]);
            Hx = numeric.setBlock(Hx, [1, 9], [1, 11], [dpydk]);

            Hx[0][12] = - m_x_i / m_x_k;
            Hx[1][12] = - m_x_j / m_x_k;

            var z_est = [- f * m_x_i / m_x_k, - f * m_x_j / m_x_k];

            
            return {
                H: Hx,
                Z: z_est
            }
        }
        function calcHZ_marker(marker,x,i,j,k,f) {
            var H_marker = []
            var Z_marker = []
            var z_est = []
            //各マーカー頂点
            var L = marker["size"]/2;
            var vertice = [[-L, L, 0], [L, L, 0], [L, -L, 0], [-L, -L, 0]];
            for (var _i = 0; _i < 4; _i++) {
                var p = numeric.dot(marker["Rm"], vertice[_i]);
                p = numeric.add(marker["Xm"], p);
                var Hx = createPointH(p, x, i, j, k, f);
                //観測行列
                //H_marker.push(Hx.H[0]);
                //H_marker.push(Hx.H[1]);
                //実測値
                //Z_marker.push(marker["C"][_i][0]);
                //Z_marker.push(marker["C"][_i][1]);
                //推定値
                //z_est.push(Hx.Z[0]);
                //z_est.push(Hx.Z[1]);
            }
            //直接観測の部分
            for (var _i = 0; _i < 12; _i++) {
                var tmp = new Array(13).fill(0.0);
                tmp[_i] = 1.0;
                H_marker.push(tmp);
            }
            var est_x = numeric.add(marker["Xm"], numeric.dot(marker["GR1"], marker["D1"]));
            
            var R_T = numeric.transpose(marker["GR1"]);
            Z_marker = Z_marker.concat(est_x, R_T[0], R_T[1], R_T[2]);

            z_est = z_est.concat(x, i, j, k);
            return {
                H: H_marker,
                Z: Z_marker,
                ZE: z_est
            }
        }
        

        //初期状態
        var X = [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 1.4];
        var s_init_pos = 100000.0;
        var s_init_angle = 4.0;
        var s_init_focus = 1.0;
        var P = numeric.diag([s_init_pos, s_init_pos, s_init_pos, s_init_angle, s_init_angle, s_init_angle, s_init_angle, s_init_angle, s_init_angle,
        s_init_angle, s_init_angle, s_init_angle, s_init_focus]);
        var P_dash = null;

        //100ミリ秒くらいでの誤差の増分
        var s_dt_pos = 4.0;
        var s_dt_angle = 0.01;
        var s_dt_focus = 0.01;
        var P_dt = numeric.diag([s_dt_pos, s_dt_pos, s_dt_pos, s_dt_angle, s_dt_angle, s_dt_angle, s_dt_angle, s_dt_angle, s_dt_angle,
        s_dt_angle, s_dt_angle, s_dt_angle, s_dt_focus]);
        //観測誤差
        var error_pixel = 0.001;
        var error_pos = 2500.0;
        var error_angle = 0.25;

        var last_time = null;

        var timerID = setInterval(function () {
            var markers = estimater.observeMarkers(domElement);

            var est_pos = []
            if (markers.length > 0) {
                //カルマンフィルタ予測
                if (last_time == null) {
                    //初回は特になにもしない
                    last_time = Date.now();
                    P_dash = numeric.clone(P);
                } else {
                    var nowtime = Date.now();
                    var dt = (nowtime - last_time) / 100;//100ミリ秒単位で
                    //状態は変わらない
                    P_dash = numeric.add(P, numeric.mul(dt * dt, P_dt));
                    last_time = nowtime;
                }

                var _x = [X[0],X[1],X[2]];
                var _i = [X[3],X[4],X[5]];
                var _j = [X[6],X[7],X[8]];
                var _k = [X[9],X[10],X[11]];
                var _f = X[12];

                //カルマンフィルタ更新
                var H = [];
                var Z = [];
                var ZE = [];
                var R = []
                
                for (var i = 0; i < markers.length; i++) {
                    var ret = calcHZ_marker(markers[i], _x, _i, _j, _k, _f);
                    H = H.concat(ret.H);
                    Z = Z.concat(ret.Z);
                    ZE = ZE.concat(ret.ZE);
                    /*R=R.concat([error_pixel, error_pixel, error_pixel, error_pixel, error_pixel, error_pixel, error_pixel, error_pixel, error_pos, error_pos, error_pos,
                        error_angle, error_angle, error_angle, error_angle, error_angle, error_angle, error_angle, error_angle, error_angle
                    ]);*/
                    R = R.concat([error_pos, error_pos, error_pos,
                        error_angle, error_angle, error_angle, error_angle, error_angle, error_angle, error_angle, error_angle, error_angle])
                }
                R = numeric.diag(R);

                var E = numeric.sub(Z, ZE);
                console.log(Z)
                console.log(ZE)
                var S = numeric.add(numeric.dot(H, numeric.dot(P_dash, numeric.transpose(H))), R);
                var K = numeric.dot(P_dash, numeric.dot(numeric.transpose(H), numeric.inv(S)));
                X = numeric.add(X, numeric.dot(K, E));
                for (var i = 0; i < K.length; i++) {
                    console.log(K[i]);
                }
                P = numeric.dot(numeric.sub(numeric.diag(new Array(K.length).fill(1.0)), numeric.dot(K, H)), P_dash);
                
                var tmpR = [[X[3], X[6], X[9]],
                    [X[4], X[7], X[10]],
                    [X[5], X[8], X[11]]
                ]
                tmpR = numeric.svd(tmpR);
                tmpR = numeric.dot(tmpR.U, numeric.transpose(tmpR.V));
                X[3] = tmpR[0][0];
                X[4] = tmpR[1][0];
                X[5] = tmpR[2][0];
                X[6] = tmpR[0][1];
                X[7] = tmpR[1][1];
                X[8] = tmpR[1][2];
                X[9] = tmpR[2][0];
                X[10] = tmpR[2][1];
                X[11] = tmpR[2][2];

                console.log("---")
                console.log(numeric.dot(K, E))
                console.log(X)

                dict["x"] = [X[0], X[1], X[2]]
                dict["R"] = tmpR;
                //
                estimater.updateEstimation(dict);
                //array初期化
                markers = [];
            }
            
        }, 10);
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