
    var POSITEST = POSITEST || {};

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
        this.n_marker = mapdata.length
        this.pos = {};
        this.mat = {};
        this.size = {};
        for (var i = 0; i < this.n_marker; i++) {
            var id = mapdata[i].id;

            this.pos[id] = mapdata[i].pos;
            this.mat[id] = numeric.transpose(mapdata[i].mat);//必要なmatは各列が各マーカー座標基底だから
            this.size[id] = mapdata[i].size;
        }

        this.jsArucoMarker = new THREEx.JsArucoMarker();

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
                    result_lst[id] = { "D1": trans, "R1": rot, "GR1":global_R, "E1":error, "Xm": _this.pos[id], "Rm": _this.mat[id], "id": id };
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
        var delete_threshold = 100;//この範囲内に収まっていればマーカーの結果は正しいという長さの二乗

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
                    var n_delete = Math.floor(markers.length / 2.0);
                    for (var i = 0; i < n_delete; i++) {
                        if (errors[i][1] > delete_threshold) {
                            var idx = errors[i][0];
                            //console.log("delete", markers[idx]["id"])
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
            if (counter == 1) {
                counter = 0;
            }
        }, 10);
    }