var util = require('util.js'); //转换时间插件
var im = require('webim_wx.js');

// 需要用到的参数
var accountMode, // 帐号模式，0 - 独立模式 1 - 托管模式
  accountType, // 帐号体系集成中的 accountType，必填
  sdkAppID, // 用户标识接入 SDK 的应用 ID，必填
  selType, // 会话类型 webim.MSG_MAX_LENGTH.C2C - 私聊 webim.SESSION_TYPE.GROUP - 群聊
  imId, // 用户的 id
  imName, // 用户的 im 名称
  imAvatarUrl, // 用户的 im 头像 url
  friendId, // 好友 id
  friendName, // 好友昵称
  friendAvatarUrl, // 好友头像
  contactListThat, // 当前会话列表页面对象
  chatThat, // 当前聊天好友页面对象
  selSess
  
/**
 * 登录 im
 */
function login(that, app, callback) {
  im.Log.warn('开始登录 im')
  if (!callback) callback = () => {}
  if (!app.data.im.imId || !app.data.im.userSig) {
    im.Log.error("登录 im 失败[im 数据未初始化完毕]")
    return
  }
  // 获取当前用户身份
  var loginInfo = {
    'sdkAppID': app.data.im.sdkAppID, //	用户标识接入 SDK 的应用 ID，必填
    'appIDAt3rd': app.data.im.sdkAppID, // App 用户使用 OAuth 授权体系分配的 Appid，必填
    'accountType': app.data.im.accountType, // 帐号体系集成中的 accountType，必填
    'identifier': app.data.im.imId, // 当前用户帐号，必填
    'identifierNick': app.data.im.imName, // 当前用户昵称，选填
    'userSig': app.data.im.userSig, // 鉴权 Token，必填
  }
  // 指定监听事件
  var listeners = {
    "onConnNotify": onConnNotify, // 监听连接状态回调变化事件,必填
    "onMsgNotify": onMsgNotify // 监听新消息回调变化事件,必填
  }
  //其他对象，选填
  var options = {
    'isAccessFormalEnv': true, // 是否访问正式环境，默认访问正式，选填
    'isLogOn': false // 是否开启控制台打印日志,默认开启，选填
  }
  // sdk 登录（独立模式）
  im.login(loginInfo, listeners, options, function (resp) {
    im.Log.warn('登录 im 成功')
    callback()
  }, function (err) {
    im.Log.error("登录 im 失败", err.ErrorInfo)
  })
}

/**
 * 监听连接状态回调变化事件
 */
function onConnNotify(resp) {
  switch (resp.ErrorCode) {
    case im.CONNECTION_STATUS.ON:
      im.Log.warn('连接状态正常...')
      break
    case im.CONNECTION_STATUS.OFF:
      im.Log.warn('连接已断开，无法收到新消息，请检查下你的网络是否正常')
      break
    default:
      im.Log.error('未知连接状态,status=' + resp.ErrorCode)
      break
  }
}

/**
 * 监听新消息（初始化时会获取所有会话数组，随后只获取新会话数组）
 * newMsgList - 新消息数组
 */
function onMsgNotify(newMsgList) {
  var newMsg, session;
  // 如果有新消息，并且处在聊天界面上
  if(newMsgList && chatThat) {
    for (var j in newMsgList) {
      newMsg = newMsgList[j];
      if (chatThat && newMsg.getSession().id() == friendId) {
        selSess = newMsg.getSession()
        chatThat.addMessage(newMsg.elems[0].content.text, false, chatThat)
      }
    }
  }
  // 如果有新消息，并且处在会话列表界面上
  if (newMsgList && contactListThat) {
    contactListThat.initRecentContactList()
  }
}

/**
 * 获取聊天历史记录
 */
function getC2CHistoryMsgs(cbOk) {
  im.Log.warn('开始获取聊天历史记录')
  var that = this
  var reqMsgCount = 10 // 拉取消息条数
  var lastMsgTime = wx.getStorageSync('lastMsgTime') || 0 // 最后一次拉取历史消息的时间
  var msgKey = wx.getStorageSync('msgKey') || '' 
  var options = {
    'Peer_Account': friendId, // 好友帐号
    'MaxCnt': reqMsgCount, // 拉取消息条数
    'LastMsgTime': lastMsgTime, // 最近的消息时间，即从这个时间点向前拉取历史消息
    'MsgKey': msgKey
  }
  // 真正获取历史消息的方法 交由实际调用者处理数据
  im.getC2CHistoryMsgs(options, function (resp) {
    var complete = resp.Complete; //是否还有历史消息可以拉取，1-表示没有，0-表示有
    if (resp.MsgList.length == 0) {
      cbOk(false)
      return
    }
    // 拉取消息后，要将下一次拉取信息所需要的东西给存在缓存中
    wx.setStorageSync('lastMsgTime', resp.LastMsgTime);
    wx.setStorageSync('msgKey', resp.MsgKey);
    // 返回消息列表由用户进行处理
    cbOk(resp)
  })
  //消息已读上报，以及设置会话自动已读标记
  var sessMap = im.MsgStore.sessMap()
  for(var i in sessMap) {
    var sess = sessMap[i];
    if (friendId == sess.id()) {
      im.setAutoRead(sess, true, true)
    }
  }
  im.Log.warn('获取聊天历史纪录完毕')
}

/**
 * 发送消息(普通消息)
 */
function onSendMsg(msg, cbOk, cbErr) {
  //获取消息内容
  var msgtosend = msg;
  // 创建会话对象
  if (!selSess) {
    selSess = new im.Session(selType, friendId, friendName, friendAvatarUrl, Math.round(new Date().getTime() / 1000));
  }
  var isSend = true;// 是否为自己发送
  var seq = -1; // 消息序列，-1 表示 sdk 自动生成，用于去重
  var random = Math.round(Math.random() * 4294967296); // 消息随机数，用于去重
  var msgTime = Date.parse(new Date()) / 1000; // 消息时间戳
  var subType = im.C2C_MSG_SUB_TYPE.COMMON; // 消息子类型 c2c 消息时，参考 c2c 消息子类型对象：im.C2C_MSG_SUB_TYPE 
  // loginInfo.identifier 消息发送者账号,loginInfo.identifierNick 消息发送者昵称
  var msg = new im.Msg(selSess, isSend, seq, random, msgTime, imId, subType, imName);
  var textObj = new im.Msg.Elem.Text(msgtosend);
  msg.addText(textObj);
  im.sendMsg(msg, function (resp) {
    cbOk()
  }, function (err) {
    cbErr(err)
  })
}

/**
 * 初始化 im
 */
function init(opts) {
  accountMode = opts.accountMode
  accountType = opts.accountType
  sdkAppID = opts.sdkAppID
  selType = opts.selType
  imId = opts.imId
  imName = opts.imName
  imAvatarUrl = opts.imAvatarUrl
  friendId = opts.friendId
  friendName = opts.friendName
  friendAvatarUrl = opts.friendAvatarUrl
  contactListThat = opts.contactListThat
  chatThat = opts.chatThat
}

module.exports = {
  init: init,
  login: login,
  onMsgNotify: onMsgNotify,
  getC2CHistoryMsgs: getC2CHistoryMsgs,
  onSendMsg: onSendMsg
}