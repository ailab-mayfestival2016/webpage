var socket = null;
function connect() {
    if (socket != null && socket.connected) { return; }
    var uri = "https://ailab-mayfestival2016-server.herokuapp.com";
    socket = io.connect(uri, { transports: ['websocket'] });
    socket.on('connect', function () {
        socket.on('Game Data', function (data) {
            doSomething(data);
        });
        socket.on('disconnect', function (data) {
            document.getElementById("connected").innerHTML = "サーバーシャットダウンにより切断";
        });
        document.getElementById("connected").innerHTML = "接続中";
        //接続の最後に必ず自身のアプリ種別を表す部屋名に入る(例えば"Client")
        console.log("connected");
        socket.emit("enter_room", { 'room': "Client" });
    });
}
var sendEnabled = false;
function changeSendFlag() {
    sendEnabled = !sendEnabled;
    if (sendEnabled) {
        document.getElementById("changeSendButton").innerHTML = "データ送信Off";
    } else {
        document.getElementById("changeSendButton").innerHTML = "データ送信On";
    }
}


function doSomething(data) {
    document.getElementById("latestData").innerHTML = "event='Game Data',data=" + JSON.stringify(data);
    if (sendEnabled) {
        //データを送信する場合は、以下の3点セットをtransferイベントとして以下のようにemitする。
        var eventName = "SendCOG";//実際に送信したいイベント名
        var dstRooms = ["Game"];//送信宛先の部屋名リスト
        var sendData = { "key": "value", "hoge": [1, 2, 3.0, "string"] };//実際に送りたいデータ(無ければnull)
        socket.emit("transfer", {
            'event': eventName,
            'room': dstRooms,
            'data': sendData
        });
    }
}