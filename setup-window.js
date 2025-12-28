//import Window from 'window';

function MediaRecorder() {}

MediaRecorder.isTypeSupported = () => {};

MediaRecorder.prototype = {
  audioBitsPerSecond: '',
  mimeType: '',
  ondataavailable: null,
  onerror: null,
  onpause: null,
  onresume: null,
  onstart: null,
  onstop: null,
  requestData: () => {},
  pause() { this.state = 'paused'; },
  resume() { this.state = 'recording'; },
  start() { this.state = 'recording'; },
  stop() { this.state = 'inactive'; },
  state: 'inactive',
  stream: '',
  videoBitsPerSecond: '',
  constructor: MediaRecorder,
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {}
};

function MediaStream() {}

MediaStream.prototype = {
  id: '',
  active: true,
  getTracks: () => [new MediaStreamTrack()],
  getAudioTracks: () => [new MediaStreamTrack()],
  getVideoTracks: () => [new MediaStreamTrack()],
};

function MediaStreamTrack() {}

MediaStreamTrack.prototype = {
  contentHint: '',
  enabled: true,
  id: '',
  kind: '',
  label: '',
  muted: false,
  readyState: '',
  applyConstraints: () => {},
  clone: () => {},
  getCapabilities: () => {},
  getConstraints: () => {},
  getSettings: () => {},
  stop: () => {}
};

//global.window = new Window();
//global.window.MediaRecorder = MediaRecorder;
//global.window.MediaStream = MediaStream;
//global.window.MediaStreamTrack = MediaStreamTrack;
global.MediaRecorder = MediaRecorder;
global.MediaStream = MediaStream;
global.MediaStreamTrack = MediaStreamTrack;
global.navigator.mediaDevices = {
  getUserMedia: () => Promise.resolve(new MediaStream()),
  getDisplayMedia: () => Promise.resolve(new MediaStream()),
};
