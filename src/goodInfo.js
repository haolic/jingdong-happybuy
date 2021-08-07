const request = require('axios');
const { splitGoodId } = require('./utils');
const iconv = require('iconv-lite');
const cheerio = require('cheerio');

// 商品信息
const goodInfo = async (goodId, defaultInfo) => {
  const goodIdArr = splitGoodId(goodId);
  const goodInfoList = await Promise.all(
    goodIdArr.map(async (el) => {
      const pageLink = `http://item.jd.com/${el}.html`;
      const res = await request({
        method: 'get',
        url: pageLink,
        headers: Object.assign(defaultInfo.header, {
          cookie: defaultInfo.cookieData.join(''),
        }),
        responseType: 'arraybuffer',
      });
      const body = cheerio.load(iconv.decode(res.data, 'utf8'));

      const name = body('div.sku-name').text().trim();
      const cartLink = body('a#InitCartUrl').attr('href');
      return {
        name,
        pageLink: pageLink,
        cartLink: cartLink ? `http:${cartLink}` : '暂无',
      };
    })
  );
  return goodInfoList;
};

module.exports = goodInfo;
