var util = require('../../utils/util.js'); // 转换时间插件
var im = require('../../utils/webim_wx.js'); // 腾讯云 im 包
var imhandler = require('../../utils/im_handler.js'); // 这个是所有 im 事件的 js
const app = getApp()

Page({
  data: {
    friendId: '', 
    friendName: '',
    friendAvatarUrl: '', 
    /**
     * 消息集合（结构如下）：
     * msgTime 消息时间
     * myself 消息发送人 1 - 自己发的 0 - 好友发的
     * avatarUrl 头像
     * msgText 消息内容
     */
    messages: [],// 消息集合
    complete: 0, // 是否还有历史消息可以拉取，1 - 表示没有，0 - 表示有
    content: '', // 输入框的文本值
    lock: false, // 发送消息锁 true - 加锁状态 false - 解锁状态
    scroll_height: wx.getSystemInfoSync().windowHeight - 54,
  },
  onLoad: function (options) {
    var that = this
    if (options) { // 设置会话列表传参过来的好友id
      that.setData({
        friendId: options.friendId,
        friendName: options.friendName,
        friendAvatarUrl: options.friendAvatarUrl
      })
      wx.setNavigationBarTitle({
        title: options.friendName
      })
    }
    that.data.messages = [] // 清空历史消息
  },
  onShow: function () {
    var that = this
    // 私聊参数初始化
    imhandler.init({
      accountMode: app.data.im.accountMode,
      accountType: app.data.im.accountType,
      sdkAppID: app.data.im.sdkappid,
      selType: im.SESSION_TYPE.C2C, //私聊
      imId: app.data.im.identifier,
      imName: app.data.im.imName,
      imAvatarUrl: app.data.im.imAvatarUrl,
      friendId: that.data.friendId,
      friendName: that.data.friendName,
      friendAvatarUrl: that.data.friendAvatarUrl,
      contactListThat: null,
      chatThat: that
    })
    if (im.checkLogin()) {
      //获取聊天历史记录
      imhandler.getC2CHistoryMsgs(function cbOk(result) {
        handlerHistoryMsgs(result, that)
      })
    } else {
      imhandler.sdkLogin(that, app, this.data.selToID, () => {
        //获取聊天历史记录
        imhandler.getC2CHistoryMsgs(function cbOk(result) {
          handlerHistoryMsgs(result, that)
        });
      });
    }
  }, 
  /**
   * 获取文本的消息
   */
  getContent: function (e) {
    var that = this;
    that.setData({
      content: e.detail.value
    })
  },
  /**
   * 发送消息
   */
  sendMsg: function (e) {
    debugger
    var that = this
    // 消息锁 锁定中
    if (that.data.lock) {
      wx.showToast({
        title: '发消息太急了，慢一点'
      });
      return
    }
    // 开始加锁
    that.setData({ lock: true })
    if (that.data.content == '' || !that.data.content.replace(/^\s*|\s*$/g, '')) {
      wx.showToast({
        title: '总得填点内容吧'
      });
      this.setData({ lock: false })
      return;
    }
    var content = that.data.content
    // 调用腾讯IM发送消息
    imhandler.onSendMsg(content, function cbOk() {
      that.addMessage(content, true, that)
    }, function cbErr(err) {
      im.Log.error("消息发送失败", err)
    })
    // 解锁
    this.setData({ lock: false})
  },
  /**
   * 发送消息
   */
  addMessage: function(msg, isSend, that) {
    var messages = that.data.messages;
    var message = {
      'myself': isSend ? 1 : 0,
      'avatarUrl': isSend ? app.data.im.imAvatarUrl : that.data.friendAvatarUrl,
      'msgText': msg,
      'msgTime': util.getDateDiff(Date.parse(new Date()))
    }
    messages.push(message);
    that.setData({
      messages: messages,
      content: '' // 清空输入框文本
    })
    that.scrollToBottom();
  },
  scrollToBottom: function () {
    this.setData({
      toView: 'row_' + (this.data.messages.length - 1)
    });
  }
})
/**
 * 处理历史消息
 */
function handlerHistoryMsgs(result, that) {
  var historyMsgs = [];
  for (var i = 0; i < result.MsgList.length; i++) {
    var msg = result.MsgList[i]
    var message = {
      'myself': msg.isSend ? 1 : 0,
      'avatarUrl': msg.isSend ? app.data.im.imAvatarUrl : that.data.friendAvatarUrl,
      'msgText': msg.elems[0].content.text,
      'msgTime': util.getDateDiff(msg.time * 1000)
    }
    historyMsgs.push(message)
  }
  // 拉取消息后，可以先将下一次拉取信息所需要的数据存储起来
  wx.setStorageSync('lastMsgTime', result.LastMsgTime);
  wx.setStorageSync('msgKey', result.MsgKey);
  that.setData({
    messages: historyMsgs,
    complete: result.Complete
  })
}