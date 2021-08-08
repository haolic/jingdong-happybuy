<h1 align="center">JD-HAPPY<h1>

### 前言

代码实现基于[jd-autobuy](https://github.com/Adyzng/jd-autobuy)

最近低价显卡总是被黄牛奸商用脚本扫去，想正常买块卡都不行，实在难受就参考了网上的一些代码，写了个自动下单的脚本。
基本就是输入脚本，扫码登陆，开始监控有没有货，有货就自动下单，24小时内手机上支付掉就行。
- [x] 扫码登录
- [x] 根据地区查询商品库存
- [x] 库存>0 时自动下单
- [ ] 支持抢购商品
- [ ] 支持缓存登陆状态（仅本地）

```
   在初始化浏览器……
   初始化完成，开始抓取页面
   页面抓取完成，开始分析页面
   页面参数到手，关闭浏览器

   -------------------------------------
                请求扫码
   -------------------------------------

   二维码未扫描 ，请扫描二维码
   请手机客户端确认登录
   扫码成功，正在登录
   登录成功

   商品详情------------------------------
   时间：2017-10-26 19:57:51
   商品名：英特尔（Intel） i7 8700K 酷睿六核 盒装CPU处理器
   价格：3999.00
   状态：无货
   连接：http://item.jd.com/5008395.html

   商品详情------------------------------
   时间：2017-10-26 121:37:31
   商品名：英特尔（Intel） i7 8700K 酷睿六核 盒装CPU处理器
   价格：3999.00
   状态：有货
   连接：http://item.jd.com/5008395.html

   开始加入购物车
   商品已成功加入购物车！

   订单详情
   订单总金额：￥3999.00
   寄送至： xxxxxx
   收货人：xxxxxx

   开始下单
   下单成功,订单号xxxxx
   请前往京东商城及时付款，以免订单超时取消
```

### 使用

推荐使用 `yarn`

```bash
$ yarn

$ yarn start -a 地区编号 -g 商品编号
```

<p align="center">
<img src="./demo.gif" width="80%"/>
</p>

### 帮助

```bash
$ yarn start

监控库存：
Usage: node index.js -a 地区编号 -g 商品编号

应用方式: yarn start -a 地区编号 -g 商品编号

抢购：
yarn start -a 地区编号 -g 商品编号 -f 抢购开始时间，格式YYYYMMDDHH:mm:ss
抢购模式尽量在临近开抢20秒内再开始使用，防止高频率调用接口被关小黑屋

选项：
  --version   显示版本号                                                  [布尔]
  -a, --area  地区编号                                                    [必需]
  -g, --good  商品编号                                                    [必需]
  -t, --time  查询间隔ms                                       [默认值: "10000"]
  -b, --buy   是否下单                                            [默认值: true]
  -h, --help  显示帮助信息                                                [布尔]

示例：
  node index.js -a 2_2830_51810_0 -g 5008395

必须的选项：a, g
```
