const React = require('react');

/**
 * Checks whether the argument is a valid object i.e (key-value pair).
 * @param {any} o
 */
function isObject(o) {
  return o && !Array.isArray(o) && Object(o) === o;
}

/**
 * Checks whether media type(audio/video) constraints are valid.
 * @param {MediaStreamConstraints} mediaType
 */
function validateMediaTrackConstraints(mediaType) {
  let supportedMediaConstraints = null;

  if (navigator.mediaDevices) {
    supportedMediaConstraints =
      navigator.mediaDevices.getSupportedConstraints();
  }

  if (supportedMediaConstraints === null) {
    return;
  }

  let unSupportedMediaConstraints = Object.keys(mediaType).filter(
    constraint => !supportedMediaConstraints[constraint]
  );

  if (unSupportedMediaConstraints.length !== 0) {
    let toText = unSupportedMediaConstraints.join(',');
    console.error(
      `The following constraints ${toText} are not supported on this browser.`
    );
  }
}

const noop = () => {};

/**
 * @callback Callback
 * @param {Blob} blob
 *
 * @callback ErrorCallback
 * @param {Error} error
 *
 * @typedef MediaRecorderProps
 * @type {Object}
 * @property {BlobPropertyBag} [blobOptions]
 * @property {Boolean} [recordScreen]
 * @property {MediaStream} customMediaStream
 * @property {Function} [onStart]
 * @property {Callback} [onStop]
 * @property {Callback} [onDataAvailable]
 * @property {ErrorCallback} [onError]
 * @property {Object} [mediaRecorderOptions]
 * @property {MediaStreamConstraints} mediaStreamConstraints
 *
 * @typedef MediaRecorderHookOptions
 * @type {Object}
 * @property {?Error} error
 * @property {('idle'|'acquiring_media'|'ready'|'recording'|'paused'|'stopping'|'stopped'|'failed')} status
 * @property {?Blob} mediaBlob
 * @property {Boolean} isAudioMuted
 * @property {Function} stopRecording,
 * @property {Function} getMediaStream,
 * @property {Function} clearMediaStream,
 * @property {Function} clearMediaBlob,
 * @property {Function} startRecording,
 * @property {Function} pauseRecording,
 * @property {Function} resumeRecording,
 * @property {Function} muteAudio
 * @property {Function} unMuteAudio
 * @property {?MediaStream} liveStream
 *
 * Creates a custom media recorder object using the MediaRecorder API.
 * @param {MediaRecorderProps}
 * @returns {MediaRecorderHookOptions}
 */
