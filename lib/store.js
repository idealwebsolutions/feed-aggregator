const { EventEmitter } = require('events')
const { createHash } = require('crypto')
const debug = require('debug')('store')

class FeedStore extends EventEmitter {
  constructor () {
    super()

    this._feed = new Set()
  }

  // compare two feeds
  _compareChanges (feed) {
    if (!Array.isArray(feed)) {
      throw new TypeError('_compareChanges: Feed is not an array')
    }

    if (this._feed.size < 1) {
      feed.forEach((article) => {
        const hash = createHash('sha1').update(article.link).digest('hex')
        this._feed.add(hash)
        debug(`Article: ${article.title} | Link: ${article.link}`)
        this.emit('article', article)
      })
      debug(`new feed length: ${feed.length}`)
      return
    }

    debug(`old feed length: ${this._feed.size}`)
    debug(`new feed length: ${feed.length}`)

    feed.forEach((article) => {
      const hash = createHash('sha1').update(article.link).digest('hex')

      if (!this._feed.has(hash)) {
        this._feed.add(hash)
        debug(`new entry detected: ${hash}`)
        debug(`new article: ${article.title} | Link: ${article.link}`)
        this.emit('article', article)
      }
    })
  }
}

module.exports = FeedStore
