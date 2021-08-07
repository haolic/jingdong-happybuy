const args = require('./args');
const log = require('./log');
const { sleep, writeAndOpenFile, getRandomInt, cookieParser } = require('./utils');
const puppeteer = require('puppeteer');
const fs = require('fs');
const $ = require('cheerio');
const request = require('axios');
const dayjs = require('dayjs');
const goodPrice = require('./goodPrice');
const goodStatus = require('./goodStatus');
const goodInfo = require('./goodInfo');

const { area: areaId, good: goodId, time, buy: isBuy, buyTime } = args();

// Initial request params
const defaultInfo = {
  header: {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
    'Content-Type': 'text/plain;charset=utf-8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.6,en;q=0.4,en-US;q=0.2',
    Connection: 'keep-alive',
  },
  qrUrl: 'https://qr.m.jd.com/show',
  scanUrl: 'https://qr.m.jd.com/check',
  loginUrl: 'https://passport.jd.com/uc/qrCodeTicketValidation',
  cookies: null,
  cookieData: null,
  areaId,
  goodId,
  time,
  ticket: '',
  token: '',
  uuid: '',
  eid: '',
  fp: '',
};

// 初始化输出的商品信息
const goodData = {
  name: '',
  price: '',
  link: `http://item.jd.com/${defaultInfo.goodId}.html`,
  stockStatus: '',
  time: '',
  cartLink: '',
};

// 请求扫码
async function requestScan() {
  try {
    const result = await request({
      method: 'get',
      url: defaultInfo.qrUrl,
      headers: defaultInfo.header,
      params: {
        appid: 133,
        size: 147,
        t: Date.now(),
      },
      responseType: 'arraybuffer',
    });

    defaultInfo.cookies = cookieParser(result.headers['set-cookie']);
    defaultInfo.cookieData = result.headers['set-cookie'];
    const image_file = result.data;

    await writeAndOpenFile('qr.png', image_file);
  } catch (error) {
    return Promise.reject(error);
  }
}

// 监听扫码状态
async function listenScan() {
  try {
    let flag = true;
    let ticket;

    while (flag) {
      const callback = {};
      let name;
      callback[(name = 'jQuery' + getRandomInt(100000, 999999))] = (data) => {
        log(`${data.msg || '扫码成功，正在登录'}`);
        if (data.code === 200) {
          flag = false;
          ticket = data.ticket;
        }
      };

      const result = await request({
        method: 'get',
        url: defaultInfo.scanUrl,
        headers: Object.assign(
          {
            Host: 'qr.m.jd.com',
            Referer: 'https://passport.jd.com/new/login.aspx',
            Cookie: defaultInfo.cookieData.join(';'),
          },
          defaultInfo.header
        ),
        params: {
          callback: name,
          appid: 133,
          token: defaultInfo.cookies['wlfstk_smdl'],
          _: new Date().getTime(),
        },
      });

      eval('callback.' + result.data);
      await sleep({ time: 1000 });
    }

    return ticket;
  } catch (error) {
    return Promise.reject(error);
  }
}

// 开始登录
async function login(ticket) {
  try {
    const result = await request({
      method: 'get',
      url: defaultInfo.loginUrl,
      headers: Object.assign(
        {
          Host: 'passport.jd.com',
          Referer: 'https://passport.jd.com/uc/login?ltype=logout',
          Cookie: defaultInfo.cookieData.join(''),
        },
        defaultInfo.header
      ),
      params: {
        t: ticket,
      },
    });

    defaultInfo.header['p3p'] = result.headers['p3p'];
    return (defaultInfo.cookieData = result.headers['set-cookie']);
  } catch (error) {
    return Promise.reject(error);
  }
}

// 无货商品状态轮训
async function runGoodSearch() {
  let flag = true;
  let canBuyGoodLink = '';

  while (flag) {
    try {
      const [priceArr, statusArr, infoArr] = await Promise.all([
        goodPrice(defaultInfo.goodId, defaultInfo),
        goodStatus(defaultInfo.goodId, defaultInfo.areaId),
        goodInfo(defaultInfo.goodId, defaultInfo),
      ]);
      const allInfoArr = infoArr.map((el, idx) => {
        const { price } = priceArr[idx];
        const { StockStateName, goodId, StockState, err } = statusArr[idx];
        const { name, pageLink, cartLink } = el;
        // 商品是要预约定时抢购的商品
        if (buyTime) {
          if (dayjs().isAfter(dayjs(buyTime, 'YYYYMMDDHH:mm:ss'))) {
            // 目前时间比设定时间大
            return {
              name,
              price,
              goodId,
              pageLink,
              cartLink:
                StockState === 33
                  ? `https://cart.jd.com/gate.action?pcount=1&ptype=1&pid=${goodId}`
                  : '无链接',
              StockState,
              StockStateName,
              err,
            };
          }
        }
        return {
          name,
          price,
          goodId,
          pageLink,
          cartLink,
          StockState,
          StockStateName,
          err,
        };
      });

      const infoStr = allInfoArr.map((el) => {
        const { name, price, StockState, StockStateName, pageLink, cartLink, err } = el;
        return `${name}
价格：${price} 状态： ${StockState} ${StockStateName} 是否错误：${err ? err : '否'}
页面链接：${pageLink}
加购物车链接：${cartLink || '暂无链接'}
`;
      }).join(`
`);

      const str = `--------------------------------
时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}
${infoStr}
`;
      console.log(str);
      const fileName = `records/${dayjs().format('YYYY-MM-DD HH')}.txt`;
      fs.appendFile(fileName, str, (err) => {
        if (err) {
          console.log(err);
          fs.appendFile(fileName, err);
        }
        console.log(`已保存日志${fileName}`);
      });
      const canBuyGood = allInfoArr.find((el) => {
        return el.StockState === 33 && el.cartLink;
      });
      if (canBuyGood) {
        flag = false;
        canBuyGoodLink = canBuyGood.cartLink;
        return canBuyGoodLink;
      } else {
        await sleep(defaultInfo);
      }
    } catch (error) {
      console.log(error);
      fs.appendFile('records/errorlog.txt', err);
      return Promise.reject(error);
    }
  }
}

