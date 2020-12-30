const fs = require('fs'),
      jsdom = require('jsdom'),
      axios = require('axios'),
      commandLineArgs = require('command-line-args'),
      encoding = require('encoding-japanese'),
      { exec } = require('child_process'),
      Entry = require('./Entry')

const DEFAULT_OPTIONS = [
  { name: 'username', type: String },
  { name: 'password', type: String },
  { name: 'url', type: String, multiple: true }
]

class Akiary2DayOne {

  constructor () {
    this.JSDOM = jsdom.JSDOM,
    this.options = commandLineArgs(DEFAULT_OPTIONS)
  }  
  
  async exec () {
    try {
      // Fetch files
      const responses = []
      for (let key in this.options.url) {
        responses.push(await this.getHtml(this.options.url[key]))
      }

      // Change encoding from SJIS to UTF8
      const files = this.convertEncoding(responses)

      // parse html
      const entries = this.parse(files)
      console.debug(entries)

      // export
      await this.export(entries)

    } catch (e) {
      console.error('Failed to parse files', e)
    }
  }

  async getHtml (url) {
    return await axios.get(url, {
      auth: {
        username: this.options.username,
        password: this.options.password,
      },
      responseType: 'arraybuffer',
    })
  }

  convertEncoding (responses) {
    return responses.map((response) => {
      return encoding.convert(response.data, {
        to: 'UNICODE',
        from: 'AUTO',
        type: 'string',
      })
    })
  }

  parse (files) {
    const res = []
    files.forEach((file) => {
      const dom = new this.JSDOM(file)
      const elAnchors = dom.window.document.querySelectorAll('a[name]')
      elAnchors.forEach((anchor) => {
        const elComment = anchor.nextSibling.nextSibling,
              matches = elComment.textContent.match(/^akiary_diary\sdid=(\d+)_(\d+)\sdate=(\d+)$/),
              createdAt = new Date(matches[2] * 1000),
              publishedOn = matches[3].substring(0, 4) + '-' + matches[3].substring(4, 6) + '-' + matches[3].substring(6, 8)
        const elH3 = elComment.nextElementSibling,
              titleDate = elH3.childNodes[0].textContent,
              title = elH3.childNodes[3].nodeType != 8 /* COMMENT_NODE */ ? elH3.childNodes[3].textContent : ''
        const elDiv = elH3.nextElementSibling,
              body = elDiv.innerHTML

        const entry = new Entry
        entry.createdAt = createdAt
        entry.publishedOn = publishedOn
        entry.titleDate = titleDate
        entry.title = title
        entry.body = body
        res.push(entry)
        console.log('Parsed:', publishedOn)
      })
    })
    return res
  }

  async export (entries) {
    const pathTempDir = 'temp'
    if (fs.existsSync(pathTempDir)) {
      this.deleteFolderRecursive(pathTempDir)
    }
    fs.mkdirSync(pathTempDir)

    entries.forEach((entry) => {
      const path = 'temp/' + entry.publishedOn + '.md'
      fs.writeFileSync(
        path,
        entry.exportMarkdown(),
      )

      const cmd = `dayone2 -j Imported -z Asia/Tokyo --isoDate=${entry.getISOCreatedAt()} new < ${path}`
      console.debug(cmd)
      exec(cmd, (err, stdout, stderr) => {
        console.log(err, stdout, stderr)
      })
    })
  }

  deleteFolderRecursive (path) {
    if (fs.existsSync(path)) {
      fs.readdirSync(path).forEach((file) => {
        const curPath = path + '/' + file
        if(fs.lstatSync(curPath).isDirectory()) { // recurse
          deleteFolderRecursive(curPath)
        } else { // delete file
          fs.unlinkSync(curPath)
        }
      })
      fs.rmdirSync(path)
    }
  }
}  

(async () => {
  const a2do = new Akiary2DayOne
  await a2do.exec()
})()

