const { generate } = require('modern-random-ua')
const get = require('simple-get')
const strftime = require('strftime')
const FeedParser = require('feedparser')
const debug = require('debug')('news')

const FeedStore = require('./store')

const NOOP = () => {}
const GOOGLE_RSS_FEED_URL = 'https://news.google.com/news/rss/search/section/q'
const DAY = 1000 * 60 * 60 * 24
const HALF_HOUR = 1000 * 60 * 30
const TEN_SECONDS = 1000 * 10

class GoogleNewsFeedAggregator extends FeedStore {
  constructor (topic, since = DAY, reconnect = true) {
    super()

    this._topic = topic
    this._since = since
    this._reconnect = reconnect
    this._feedparser = null
    this._req = null
    this._rref = null
    this._erref = setInterval(() => this._feed.clear(), since * 2)
    this._fc = 0
    this._iter = 0
  }

  get iterations () {
    return this._iter
  }

  get topic () {
    return this._topic
  }

  _handleFinish () {
    if (this._fc > 2 || !this._reconnect) {
      this.emit('finish')
      this.shutdown(true)
      return
    }

    this._fc++
    debug(`Request unexpectedly ended. Retrying in 10 seconds`)

    setTimeout(function () {
      this.shutdown()
      this._refresh()
    }.bind(this), TEN_SECONDS)
  }

  _refresh () {
    const url = `${GOOGLE_RSS_FEED_URL}/${encodeURIComponent(this._topic)}/` +
      `${encodeURIComponent(this._topic)}?hl=en&gl=US&ned=us`

    ++this._iter
    debug(`Started new feed watch on: ${this._topic} (${url})`)

    get({
      url: url,
      method: 'GET',
      headers: {
        'User-Agent': generate(),
        'DNT': 1
      }
    }, (err, req) => {
      this._req = req

      if (err) {
        return this.emit('error:http', err)
      }

      if (this._req.statusCode !== 200) {
        return this.emit('error:http', new Error(`refresh: Invalid status code: ${this._req.statusCode}`))
      }

      const now = Date.now()
      const articles = []
      const since = this._since

      this._feedparser = new FeedParser()
      this._feedparser.on('error', (err) => this.emit('error:feedparser', err))
      this._feedparser.on('readable', function () {
        let article
        debug(`parsing stream`)
        while ((article = this.read()) != null) {
          if ((now - article.pubdate) < since) {
            articles.push({
              title: article.title,
              description: article.description || article.summary,
              pubdate: strftime('%A, %b %d %Y', article.pubdate),
              link: article.link
            })
          }
        }
      })

      this._req.once('end', () => this._compareChanges(articles))
      this._req.once('close', this._handleFinish.bind(this))
      this._req.pipe(this._feedparser)
    })
  }

  watch (done = NOOP, refreshRate = HALF_HOUR) { // fallback to half hour changes
    if (this._rref) {
      throw new Error('watch: Feed is already active')
    }

    this._rref = setInterval(function () {
      if (this._req) {
        this.shutdown()
        debug('Destroying feed instance, refreshing')
      }

      this._refresh()
    }.bind(this), refreshRate)

    this._refresh()

    done()
  }

  shutdown (finalize = false) {
    this._req.req.abort()
    this._req.req.destroy()
    this._feedparser.destroy()

    if (finalize) {
      clearInterval(this._erref)
      clearInterval(this._rref)
      this.removeAllListeners()
    }
  }
}

module.exports = GoogleNewsFeedAggregator
