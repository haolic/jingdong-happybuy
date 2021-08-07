const { splitGoodId } = require('./utils');
const request = require('axios');

// 商品状态
const requestGoodStatus = async (goodId, areaId) => {
  const res = await request({
    method: 'get',
    url: 'http://c0.3.cn/stocks',
    headers: {
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      Host: 'c0.3.cn',
      Pragma: 'no-cache',
      'Content-type': 'application/json;charset=gbk', // 指定charset不生效, 中文还是乱码，问题不大，也可能是不对。
      'Upgrade-Insecure-Requests': 1,
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
    },
    params: {
      type: 'getstocks',
      area: areaId,
      skuIds: goodId,
    },
  });
  return res.data;
};

const stateMap = {
  33: '有货',
  34: '无货',
  40: '可配货'
};

/**
 * 查询对应地区的商品库存
 * @param {String} goodId 商品id 例如100022887988,100011553443，多个id用英文逗号分隔
 * @param {String} areaId 地区编码
 */
const goodStatus = async (goodId, areaId) => {
  const goodIdArr = splitGoodId(goodId);
  try {
    const statusMap = await requestGoodStatus(goodId, areaId);
    const goodStateMap = goodIdArr.map((el) => {
      const { StockState, err } = statusMap[el];
      return {
        goodId: el,
        StockState,
        StockStateName: err ? '出错' : stateMap[StockState] || '未知',
        err,
      };
    });
    return goodStateMap;
  } catch (e) {
    console.log(e);
    const goodStateMap = goodIdArr.map((el) => {
      return {
        goodId: el,
        StockState: 34,
        StockStateName: '出错',
        err: true,
      };
    });
    return goodStateMap;
  }
};

module.exports = goodStatus;
