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
    prio: 3,
  },
  {type: 'video/mp4; codecs="avc1.4D401E"', description: 'mp4 with H.264 Main Profile Level 3', prio: 2},
  {type: 'video/mp4; codecs="avc1.64001E"', description: 'mp4 with H.264 High Profile Level 3', prio: 3},
  {type: 'video/mp4', description: 'mp4 generic', prio: 0},
  {
    type: 'video/webm; codecs="avc1.42E01E"',
    description: 'webm with H.264 Constrained Baseline Profile Level 3; Broadway compatible',
    prio: 3,
  },
  {type: 'video/webm; codecs="avc1.4D401E"', description: 'webm with H.264 Main Profile Level 3', prio: 1},
  {type: 'video/webm; codecs="avc1.64001E"', description: 'webm with H.264 High Profile Level 3', prio: 2},
  {type: 'video/webm;codecs=vp9', description: 'webm with vp9'},
  {type: 'video/webm;codecs=vp8', description: 'webm with vp8'},
  {type: 'video/webm', description: 'webm generic'},
]

const dataAvailableInterval = 10
let useRequestDataMethod = true

const dudMimeTypes = new Set ()

window.addEventListener ('load', function () {

  try {
    if (!navigator || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      console.error ('getUserMedia', 'not available in this browser')
      return
    }
  } catch (exception) {
    console.error ('getUserMedia', exception.toString ())
    return
  }
  try {
    if (!MediaRecorder || typeof MediaRecorder !== 'function') {
      console.error ('MediaRecorder', 'not available in this browser')
      return
    }
  } catch (exception) {
    console.error ('MediaRecorder', exception.toString ())
    return
  }
  try {
    if (typeof MediaRecorder.isTypeSupported !== 'function') {
      console.error ('.isTypeSupported', 'not available in this browser, polyfilling')
      MediaRecorder.isTypeSupported = function (mime) {
        return !dudMimeTypes.has (mime)
      }
    }
  } catch (exception) {
    console.error ('.isTypeSupported', exception.toString ())
    return
  }


  let mediaRecorder
  let recordedBlobs

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

  function handleDataAvailable (event) {
    if (event.data && event.data.size > 0) {
      event.target.dataAvailableCount++
      const now = event.timecode || Date.now ()
      const previous = event.target.previousTime || event.target.startTime
      const timeStep = (now - previous).toFixed (1)
      if (event.target.dataAvailableCount <= 10) {
        if (timeStep > 10 * event.target.intervalTime) console.error ('datahandler', 'long interval', timeStep)
        console.logALine ('datahandler', event.data.size, timeStep)
      }
      recordedBlobs.push (event.data)
      event.target.previousTime = now
      if (useRequestDataMethod) event.target.doRequestData (event.target.intervalTime)
    }
  }

  function startRecording () {
    recordedBlobs = []
    let supportedMime
    for (let i = 0; i < mimes.length; i++) {
      const mime = mimes[i]
      if (MediaRecorder.isTypeSupported (mime.type)) {
        console.logALine ('supported', mime.type, mime.description)
        if (!supportedMime || supportedMime.prio < mime.prio) supportedMime = mime
      } else {
        console.logALine ('unsupported', mime.type, mime.description)
      }
    }
    logALine ('using', supportedMime.type, supportedMime.description)
    let options = {mimeType: supportedMime.type}
    try {
      mediaRecorder = new MediaRecorder (window.stream, options)
    } catch (e) {
      console.error ('Exception while creating MediaRecorder:', e)
      dudMimeTypes.add (options.mimeType)
      return
    }
    console.logALine ('success', 'MediaRecorder', options)

    try {
      if (typeof mediaRecorder.requestData !== 'function') {
        console.error ('.requestData', 'not available in this browser')
        useRequestDataMethod = false
      }
    } catch (exception) {
      console.error ('.requestData', exception.toString ())
      useRequestDataMethod = false
    }

    recordButton.textContent = 'Stop Recording'
    playButton.disabled = true
    downloadButton.disabled = true
    mediaRecorder.onstop = (event) => {
      console.log ('Recorder stopped: ', event)
    }
    mediaRecorder.ondataavailable = handleDataAvailable
    mediaRecorder.previousTime = null
    mediaRecorder.startTime = Date.now ()
    const interval = dataAvailableInterval || 10
    mediaRecorder.intervalTime = interval
    mediaRecorder.dataAvailableCount = 0
    if (useRequestDataMethod) mediaRecorder.start()
    else mediaRecorder.start (interval)

    mediaRecorder.doRequestData = function (interval) {
      if (typeof mediaRecorder.requestData === 'function') {
        if (mediaRecorder.requestDataTimeout) window.clearTimeout (mediaRecorder.requestDataTimeout)
        mediaRecorder.requestDataTimeout = window.setTimeout (function () {
          if (mediaRecorder.state === 'recording' ) {
            mediaRecorder.requestData ()
            mediaRecorder.requestDataTimeout = null
            mediaRecorder.doRequestData (interval)
          }
        }, interval)
      }
    }
    if (useRequestDataMethod) mediaRecorder.doRequestData (interval)
    console.log ('MediaRecorder interval', interval)
  }

  function stopRecording () {
    mediaRecorder.stop ()
    console.log (recordedBlobs.length, 'blobs recorded')
  }

  function handleSuccess (stream) {
    recordButton.disabled = false
    window.stream = stream

    const gumVideo = document.querySelector ('video#gum')
    gumVideo.srcObject = stream
  }

  async function init (constraints) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia (constraints)
      logALine ('success', 'getUserMedia')
      handleSuccess (stream)
    } catch (e) {
      console.error ('getUserMedia', constraints, e)
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
      video: true,
    }
    if (wantsAudio) constraints.audio = {
      echoCancellation: {exact: hasEchoCancellation},
    }

    console.log ('Media constraints:', constraints)
    await init (constraints)
  })

})

