const Window = require('window');

function MediaRecorder() {}

MediaRecorder.isTypeSupported = () => {};

MediaRecorder.prototype = {
  audioBitsPerSecond: '',
  mimeType: '',
  ondataavailable: '',
  onerror: '',
  onpause: '',
  onresume: '',
  onstart: '',
  onstop: '',
  pause() {},
  requestData() {},
  resume() {},
  start() {},
  state: '',
  stop() {},
  stream: '',
  videoBitsPerSecond: '',
  constructor: MediaRecorder
};

global.window = new Window();
global.window.MediaRecorder = MediaRecorder;
