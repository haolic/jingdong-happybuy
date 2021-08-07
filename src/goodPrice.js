const { getRandomInt, splitGoodId } = require('./utils');
const request = require('axios');

// 商品价格
async function goodPrice(stockId, defaultInfo) {
  const stockIdArr = splitGoodId(stockId);
  const callback = {};
  let name;
  let priceInfoArr;

  callback[(name = 'jQuery' + getRandomInt(100000, 999999))] = (data) => {
    priceInfoArr = data;
  };

  const result = await request({
    method: 'get',
    url: 'http://p.3.cn/prices/mgets',
    headers: Object.assign(defaultInfo.header, {
      cookie: defaultInfo.cookieData.join(''),
    }),
    params: {
      type: 1,
      pduid: new Date().getTime(),
      skuIds: stockIdArr.map((el) => `J_${el}`).join(','),
      callback: name,
    },
  });

  eval('callback.' + result.data);

  return priceInfoArr.map((el, idx) => {
    return {
      price: el.p,
      id: stockIdArr[idx],
    };
  });
}

module.exports = goodPrice;
