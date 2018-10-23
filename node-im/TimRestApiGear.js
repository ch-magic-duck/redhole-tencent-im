var config = require('./config/config.js');
var TimRestAPI = require('./lib/TimRestApi.js');
var send_group_msg = function(api, serviceName, commandName, dataArray) {
    var i = 0;
    var msgFrom = dataArray[i++];
    var groupId = dataArray[i++];
    var msgText = dataArray[i++];
    var reqBody = {
        GroupId: groupId,
        MsgBody: [{
            MsgType: "TIMTextElem",
            From_Account: msgFrom,
            MsgContent: {
                Text: msgText
            }
        }]
    };
    api.request(serviceName, commandName, reqBody,
    function(err, data) {
        if (err) {
            console.log(err);
            return;
        }
        console.log(data);
    });
}

var send_msg = function(api, serviceName, commandName, dataArray) {
    var i = 0;
    var fromId = dataArray[i++];
    var toId = dataArray[i++];
    var msgText = dataArray[i++];

    var reqBody = {
        "To_Account": toId,
        //消息接收者
        "From_Account": fromId,
        //选填字段
        "MsgRandom": 123,
        //消息随机数
        "MsgBody": [{
            "MsgType": "TIMTextElem",
            //文本消息类型
            "MsgContent": {
                "Text": msgText //具体文本消息
            }
        }]
    }
    api.request(serviceName, commandName, reqBody,
    function(err, data) {
        if (err) {
            console.log(err);
            return;
        }
        console.log(data);
    });
}

var get_group_info = function(api, serviceName, commandName, dataArray) {
    var groupId = dataArray[0];
    var reqBody = {
        "GroupIdList": [groupId]
    }
    api.request(serviceName, commandName, reqBody,
    function(err, data) {
        if (err) {
            console.log(err);
            return;
        }
        console.log(data);
    });
}

function begin_process() {
    if (process.argv.length < 4) {
        console.log("usage:");
        console.log("node " + process.argv[1] + " msg_interface.js (server_name) (command) args...eg:");
        console.log("node " + process.argv[1] + " msg_interface.js openim sendmsg (account_id) (receiver) (text_content) 单发消息");
        console.log("node " + process.argv[1] + " msg_interface.js group_open_http_svc send_group_msg (account_id) (group_id) (text_content) 群组中发送普通消息");
        console.log("node " + process.argv[1] + " msg_interface.js group_open_http_svc get_group_info (group_id) 获取群组信息");
        console.log("注:");
        console.log("默认从配置文件config/config.js读取配置信息，其中:");
	console.log("identifier 为APP管理员账户");
        console.log('private_pem_path 为独立模式下私钥本地路径');
        return - 1;
    }
    var serviceName = process.argv[2];
    var commandName = process.argv[3];
    var commandKey = serviceName + "." + commandName;

    var commandName;
    var commadKey;
    
    // command  dictionary
    var commandArray = {
        "openim.sendmsg": send_msg,
        "group_open_http_svc.send_group_msg": send_group_msg,
        "group_open_http_svc.get_group_info": get_group_info
    };

    if (!commandArray.hasOwnProperty(commandKey)) {
        console.log(commandKey);
        console.log("service_name or command_name error");
        return;
    }
    
    var dataArray = new Array();
    for (var i = 4; i < process.argv.length; i++) {
        dataArray[i - 4] = process.argv[i];
    }
    
    var api = new TimRestAPI(config);
    api.init(function(err, data) {
        if (err) {
    	// deal error
    	console.log(err);
    	return;
        }
        commandValue = commandArray[commandKey];
        commandValue(api, serviceName, commandName, dataArray);
    });
}

begin_process();

