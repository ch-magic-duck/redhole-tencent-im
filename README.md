## 微信小程序接入腾讯云 IM 即时通讯样例代码介绍

由于项目需求需要在小程序中接入腾讯云 IM 即时通讯，主要是需要实现一对一单聊的功能，我主要做的是 Java 开发，这个样例是替我们前端去爬坑写的 demo，所以代码较为简洁，适合拷贝过去修改后直接使用，样例实现了两个页面，一个是最近会话列表展示，另一个是好友会话页面展示，具体截图如下：

### 最近会话列表

![](https://raw.githubusercontent.com/SQDYY/wx-tencent-im/master/node-im/image/01.png)

### 好友会话页面

![](https://raw.githubusercontent.com/SQDYY/wx-tencent-im/master/node-im/image/02.png)

--- 

## 如何使用

样例代码包含两个项目，`node-im` 和 `wx-tencent-im`。下面会逐一介绍。

### node-im

使用腾讯云 IM 时需要通过腾讯云通讯提供的一系列 REST API 来管理你的应用，所以后端需要实现一些接口用于测试和使用，完整接口文档参考 [服务端集成指引](https://cloud.tencent.com/document/product/269/4029)。

为了快速将样例跑起来，我直接使用了 node.js 来调用腾讯云通讯提供的 REST API，要启动 `node-im` 之前，你需要 install 两个 npm 包：

``` node
cnpm install expres
cnpm install tls-sig-api
```

实际对接时，后端根据自己的开发语言去进行集成，有 3 个接口是必须实现的：

1. 通过 identifier 获取 sig （[通过私钥和公钥生成，保存 180 天](https://cloud.tencent.com/document/product/269/1510)）, 用于前端登录 im 鉴权。
2. 将用户导入到你的腾讯云 im 应用中（[独立模式帐号导入](https://cloud.tencent.com/document/product/269/1608)）。
3. 双向绑定好友关系，绑定后才能一对一通讯（[添加好友](https://cloud.tencent.com/document/product/269/1643)）。

我在 `node-im` 中提供了这 3 个接口，另外还实现了一个消息发送的接口，方便用于测试，提供接口的 url 都可以在 `express-im.js` 文件中看到，启动服务端之前，需要修改 `config.js` 和 `sig_config.js` 的配置信息，以及公钥和私钥的文件路径，这些配置信息和文件在你创建腾讯云通讯 app 应用在应用配置里面得到。

配置信息修改完毕后，执行以下代码即可启动服务端：

``` node
node express-im.js
```

### wx-tencent-im 启动

这里放置的是小程序的源码，首先介绍如何将程序跑起来：

根据官方文档的提示，首先我们需要让用户登录腾讯云 IM 应用，在登录之前，我们需要初始化一些必要参数，这些参数都在 `app.js` 中可以看到：

``` 
App({
  data: {
    im: {
      sdkAppID: 1400150342, // 用户标识接入 SDK 的应用 ID，必填
      accountType: 36862, // 帐号体系集成中的 accountType，必填
      accountMode: 0, //帐号模式，0 - 独立模式 1 - 托管模式
      imId: null, // 用户的 id
      imName: null, // 用户的 im 名称
      imAvatarUrl: null, // 用户的 im 头像 url
      userSig: null // 用户通过 imId 向后台申请的签名值 sig
    }
  }
})
```

这里的 imId，imName，imAvatarUrl 可以取 userInfo 的参数。然后将 imId 发送给服务端获取 userSig 的值，为了解决小程序异步问题，我将获取参数的方法封装在了 initImParams 方法中。

修改配置信息完毕后，重新编译一下，程序应该会报 [70013错误码](https://cloud.tencent.com/document/product/269/1671)，这是因为你还未将用户导入到你的腾讯云 im 应用中，可以通过 Postman 先制造假数据：

![](https://raw.githubusercontent.com/SQDYY/wx-tencent-im/master/node-im/image/03.jpg)

之后重新编译即可，为了能够看到数据，你需要使用 Postman 多创建几个用户，然后与当前账号绑定好友关系，然后调用聊天接口发送消息：

![](https://raw.githubusercontent.com/SQDYY/wx-tencent-im/master/node-im/image/04.png)

![](https://raw.githubusercontent.com/SQDYY/wx-tencent-im/master/node-im/image/05.png)
