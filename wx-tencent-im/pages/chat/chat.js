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
     * time 消息时间
     * type 消息类型
     * content 消息内容 - 纯文本 - 纯图片
     * avatarUrl 头像
     * myself 消息发送人 1 - 自己发的 0 - 好友发的
     */
    messages: [],// 消息集合
    content: '', // 输入框的文本值
    /**
     * 商品集合（结构如下）：
     * avatarUrl 商品头像
     * id 商品 id
     * name 商品名称
     * price 商品价格
     */
    product: [],
    /**
     * 消息类型: text image product active
     * 小程序 sdk 不支持图文消息，所以我们使用自定义格式进行区分：
     * text: $0001$文字描述
     * image: $0002$图片url
     * product: $0003$商品id&商品name&商品price&商品url&商品link 
     */
    contentType: '',
    complete: 0, // 是否还有历史消息可以拉取，1 - 表示没有，0 - 表示有
    lock: false, // 锁 true - 加锁状态 false - 解锁状态
    emoji: ["😊", "😓", "😠", "😃", "😍", "😄", "😝", "😜", "😢", "😭", "😱", "😘", "😷","😒", "😚", "😖", "☺", 
      "😌", "😥", "😰", "😣", "😉", "😵", "😨", "😂", "😔", "😞", "😏", "😁", "😳", "😪", "🐱", "🌂"],
    showEmojiBox: false, // 是否显示表情窗体
    showSendBut: false, // 是否显示发送按钮
    scrollHeight: wx.getSystemInfoSync().windowHeight, // scroll 真实高度
    scrollWindowHeight: wx.getSystemInfoSync().windowHeight - 84, // scroll 窗体高度
    scrollId: 1, // scroll 滚动位置 id
    toView: '',
    replyHeight: '85px', // 输入框高度
  },
  onLoad: function (options) {
    var that = this
    if (options) { 
      // 设置会话列表传参过来的好友id
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
  onShow: function () {
    // 从商品列表返回，并携带了商品参数，需要发送推荐商品
    if (this.data.product.id != undefined) {
      this.sendProductMsg()
      this.setData({
        product: []
      })
    }
  }, 
  /**
   * 获取文本的消息
   */
  getContent: function (e) {
    var show = false
    if (e.detail.value && e.detail.value !== '') {
      show = true
    }
    this.setData({
      content: e.detail.value,
      showSendBut: show
    })
  },
  /**
   * 发送文本消息
   */
  sendMsg: function () {
    var that = this
    if (that.data.lock) {
      wx.showToast({
        title: '发消息太急了，慢一点'
      });
      return
    }
    if (that.data.content == '' || !that.data.content.replace(/^\s*|\s*$/g, '')) {
      wx.showToast({
        title: '总得填点内容吧'
      });
      return;
    }
    // 开始加锁
    that.setData({ lock: true })
    var content = "$0001$" + that.data.content
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
   * 添加消息
   */
  addMessage: function(msg, isSend, that) {
    var messages = that.data.messages;
    var message = {
      'myself': isSend ? 1 : 0,
      'avatarUrl': isSend ? app.data.im.imAvatarUrl : that.data.friendAvatarUrl,
      'time': util.formatTime(new Date()),
    }
    var msgType = msg.substring(0, 6)
    if(msgType === "$0001$") {
      message.content = msg.substring(6, msg.length)
      message.type = "text"
    } else if(msgType === "$0002$"){
      message.content = msg.substring(6, msg.length)
      message.type = "image"
    } else if(msgType === "$0003$") {
      var res = msg.substring(6, msg.length).split("&")
      console.log(res)
    }
    messages.push(message);
    that.setData({
      messages: messages,
      content: '', // 清空输入框文本
      showSendBut: false
    })
    that.scrollToBottom();
  }, 
  scrollToBottom: function () {
    this.setData({
      toView: 'row_' + (this.data.messages.length - 1)
    });
  },
  /**
   * 显示表情窗体 
   * replyHeight: 输入框高度
   * scrollWindowHeight: scroll 窗体高度
   */
  showEmojiBox: function() {
    var that = this
    var replyHeight = '85px'
    var scrollWindowHeight = wx.getSystemInfoSync().windowHeight - 84
    if (!that.data.showEmojiBox) {
      replyHeight = '212px' 
      scrollWindowHeight = wx.getSystemInfoSync().windowHeight - 211
    }
    that.setData({
      showEmojiBox: !that.data.showEmojiBox,
      replyHeight: replyHeight,
      scrollWindowHeight: scrollWindowHeight
    }, function() {
      that.scrollToBottom();
    })
  },
  /**
   * 选中表情处理
   */
  emojiChoose: function(e) {
    var index = e.currentTarget.dataset.id
    this.setData({
      content: this.data.content + this.data.emoji[index],
      showSendBut: true
    })
  },
  /**
   * 打开相册-发送图片
   */
  openPhoto: function() {
    var that = this
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        // tempFilePath可以作为img标签的src属性显示图片
        const tempFilePaths = res.tempFilePaths
        wx.uploadFile({
          url: 'https://test.saidetest.com/card_api/im/sendimage',
          filePath: tempFilePaths[0],
          name: 'im_image',
          success(res) {
            const data = res.data
            var result = JSON.parse(res.data)
            if (result.code === 200) {
              var content = "$0002$" + result.datalist
              // 调用腾讯IM发送图片消息
              imhandler.onSendMsg(content, function cbOk() {
                that.addMessage(content, true, that)
              }, function cbErr(err) {
                im.Log.error("消息发送失败", err)
              })
            } 
          }
        })
      }
    })
  },
  /**
   * 显示图片
   */
  preview: function(e) {
    var current = e.currentTarget.dataset.src
    // 预览图片
    wx.previewImage({
      current: current,
      urls: [e.currentTarget.dataset.src],
    });
  },
  /**
   * 继续拉取历史消息
   */
  continueGetHistoryMsg: function (e) {
    var that = this
    if (that.data.complete == 1) return;
    // 继续获取聊天历史记录
    imhandler.getC2CHistoryMsgs(function cbOk(result) {
      handlerHistoryMsgs(result, that)
    })
  }, scroll: function (e) {
    this.setData({
      scrollHeight: e.detail.scrollHeight
    })
  },
  /**
   * 到发送商品页面
   */
  toSendProduct: function(e) {
    wx.navigateTo({
      url: '/pages/productList/productList'
    })
  },
  /**
   * 发送商品消息
   */
  sendProductMsg: function() {
    var that = this
    that.setData({ lock: true })
    // $0003$商品id & 商品name & 商品price & 商品url & 商品link
    var content = "$0003$" + that.data.product.id + "&" + that.data.product.name + "&" + that.data.product.price + "&" + that.data.product.url + "&" + that.data.product.link
    // 调用腾讯IM发送消息
    imhandler.onSendMsg(content, function cbOk() {
      that.addMessage(content, true, that)
    }, function cbErr(err) {
      im.Log.error("消息发送失败", err)
    })
    this.setData({ lock: false })
  }
})
/**
 * 处理历史消息
 */
