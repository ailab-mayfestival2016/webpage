
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
            console.log("ILLEGAL ARGUMENT");
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

        console.log("est_pos defined");

        this.observeMarker = function (domElement) {
            //マーカーの取得
            var _this = this;
            var markers = this.jsArucoMarker.detectMarkers(domElement);

            if (markers.length == 0) {
                console.log("No Marker Detected");
                return null;
            }

            delete_ids = []
            result_lst = {}
            //座標と姿勢を取得
            markers.forEach(function (marker) {
                var id = marker.id;


                //想定外のマーカーなら除外
                if (!(id in _this.mat)) {
                    console.log("Not in map");
                    return;
                }

                //console.log("ID %d", id));

                var pos = _this.jsArucoMarker.getMarkerPosition(marker);
                if (pos == null) {
                    return;
                }
                var rot = pos.bestRotation;
                //もともとのカメラ、マーカー座標系が右手系なので修正
                rot = [[rot[0][0], rot[0][1], -rot[0][2]],
                        [rot[1][0], rot[1][1], -rot[1][2]],
                        [-rot[2][0], -rot[2][1], rot[2][2]]];
                var trans = pos.bestTranslation;
                trans = [-trans[0], -trans[1], trans[2]];
                trans = numeric.mul(trans, _this.size[id]);
                var global_R = numeric.dot(_this.mat[id], numeric.transpose(rot));

                if (id in result_lst) {
                    //重複して検出しているとき
                    delete_ids.push(id);
                } else {
                    result_lst[id] = { "trans": trans, "R": global_R, "pos": _this.pos[id], "id":id };
                }
            });
            //重複していたIDを削除
            delete_ids.forEach(function (id) {
                if (id in result_lst) {
                    delete result_lst[id];
                }
            })
            var result_array = [];
            Object.keys(result_lst).forEach(function (key) {
                result_array.push(result_lst[key]);
            })
            return result_array;
        };

        this.est_pos = function (markers, f, runWithout) {
            if (markers == null || markers.length < 1) {
                console.log("Not Enough Markers");
                return null;
            } else if (markers.length < 2 && f != null) {
                var marker = markers[0];
                var ans_with_f = this.estimate_with_f(marker["R"], [marker["pos"]], [marker["trans"]], 1, f);
                console.log("use only one marker");
                return { "x": ans_with_f["x"], "R": ans_with_f["R"], "f_wo": null };
            }
            console.log("%d markers detected", markers.length);

            //平均姿勢行列[I,J,K]
            var R_ = [[0.0, 0.0, 0.0], [0.0, 0.0, 0.0], [0.0, 0.0, 0.0]];

            //マーカーのサイズを考慮した、各マーカーからカメラへのベクトル(カメラ座標系)
            var cam_vec = []
            //マーカーの位置
            var marker_vec = []

            var counter = 0;
            markers.forEach(function (marker) {
                var global_R = marker["R"];
                R_ = numeric.add(R_, global_R);

                //マーカー→カメラのベクトル（カメラ座標系）
                var trans = marker["trans"];
                cam_vec.push(trans);

                var marker_pos = marker["pos"];
                marker_vec.push(marker_pos);

                counter = counter + 1;
            });
            //平均姿勢行列を求める
            //reference: http://home.hiroshima-u.ac.jp/tamaki/study/20090924SIS200923.pdf
            R_ = numeric.mul(R_, 1.0 / counter);
            var ret = numeric.svd(R_);
            R_ = numeric.dot(ret.U, numeric.transpose(ret.V));

            var f_without = null;
            if (runWithout) {
                var ans_without_f = this.estimate_without_f(R_, marker_vec, cam_vec, counter);
                f_without = ans_without_f["f"];
                if (f == null) {
                    f = f_without;
                }
            }
            var ans_with_f = this.estimate_with_f(R_, marker_vec, cam_vec, counter, f);
            return { "x": ans_with_f["x"], "R": ans_with_f["R"], "f_wo": f_without };
        };

        this.estimate_with_f = function (R_, marker_vec, cam_vec, n_marker, f) {
            var A = [1.0, 1.0, f];
            //推定位置を、全マーカーの平均として求める
            var possum = [0.0, 0.0, 0.0];
            var est_pos = [];
            for (var i = 0; i < n_marker; i++) {
                var pos = numeric.add(marker_vec[i], numeric.dot(R_, numeric.mul(A, cam_vec[i])));
                possum = numeric.add(possum, pos);
                est_pos.push(pos);
            }
            var pos = numeric.mul(possum, 1.0 / n_marker);
            return { "x": pos, "R": R_};
        };

        this.estimate_without_f = function (R_, marker_vec, cam_vec, counter) {
            //初期値設定
            var f = 1.0;
            var A = [0.0, 0.0, f]
            var x = numeric.add(marker_vec[0], numeric.dot(R_, numeric.mul(A, cam_vec[0])));
            var prev_x = null;

            var n_iter = 0;
            var max_iter = 1000;
            var min_err = 1.0;
            while (n_iter < max_iter) {
                var A = [1.0, 1.0, f];
                var I = [0.0, 0.0, 1.0];
                //ヘッセ行列用バッファ
                var B = [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0]];
                //勾配用バッファ
                var D = [0.0, 0.0, 0.0, 0.0];
                //
                for (var i = 0; i < counter; i++) {
                    var m = marker_vec[i];
                    var d = cam_vec[i];
                    //
                    var RAfd = numeric.dot(R_, numeric.mul(A, d));
                    var RId = numeric.dot(R_, numeric.mul(I, d));
                    //勾配
                    var dJdx = numeric.sub(x, numeric.add(m, RAfd));
                    var dJdf = -numeric.dot(dJdx, RId);
                    D[0] += dJdx[0]; D[1] += dJdx[1]; D[2] += dJdx[2]; D[3] += dJdf;
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
                var delta = numeric.mul(numeric.dot(Binv, D), -1.0); //準ニュートン法

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