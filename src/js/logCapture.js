/* console log capture */
const errorMsgElement = document.querySelector (' #errorMsg')
console.originalLog = console.log
console.log = function () {
  console.originalLog (arguments)
  console.logALine ('log', ...arguments)
}
console.originalError = console.error
console.error = function () {
  console.originalError (arguments)
  console.logALine ('error', ...arguments)
}

const logTable = document.querySelector ("table#log")

console.logALine = function  (...vals) {
  if (logTable) {
    let items = []
    for (let i = 0; i < vals.length; i++) {
      const val = vals[i]
      let item
      if (typeof val === 'string') item = val
      else if (val.name && val.message && typeof val.message === 'string') item = `${val.name}: ${val.message}`
      else item = JSON.stringify (val)
      items.push (item)
    }
    const row = document.createElement ('tr')
    for (let i = 0; i < items.length; i++) {
      const col = document.createElement ('td')
      const span = document.createElement ('span')
      span.textContent = items[i]
      col.appendChild (span)
      row.appendChild (col)
    }
    logTable.appendChild (row)
  }
}
logALine = console.logALine