function handlerHistoryMsgs(result, that) {
  if (that.data.lock || !result) return
  // 开始加锁
  that.setData({ lock: true })
  var historyMsgs = [];
  var oldHistoryMsgs = that.data.messages
  // 组装历史消息
  for (var i = 0; i < result.MsgList.length; i++) {
    var msg = result.MsgList[i]
    var defaultMsg = msg.elems[0].content.text;
    var msgType = defaultMsg.substring(0, 6)
    var message = {
      'myself': msg.isSend ? 1 : 0,
      'avatarUrl': msg.isSend ? app.data.im.imAvatarUrl : that.data.friendAvatarUrl,
      'time': util.formatTime(new Date(msg.time * 1000))
    }
    if (msgType === "$0001$") { // 新文字类型处理方式
      message.content = defaultMsg.substring(6, msg.length)
      message.type = "text"
    } else if (msgType === "$0002$") {
      message.content = defaultMsg.substring(6, msg.length)
      message.type = "image"
    } else if (msgType === "$0003$") {
      var res = defaultMsg.substring(6, msg.length).split("&")
      console.log(res) 
    }else { // 老数据，默认处理
      message.content = defaultMsg
      message.type = "text"
    }
    historyMsgs.push(message)
  }
  // 填充旧历史数据
  oldHistoryMsgs.map((item, index) => {
    historyMsgs.push(item)
  })
  
  that.setData({
    messages: historyMsgs,
    complete: result.Complete
  }, function() {
    var toView = 'row_' + (historyMsgs.length - that.data.scrollId)
    var scrollId = historyMsgs.length
    setTimeout(function () {
      // 渲染完毕后再放锁
      that.setData({
        scrollId: scrollId,
        toView: toView,
        lock: false
      })
    }, 400)
  })
}