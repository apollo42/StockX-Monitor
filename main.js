const rp = require('request-promise-native');
const cheerio = require('cheerio');

const webhooks = require('./webhooks');
// Your discord webhook
const DISCORD_HOOK = '';

function eliminateDuplicates(arr) {
  let i;
  const len = arr.length;
  const out = [];
  const obj = {};
  for (i = 0; i < len; i += 1) {
    obj[arr[i]] = 0;
  }
  for (i in obj) {
    out.push(i);
  }
  return out;
}

const pause = (time) => { 
  return new Promise((resolve)=>{
    setTimeout(()=>{
      resolve();
    }, time);
  })
}

class StockXMonitor extends webhooks {
  constructor(taskID, product, wantedPrice) {
    super(DISCORD_HOOK);
    this.ID = taskID;
    this.product = product;
    this.wantedPrice = wantedPrice;
    this.stopped = false;
    this.monitorDelay = 5000;
    this.errorDelay = 3000;
    this.cookieJar = rp.jar();
    this.firsLoop = true;
    this.productData = {};
  }
  async start() {
    while (!this.stopped) {
      await pause(this.firsLoop ? 0 : this.monitorDelay);
      await this.monitor();
    }
  }
  async monitor() {
    if (this.stopped) {
      return;
    }
    try {
      console.log(`Task [${this.ID}] - Monitoring...`)
      const options = {
        uri: this.product,
        resolveWithFullResponse: true,
        jar: this.cookieJar,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Mobile Safari/537.36',
        },
        resolveWithFullResponse: true,
      }
      const response = await rp(options);
      const $ = cheerio.load(response.body);
      this.productData = {
        name: $('.name').text(),
        image: $('.image-container').children('img').attr('src'),
      }
      const lowestAsks = $('.select-option .inset .subtitle').text().split('$').sort();
      const filterAsks = eliminateDuplicates(lowestAsks);
      for (let i = 0; i < filterAsks.length; i += 1) {
        const price = filterAsks[i];
        if (price !== '' && this.matchesPrice(price)) {
          console.log(`Task [${this.ID}] - Price matched!: ${this.productData.name} for: $${price}`);
          this.stockxHook(this.product, this.productData.image, this.productData.name, price);
          this.stopTask();
          break;
        }
      }
      this.firsLoop = false;
    } catch (error) {
      if (error.statusCode === 429) {
        console.log(`Task [${this.ID}] - Rate limted. ${error.statusCode}`); 
        await pause(60000);
      } else if (error.statusCode === 403) {
        console.log(`Task [${this.ID}] - Banned from site. ${error.statusCode}`); 
        this.stopTask();
      } else {
        console.log(error);
        await pause(this.errorDelay);
      }
    }
  }
  stopTask() {
    this.stopped = true;
  }
  matchesPrice(price) {
    return parseInt(price, 10) <= parseInt(this.wantedPrice, 10);
  }
}
// Amount of tasks wanted
const wantedTasks = 1;
const tasks = [...Array(wantedTasks).keys()];

for (let i = 0; i < tasks.length; i++) {
  tasks[i] = new StockXMonitor(i.toString(),'https://stockx.com/adidas-yeezy-boost-350-v2-yecheil', '259');
  tasks[i].start();
}