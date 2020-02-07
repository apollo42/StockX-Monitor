const rp = require('request-promise-native');

class Hook {
  constructor(webhook) {
    this.webhook = webhook;
  }
  stockxHook(url, image, name, price) {
    const options = {
      method: 'POST',
      uri: this.webhook,
      json: {
        embeds: [{
          title: name,
          color: 12124075,
          url,
          footer: {
            text: `${new Date().toTimeString().slice(0, 8)}`,
          },
          image: {
            url: image,
          },
          author: {
            name: 'Price matched!',
          },
          fields: [
            {
              name: 'Price',
              value: `$${price}`,
              inline: false,
            },
          ],
        }],
      },
    };

    try {
      rp(options);
      console.log(`Task [${this.ID}] - Sent Hook!`);
    } catch(error) {
      console.log(error)
    }
  }
  tets() {
    console.log(this.webhook);
  }
}
module.exports = Hook;
