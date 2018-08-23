# google-news-feed-aggregator
Feed aggregator for Google News

# Install

    $ git clone https://github.com/idealwebsolutions/google-news-feed-aggregator.git
    $ cd google-news-feed-aggregator && npm install

# Example
```js
const GoogleNewsFeedAggregator = require('./')

const feed = new GoogleNewsFeedAggregator('tesla')

feed.on('error:http', console.error)
feed.on('error:feedparser', console.error)
feed.once('finish', () => console.log(`Feed for topic(${feed.topic}) has ended`))
feed.on('article', (article) => console.log(`Found article: ${article.link}`))

feed.watch()
```

# TODO
- Tests

# License
MIT
