/*
*  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
*
*  Use of this source code is governed by a BSD-style license
*  that can be found in the LICENSE file in the root of the source
*  tree.
*/

// This code is adapted from
// https://rawgit.com/Miguelao/demos/master/mediarecorder.html

'use strict'

/* globals MediaRecorder */

const mimes = [
  {
    type: 'video/mp4; codecs="avc1.42E01E"',
    description: 'mp4 with H.264 Constrained Baseline Profile Level 3; Broadway compatible',
  },
  {type: 'video/mp4; codecs="avc1.4D401E"', description: 'mp4 with H.264 Main Profile Level 3'},
  {type: 'video/mp4; codecs="avc1.64001E"', description: 'mp4 with H.264 High Profile Level 3'},
  {type: 'video/mp4', description: 'mp4 generic'},
  {type: 'video/webm; codecs="avc1.42E01E"', description: 'webm with H.264 Constrained Baseline Profile Level 3; Broadway compatible', prio: 0, },
  {type: 'video/webm; codecs="avc1.4D401E"', description: 'webm with H.264 Main Profile Level 3', prio: 1},
  {type: 'video/webm; codecs="avc1.64001E"', description: 'webm with H.264 High Profile Level 3', prio: 2},
  {type: 'video/webm;codecs=vp9', description: 'webm with vp9'},
  {type: 'video/webm;codecs=vp8', description: 'webm with vp8'},
  {type: 'video/webm', description: 'webm generic'},
]

const dataAvailableInterval = 10

const mediaSource = new MediaSource ()
mediaSource.addEventListener ('sourceopen', handleSourceOpen, false)
let mediaRecorder
let recordedBlobs
let sourceBuffer

const errorMsgElement = document.querySelector (' #errorMsg')
const originalConsoleLog = console.log
console.log = function () {
  originalConsoleLog(arguments)
  const list = [...arguments]
  const items = JSON.stringify(list)
  errorMsgElement.innerHTML += `log: ${items}<br />`
}
const originalConsoleError = console.error
console.error = function () {
  originalConsoleLog(arguments)
  const list = [...arguments]
  const items = JSON.stringify(list)
  errorMsgElement.innerHTML += `error: ${items}<br />`
}

const recordedVideo = document.querySelector ('video#recorded')
const recordButton = document.querySelector ('button#record')
recordButton.addEventListener ('click', () => {
  if (recordButton.textContent === 'Start Recording') {
    startRecording ()
  } else {
    stopRecording ()
    recordButton.textContent = 'Start Recording'
    playButton.disabled = false
    downloadButton.disabled = false
  }
})

const playButton = document.querySelector ('button#play')
playButton.addEventListener ('click', () => {
  const superBuffer = new Blob (recordedBlobs, {type: 'video/webm'})
  recordedVideo.src = null
  recordedVideo.srcObject = null
  recordedVideo.src = window.URL.createObjectURL (superBuffer)
  recordedVideo.controls = true
  recordedVideo.play ()
})

const downloadButton = document.querySelector ('button#download')
downloadButton.addEventListener ('click', () => {
  const blob = new Blob (recordedBlobs, {type: 'video/webm'})
  const url = window.URL.createObjectURL (blob)
  const a = document.createElement ('a')
  a.style.display = 'none'
  a.href = url
  a.download = 'test.webm'
  document.body.appendChild (a)
  a.click ()
  setTimeout (() => {
    document.body.removeChild (a)
    window.URL.revokeObjectURL (url)
  }, 100)
})

function handleSourceOpen (event) {
  console.log ('MediaSource opened')
  sourceBuffer = mediaSource.addSourceBuffer ('video/webm; codecs="vp8"')
  console.log ('Source buffer: ', sourceBuffer)
}
let logCount = 0
function handleDataAvailable (event) {
  if (event.data && event.data.size > 0) {
    const now = event.timecode || Date.now()
    const timeStep = event.target.previousTime ? (now - event.target.previousTime).toFixed (1) : ""
    if (++logCount <= 100) console.log ('data', event.data.size, timeStep)
    recordedBlobs.push (event.data)
    event.target.previousTime = now
  }
}


function startRecording () {
  if (!MediaRecorder || typeof MediaRecorder !== 'function' || typeof MediaRecorder.isTypeSupported !== 'function') {
    errorMsgElement.innerHTML += `MediaRecorder not available`
    return
  }
  recordedBlobs = []
  let supportedMime
  errorMsgElement.innerHTML += `<h3>isTypeSupported results</h3>`
  for (let i = 0; i < mimes.length; i++) {
    const mime = mimes[i]
    if (MediaRecorder.isTypeSupported (mime.type)) {
      errorMsgElement.innerHTML += `    Supported: ${mime.type} ${mime.description}<br />`
      if (!supportedMime || supportedMime.prio < mime.prio) supportedMime = mime
    } else {
      errorMsgElement.innerHTML += `Not Supported: ${mime.type} ${mime.description}<br />`
    }
  }
  let options = {mimeType: supportedMime.type}
  try {
    mediaRecorder = new MediaRecorder (window.stream, options)
  } catch (e) {
    console.error ('Exception while creating MediaRecorder:', e)
    errorMsgElement.innerHTML += `Exception while creating MediaRecorder: ${JSON.stringify (e)}<br />`
    return
  }
  errorMsgElement.innerHTML = `Using: ${supportedMime.type} ${supportedMime.description}<br />` + errorMsgElement.innerHTML

  console.log ('Created MediaRecorder', mediaRecorder, 'with options', options)
  recordButton.textContent = 'Stop Recording'
  playButton.disabled = true
  downloadButton.disabled = true
  mediaRecorder.onstop = (event) => {
    console.log ('Recorder stopped: ', event)
  }
  mediaRecorder.ondataavailable = handleDataAvailable
  mediaRecorder.previousTime = null
  mediaRecorder.start (dataAvailableInterval || 10)
  console.log ('MediaRecorder started', mediaRecorder)
}

function stopRecording () {
  mediaRecorder.stop ()
  console.log (recordedBlobs.length, 'blobs recorded')
}

function handleSuccess (stream) {
  recordButton.disabled = false
  console.log ('getUserMedia() got stream:', stream)
  window.stream = stream

  const gumVideo = document.querySelector ('video#gum')
  gumVideo.srcObject = stream
}

async function init (constraints) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia (constraints)
    handleSuccess (stream)
  } catch (e) {
    console.error ('navigator.getUserMedia error:', e, constraints)
  }
}

document.querySelector ('button#start').addEventListener ('click', async () => {
  const wantsAudio = document.querySelector ('#wantsAudio').checked
  const hasEchoCancellation = document.querySelector ('#echoCancellation').checked
  let constraints = {
    video: {
      width: 640, height: 480,
    },
  }
  constraints = {
    video: true
  }
  if (wantsAudio) constraints.audio = {
    echoCancellation: {exact: hasEchoCancellation},
  }

  console.log ('Using media constraints:', constraints)
  await init (constraints)
})
