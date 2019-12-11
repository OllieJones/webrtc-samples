/* console log capture */
const errorMsgElement = document.querySelector (' #errorMsg')
console.originalLog = console.log
console.log = function () {
  console.originalLog (...arguments)
  console.logALine ('log', ...arguments)
}
console.originalError = console.error
console.error = function () {
  console.originalError (...arguments)
  console.logALine ('error', ...arguments)
}

const logTable = document.querySelector ("table#log")

function mkSpan (text) {
  const span = document.createElement ('span')
  span.textContent = text.replace(/ /g,'\u00a0')
  return span
}

console.logALine = function (...vals) {
  if (logTable) {
    let items = []
    for (let i = 0; i < vals.length; i++) {
      const val = vals[i]
      let spans = []
      if (typeof val === 'string') {
        val.split (/[\r\n]+/).forEach (line => {
          spans.push (mkSpan (line))
        })
      } else if (val.name && val.message && typeof val.message === 'string')
        spans.push (mkSpan ()`${val.name}: ${val.message}`)
      else spans.push (mkSpan(JSON.stringify (val)))
      items.push (spans)
    }
    const row = document.createElement ('tr')
    for (let i = 0; i < items.length; i++) {
      const col = document.createElement ('td')
      items[i].forEach (span => {
        col.appendChild (span)
        col.appendChild (document.createElement('br'))
      })
      col.removeChild(col.lastChild)
      row.appendChild (col)
    }
    logTable.appendChild (row)
  }
}
logALine = console.logALine