// 加入购物车
async function addCart(link) {
  try {
    log();
    log('开始加入购物车');

    const result = await request({
      method: 'get',
      url: link,
      headers: Object.assign(defaultInfo.header, {
        cookie: defaultInfo.cookieData.join(''),
      }),
    });

    const body = $.load(result.data);

    const addCartResult = body('h3.ftx-02').text();

    if (addCartResult) {
      console.log(`${addCartResult}`);
      return true;
    } else {
      log.fail('添加购物车失败');
      return false;
    }
  } catch (error) {
    return Promise.reject();
  }
}

// 下单
async function buy() {
  const orderInfo = await request({
    method: 'get',
    url: 'https://trade.jd.com/shopping/order/getOrderInfo.action',
    headers: Object.assign(defaultInfo.header, {
      cookie: defaultInfo.cookieData.join(''),
    }),
    params: {
      rid: new Date().getTime(),
    },
    responseType: 'arraybuffer',
  });

  const body = $.load(orderInfo.data);
  const payment = body('span#sumPayPriceId').text().trim();
  const sendAddr = body('span#sendAddr').text().trim();
  const sendMobile = body('span#sendMobile').text().trim();

  console.log();
  console.log(`   订单详情------------------------------`);
  console.log(`   订单总金额：${payment}`);
  console.log(`   ${sendAddr}`);
  console.log(`   ${sendMobile}`);
  console.log();

  console.log('   开始下单');

  const result = await request({
    method: 'post',
    url: 'https://trade.jd.com/shopping/order/submitOrder.action',
    headers: Object.assign(defaultInfo.header, {
      origin: 'https://trade.jd.com',
      referer: 'https://trade.jd.com/shopping/order/getOrderInfo.action',
      cookie: defaultInfo.cookieData.join(''),
    }),
    params: {
      overseaPurchaseCookies: '',
      vendorRemarks: '[]',
      'submitOrderParam.sopNotPutInvoice': 'false',
      'submitOrderParam.trackID': 'TestTrackId',
      'submitOrderParam.presaleStockSign': '1',
      'submitOrderParam.ignorePriceChange': '0',
      'submitOrderParam.btSupport': '0',
      'submitOrderParam.eid': defaultInfo.eid,
      'submitOrderParam.fp': defaultInfo.fp,
      'submitOrderParam.jxj': '1',
    },
  });
  const fileName = dayjs().format('YYYY-MM-DD HH:mm:ss') + '.txt';
  if (result.data.success) {
    console.log(`下单成功,订单号${result.data.orderId}`);
    console.log('请前往京东商城及时付款，以免订单超时取消');
    fs.appendFile(
      `records/${fileName}`,
      `\n
      订单详情------------------------------\n
      订单总金额：${payment}\n
      下单成功,订单号${result.data.orderId}\n
      请前往京东商城或手机京东及时付款，以免订单超时取消\n
      https://order.jd.com/center/list.action`,
      (err) => {
        if (err) throw err;
        console.log('\n');
        console.log(`已保存下单日志，${fileName}`);
      }
    );
  } else {
    console.log(`下单失败,${result.data.message}`);
  }
}

log('初始化浏览器');
puppeteer
  .launch()
  .then(async (browser) => {
    log('初始化完成，开始抓取页面');
    const page = await browser.newPage();
    await page.goto('https://passport.jd.com/new/login.aspx');
    await sleep({ time: 1000 });
    log('页面抓取完成，开始分析页面');
    const inputs = await page.evaluate((res) => {
      const result = document.querySelectorAll('input');
      const data = {};

      for (let v of result) {
        switch (v.getAttribute('id')) {
          case 'token':
            data.token = v.value;
            break;
          case 'uuid':
            data.uuid = v.value;
            break;
          case 'eid':
            data.eid = v.value;
            break;
          case 'sessionId':
            data.fp = v.value;
            break;
        }
      }

      return data;
    });

    Object.assign(defaultInfo, inputs);
    await browser.close();

    log('页面参数到手，关闭浏览器');
    log('请求扫码...');
  })
  .then(() => requestScan())
  .then(() => listenScan())
  .then((ticket) => {
    defaultInfo.trackid = ticket;
    return login(ticket);
  })
  .then(() => {
    log('查询中...\n');
    return runGoodSearch();
  })
  .then((addCartLink) => addCart(addCartLink))
  .then((value) => {
    if (value) return isBuy ? buy() : '';
  })
  .catch((error) => {
    if (!error) {
      return process.exit(-1);
    }
    console.error(error);
  });
