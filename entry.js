const sanitizeHtml = require('sanitize-html')

module.exports = class Entry {
  exportMarkdown () {
    const formattedBody = sanitizeHtml(this.body.replace(/\n/g, ''), {
            allowedTags: ['br', 'b', 'strong'],
            allowedAttributes: {},
          }).replace(/<br \/>/g, '\n')
            .replace(/\n　/g, '\n&#8203;　')
            .replace(/^　/g, '\n&#8203;　')

    return this.titleDate + ' ' + this.title + '\n\n' + formattedBody
  }

  getISOCreatedAt () {
    return this.createdAt.toISOString().replace('.000', '')
  }
}