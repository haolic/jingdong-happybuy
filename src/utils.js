const fs = require('fs');
const opn = require('opn');
const dayjs = require('dayjs');

function sleep(defaultInfo, fastBuyTime) {
  return new Promise((resolve) => {
    const loop = () => {
      if (dayjs().isAfter(dayjs(fastBuyTime, 'YYYYMMDDHH:mm:ss'))) {
        resolve();
        return;
      } else {
        setTimeout(() => {
          loop();
        }, 60);
      }
    };
    // 如果是预约定时抢购商品，sleep时100ms的间隔轮询判断是否到时间了，到了之后直接resolve();
    if (fastBuyTime) {
      loop();
      return;
    }
    setTimeout(() => {
      resolve();
    }, defaultInfo.time);
  });
}

function writeAndOpenFile(fileName, file) {
  return new Promise((resolve, reject) => {
    fs.writeFile(fileName, file, 'binary', (err) => {
      if (err) {
        return reject(err);
      }
      opn(fileName);
      resolve();
    });
  });
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function cookieParser(cookies) {
  const result = {};
  cookies.forEach((cookie) => {
    const temp = cookie.split(';');
    temp.forEach((val) => {
      const flag = val.split('=');
      result[flag[0]] = flag.length === 1 ? '' : flag[1];
    });
  });
  return result;
}

function splitGoodId(goodId) {
  return `${goodId}`.split(/\s*,\s*/);
}

module.exports = {
  sleep,
  writeAndOpenFile,
  getRandomInt,
  cookieParser,
  splitGoodId,
};