function useMediaRecorder({
  blobOptions,
  recordScreen,
  customMediaStream,
  onStop = noop,
  onStart = noop,
  onError = noop,
  mediaRecorderOptions,
  onDataAvailable = noop,
  mediaStreamConstraints = {}
}) {
  let mediaChunks = React.useRef([]);
  let mediaStream = React.useRef(null);
  let mediaRecorder = React.useRef(null);
  let [status, setStatus] = React.useState('idle');
  let [errorCache, cacheError] = React.useState(null);
  let [mediaBlobCache, cacheMediaBlob] = React.useState(null);
  let [isAudioMutedCache, cacheIsAudioMuted] = React.useState(false);

  async function getMediaStream() {
    if (errorCache) {
      cacheError(null);
    }

    setStatus('acquiring_media');
    if(customMediaStream) {
      mediaStream.current = customMediaStream;
      return
    }
    try {
      let stream;

      if (recordScreen) {
        stream = await window.navigator.mediaDevices.getDisplayMedia(
          mediaStreamConstraints
        );
      } else {
        stream = await window.navigator.mediaDevices.getUserMedia(
          mediaStreamConstraints
        );
      }

      if (recordScreen && mediaStreamConstraints.audio) {
        let audioStream = await window.navigator.mediaDevices.getUserMedia({
          audio: mediaStreamConstraints.audio
        });

        audioStream
          .getAudioTracks()
          .forEach(audioTrack => stream.addTrack(audioTrack));
      }

      mediaStream.current = stream;
      setStatus('ready');
    } catch (err) {
      cacheError(err);
      setStatus('failed');
    }
  }

  function clearMediaStream() {
    if (mediaStream.current) {
      mediaStream.current.getTracks().forEach(track => track.stop());
      mediaStream.current = null;
    }
  }

  async function startRecording(timeSlice) {
    if (errorCache) {
      cacheError(null);
    }

    if (!mediaStream.current) {
      await getMediaStream();
    }

    mediaChunks.current = [];

    if (mediaStream.current) {
      mediaRecorder.current = new MediaRecorder(
        mediaStream.current,
        mediaRecorderOptions
      );
      mediaRecorder.current.addEventListener(
        'dataavailable',
        handleDataAvailable
      );
      mediaRecorder.current.addEventListener('stop', handleStop);
      mediaRecorder.current.addEventListener('error', handleError);
      mediaRecorder.current.start(timeSlice);
      setStatus('recording');
      onStart();
    }
  }

  function handleDataAvailable(e) {
    if (e.data.size) {
      mediaChunks.current.push(e.data);
    }
    onDataAvailable(e.data);
  }

  function handleStop() {
    let [sampleChunk] = mediaChunks.current;
    let blobPropertyBag = Object.assign(
      { type: sampleChunk.type },
      blobOptions
    );
    let blob = new Blob(mediaChunks.current, blobPropertyBag);

    cacheMediaBlob(blob);
    setStatus('stopped');
    onStop(blob);
  }

  function handleError(e) {
    cacheError(e.error);
    setStatus('idle');
    onError(e.error);
  }

  function muteAudio(mute) {
    cacheIsAudioMuted(mute);

    if (mediaStream.current) {
      mediaStream.current.getAudioTracks().forEach(audioTrack => {
        audioTrack.enabled = !mute;
      });
    }
  }

  function pauseRecording() {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.pause();
      setStatus('paused');
    }
  }

  function resumeRecording() {
    if (mediaRecorder.current && mediaRecorder.current.state === 'paused') {
      mediaRecorder.current.resume();
      setStatus('recording');
    }
  }

  function stopRecording() {
    if (mediaRecorder.current) {
      setStatus('stopping');
      mediaRecorder.current.stop();
      // not sure whether to place clean up in useEffect?
      // If placed in useEffect the handler functions become dependencies of useEffect
      mediaRecorder.current.removeEventListener(
        'dataavailable',
        handleDataAvailable
      );
      mediaRecorder.current.removeEventListener('stop', handleStop);
      mediaRecorder.current.removeEventListener('error', handleError);
      mediaRecorder.current = null;
      clearMediaStream();
    }
  }

  function clearMediaBlob() {
    cacheMediaBlob(null);
  }

  React.useEffect(() => {
    if (!window.MediaRecorder) {
      throw new ReferenceError(
        'MediaRecorder is not supported in this browser. Please ensure that you are running the latest version of chrome/firefox/edge.'
      );
    }

    if (recordScreen && !window.navigator.mediaDevices.getDisplayMedia) {
      throw new ReferenceError(
        'This browser does not support screen capturing.'
      );
    }

    if (isObject(mediaStreamConstraints.video)) {
      validateMediaTrackConstraints(mediaStreamConstraints.video);
    }

    if (isObject(mediaStreamConstraints.audio)) {
      validateMediaTrackConstraints(mediaStreamConstraints.audio);
    }

    if (mediaRecorderOptions && mediaRecorderOptions.mimeType) {
      if (!MediaRecorder.isTypeSupported(mediaRecorderOptions.mimeType)) {
        console.error(
          `The specified MIME type supplied to MediaRecorder is not supported by this browser.`
        );
      }
    }
  }, [mediaStreamConstraints, mediaRecorderOptions, recordScreen]);

  return {
    error: errorCache,
    status,
    mediaBlob: mediaBlobCache,
    isAudioMuted: isAudioMutedCache,
    stopRecording,
    getMediaStream,
    startRecording,
    pauseRecording,
    resumeRecording,
    clearMediaStream,
    clearMediaBlob,
    muteAudio: () => muteAudio(true),
    unMuteAudio: () => muteAudio(false),
    liveStream: mediaStream.current,
  };
}

module.exports = useMediaRecorder;
