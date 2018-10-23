var config = require('./config/config.js');
var TimRestAPI = require('./lib/TimRestApi.js');
var util = require('util');

function begin_press_test(api, groupId, fromId, sendInterval, totalCount) {
    var sendedCount = 0; //count of package already send 
    var cycleNum = 1; //loop manage num
    var increaseSeq = 1; //increase num, use for print local seq
    var beginTime = (new Date).getTime();
    var failNum = 0; //rsp return fail num
    var errNum = 0; // exception error
    var reqBody = {
        "GroupIdList": [ //groupid list
        groupId]
    }
    api.request("group_open_http_svc", "get_group_info", reqBody,
    function(err, data) // get seq before send_group_msg
    {
        if (err) {
            console.log(err);
            return;
        }
        if (data["ActionStatus"] != "OK") {
            console.log("fail at get_group_info before group_msg request\n");
            var strData = JSON.stringify(data);
            console.log(strData);
            return;
        }
        var beforeSeq = data["GroupInfo"][0].NextMsgSeq;
        var localSeq = increaseSeq;
        var timmer = setInterval(doRequest);
        function doRequest() {
            if (sendedCount++>=totalCount) {
                clearInterval(timmer);
                cycleNum--;
                return;
            }
            cycleNum++;
            var reqBody = {
                GroupId: groupId,
                MsgBody: [{
                    MsgType: "TIMTextElem",
                    From_Account: fromId,
                    MsgContent: {
                        Text: util.format("hello, local seq = %d", localSeq)
                    }
                }]
            };
            var startTime = (new Date).getTime();
            api.request("group_open_http_svc", "send_group_msg", reqBody,
            function(err, data) {
                if (err) {
                    console.log(err);
                    errNum++;
                    return;
                }

                if (data["ActionStatus"] != "OK") {
                    failNum++;
                }
                cycleNum--;
                localSeq = increaseSeq++;
                if (!err) {
                    var strData = JSON.stringify(data);
                    console.log('local seq = %d, timecost = %d, response body: %s', localSeq, ((new Date).getTime() - startTime), strData);
                }
                if (cycleNum == 0) {
                    console.log('total cost time: %d ms', (new Date).getTime() - beginTime);

                    var reqBody = {
                        "GroupIdList": [groupId]
                    }
                    api.request("group_open_http_svc", "get_group_info", reqBody,
                    function(err, data) {
                        if (err) {
                            console.log(err);
                            return;
                        }
                        if (data["ActionStatus"] != "OK") {
                            console.log("fail at get_group_info after group_msg request\n");
                            var strData = JSON.stringify(data);
                            console.log(strData);
                            return;
                        }
                        endSeq = data["GroupInfo"][0].NextMsgSeq;
                        console.log('msg seq before: %d, after: %d', beforeSeq, endSeq);
                        console.log('successNum is %s, totalNum is %s, errNum is %s, failNum is %s', totalCount - errNum - failNum, totalCount, errNum, failNum);
                    });
                };
            });
        }
    });
}

function begin_process() {
    if (process.argv.length < 6) {
        console.log("usage:");
        console.log("node " + process.argv[1] + " (groupid) (from_id) (speed) (totalCount)");
	console.log("  groupid 群组ID，脚本在该群内发消息进行压测");
	console.log("  from_id 消息发送者的id");
	console.log("  speed 在群内每秒发送消息的条数");
	console.log("  totalCount 脚本将在群内发消息总条数");
	console.log("注: ");
	console.log("默认从配置文件config/config.js读取配置信息，其中:");
	console.log("identifier 为APP管理员账户");
        console.log("private_pem_path 为独立模式下私钥本地路径");
        return - 1;
    }
    var groupId = process.argv[2];
    var fromId = process.argv[3];
    var speed = parseInt(process.argv[4]);
    if (speed < 0 || speed > 150) {
        console.error('invalid speed (0 < speed < 150)');
        process.exit(0);
    }
    var sendInterval = 1000 / speed;

    var totalCount = parseInt(process.argv[5]);
    var api = new TimRestAPI(config);
    api.init(function(err, data) {
        if (err) {
            //deal error
            console.log(err);
            return;
        }
        begin_press_test(api, groupId, fromId, sendInterval, totalCount);
    });
}

begin_process();
