// express 框架
// 后端服务接口参考腾讯 IM REST API 接口列表：https://cloud.tencent.com/document/product/269/1520
var express = require('express');
var sig = require('tls-sig-api');
var app = express();

// body-parser 模块，用于获取 post 提交的参数（默认支持 x-www-form-urlencoded）
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));

// tencent im rest api
var TimRestAPI  = require('./lib/TimRestApi.js');
var config = require('./config/config.js');
var api = new TimRestAPI(config);

var sigConfig = require('./config/sig_config.js');

/**
 * 通过 identifier 获取 sig （通过私钥生成）, 用于登录鉴权
 * parmas:
 *        identifier - 用户 id
 */
app.post('/generatedSig', function (req, res) {
    var s = new sig.Sig(sigConfig);
    res.end(s.genSig(req.body.identifier));
})

/** 
 * 用户注册（独立模式帐号导入）
 * parmas: 
 *        identifier - 用户 id
 *        nick       - 用户昵称
 *        faceurl    - 用户头像 rul
*/ 
app.post('/importUser', function (req, res) {
    api.init(function(err, data) {
        if (err) {
            console.log(err);
            res.end(err);
            return;
        }
        var reqBody = {
            "Identifier": req.body.identifier, // 用户名，长度不超过 32 字节
            "Nick": req.body.nick, // 用户昵称
            "FaceUrl": req.body.faceurl, // 用户头像 URL
            "type": 0 // 导入的均为普通账号
        }
        api.request("im_open_login_svc", "account_import", reqBody, function(err, data) {
            if (err) {
                res.end(JSON.stringify(err));
                return;
            }
            res.end(JSON.stringify(data));
        })
    })
})

/** 
 * 添加好友
 * parmas: 
 *        fromAccount - 需要为该 Identifier 添加好友
 *        toAccount   - 好友的 Identifier
 *        AddSource   - 好友来源（前期可填 weixin）
*/ 
app.post('/addFriend', function (req, res) {
    api.init(function(err, data) {
        if (err) {
            console.log(err);
            res.end(err);
            return;
        }
        var reqBody = {
            "From_Account": req.body.fromAccount,
            "AddFriendItem": [
                {
                    "To_Account": req.body.toAccount,
                    "AddSource":"AddSource_Type_" + req.body.sourceType
                }
            ],
            "AddType":"Add_Type_Both", // 默认双向绑定关系 
            "ForceAddFlags":1 // 强制加好友
        }
        api.request("sns", "friend_add", reqBody, function(err, data) {
            if(err) {
                res.end(JSON.stringify(err));
                return;
            }
            res.end(JSON.stringify(data));
        })
    })
})

/** 
 * 单发单聊消息
 * parmas: 
 *        SyncOtherMachine - 1 消息同步至发送方 2 不将消息同步至发送方
 *        From_Account   - 好友的 Identifier
 *        AddSource   - 好友来源（前期可填 weixin）
*/ 
app.post('/sendmsg', function (req, res) {
    api.init(function(err, data) {
        if (err) {
            console.log(err);
            res.end(err);
            return;
        }
        var reqBody = {
            "SyncOtherMachine": 1, //消息同步至发送方
            "From_Account": req.body.fromAccount,
            "To_Account": req.body.toAccount,
            "MsgRandom": 1287657,
            "MsgBody": [
                {
                    "MsgType": req.body.msgType,
                    "MsgContent": {
                        "Text": req.body.msgText
                    }
                }
            ]
        }
        api.request("openim", "sendmsg", reqBody, function(err, data) {
            if(err) {
                res.end(JSON.stringify(err));
                return;
            }
            res.end(JSON.stringify(data));
        })
    })
})


 
var server = app.listen(8080, function () {
  console.log("服务器已启动, 地址是：http://localhost:8080");
})




























































