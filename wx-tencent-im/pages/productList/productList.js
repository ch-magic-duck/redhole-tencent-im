const app = getApp()

Page({
  data: {
    images: []
  }, 
  onLoad: function () {
    this.loadImages();
  },
  loadImages: function () {
    let images = [
      {
        product_id: 550,
        price: "169.000",
        url: "https://app.saidetest.com/public/images/47/6d/39/77d1e4322626e6adfb6055a65a8a6f55960b55d0.jpg",
        name: "七彩人生"
      },
      {
        product_id: 550,
        price: "169.000",
        url: "https://app.saidetest.com/public/images/47/6d/39/77d1e4322626e6adfb6055a65a8a6f55960b55d0.jpg",
        name: "七彩人生"
      },
      {
        product_id: 550,
        price: "169.000",
        url: "https://app.saidetest.com/public/images/47/6d/39/77d1e4322626e6adfb6055a65a8a6f55960b55d0.jpg",
        name: "七彩人生"
      },
      {
        product_id: 550,
        price: "169.000",
        url: "https://app.saidetest.com/public/images/47/6d/39/77d1e4322626e6adfb6055a65a8a6f55960b55d0.jpg",
        name: "七彩人生"
      },
      {
        product_id: 550,
        price: "169.000",
        url: "https://app.saidetest.com/public/images/47/6d/39/77d1e4322626e6adfb6055a65a8a6f55960b55d0.jpg",
        name: "七彩人生"
      }
    ];
    this.setData({
      images: images
    });
  },
  sendProduct: function(e) {
    var pages = getCurrentPages()
    var prevPage = pages[pages.length - 2] // 上一个页面
    console.log(e)
    prevPage.setData({
      product: {
        id: e.currentTarget.dataset.id, 
        name: e.currentTarget.dataset.name,
        avatarUrl: e.currentTarget.dataset.src,
        price: e.currentTarget.dataset.price,
        link: 'www.baidu.com'
      }
    })
    wx.navigateBack({
      url: '/pages/chat/chat'
    })
  }
})