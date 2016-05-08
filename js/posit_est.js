
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
                    result_lst[id] = { "D1": trans, "R1": rot, "GR1":global_R, "E1":error, "Xm": _this.pos[id], "Rm": _this.mat[id], "id": id,"C":pos.corners };
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