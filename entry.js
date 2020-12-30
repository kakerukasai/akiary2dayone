const sanitizeHtml = require('sanitize-html')

module.exports = class Entry {
  exportMarkdown () {
    const formattedBody = sanitizeHtml(this.body.replace(/\n/g, ''), {
            allowedTags: ['br'], // remove all tags and return text content only
            allowedAttributes: {}, // remove all tags and return text content only
          }).replace(/<br \/>/g, '\n')

    return this.titleDate + ' ' + this.title + '\n\n' + formattedBody
  }

  getISOCreatedAt () {
    return this.createdAt.toISOString().replace('.000', '')
  }
}