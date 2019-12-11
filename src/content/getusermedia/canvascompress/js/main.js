/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict'

// Put variables in global scope to make them available to the browser console.
const video = document.querySelector ('video')
const canvas = window.canvas = document.querySelector ('canvas.video_canvas')
canvas.width = 480
canvas.height = 360

const button = document.querySelector ('button')
button.onclick = function () {
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  let canURL
  try {
    const start = Date.now()
    canvas.getContext ('2d').drawImage (video, 0, 0, canvas.width, canvas.height)
    const elapsed = Date.now() - start
    console.log ('draw from video to canvas', elapsed, 'ms')
  } catch (err) {
    console.error ('draw from video to canvas error', err)
  }
  try {
    canURL = canvas.toDataURL ('image/jpeg', 0.5)
    console.log ('dataURL created', canURL.length)
  } catch (err) {
    console.error ('blob creation error', err)
  }
  try {
    const start = Date.now()
    canvas.toBlob (blob => {
      const elapsed = Date.now() - start
      console.log ('blob created: ', blob.type, blob.size, canvas.width, canvas.height, 'in', elapsed)
    }, 'image/jpeg', 0.7)
  } catch (err) {
    console.error ('blob creation error', err)
  }
}

const constraints = {
  audio: false,
  video: true,
}

function handleSuccess (stream) {
  window.stream = stream // make stream available to browser console
  video.srcObject = stream
}

function handleError (error) {
  console.log ('navigator.MediaDevices.getUserMedia error: ', error.message, error.name)
}

navigator.mediaDevices.getUserMedia (constraints).then (handleSuccess).catch (handleError)
