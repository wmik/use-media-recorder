# use-media-recorder

> React based hooks to utilize the [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/MediaRecorder) for audio, video and screen recording.

## Features
- 👀 Familiar API - Extends the MediaRecorder/MediaStream API with minimal abstraction making it easy to use.
- 🔴 Media recording - Supports audio 🎤, video 🎥 & screen 🖥️ recording.
- 🎛️ Configurable - Adjust settings to match your recording requirements.
- 💅 Headless - Build your own custom user interface to fit your style.

## Installation
> `npm install @wmik/use-media-recorder`

## Example
```jsx
import React from 'react';
import useMediaRecorder from '@wmik/use-media-recorder';

function Player({ srcBlob, audio }) {
  if (!srcBlob) {
    return null;
  }

  if (audio) {
    return <audio src={URL.createObjectURL(srcBlob)} controls />;
  }

  return (
    <video
      src={URL.createObjectURL(srcBlob)}
      width={520}
      height={480}
      controls
    />
  );
}

function ScreenRecorderApp() {
  let {
    error,
    status,
    mediaBlob,
    stopRecording,
    getMediaStream,
    startRecording
  } = useMediaRecorder({
    recordScreen: true,
    blobOptions: { type: 'video/webm' },
    mediaStreamConstraints: { audio: true, video: true }
  });

  return (
    <article>
      <h1>Screen recorder</h1>
      {error ? `${status} ${error.message}` : status}
      <section>
        <button
          type="button"
          onClick={getMediaStream}
          disabled={status === 'ready'}
        >
          Share screen
        </button>
        <button
          type="button"
          onClick={startRecording}
          disabled={status === 'recording'}
        >
          Start recording
        </button>
        <button
          type="button"
          onClick={stopRecording}
          disabled={status !== 'recording'}
        >
          Stop recording
        </button>
      </section>
      <Player srcBlob={mediaBlob} />
    </article>
  );
}
```

## Demo
[Live demo example](https://codesandbox.io/s/screen-recorder-nmmrf?file=/src/App.js)

## API

### _`useMediaRecorder` (Default export)_
Creates a custom media recorder object using the [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/MediaRecorder).

#### `Parameters` (MediaRecorderProps)
|Property|Type|Description
|-|-|-|
|blobOptions|`BlobPropertyBag`|Options used for creating a [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob/Blob) object.
|recordScreen|`boolean`|Enable/disable screen capture.
|onStart|`function`|Callback to run when recording starts.
|onStop|`function`|Callback to run when recording stops. Accepts a [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob/Blob) object as a parameter.
|onError|`function`|Callback to run when an error occurs while recording. Accepts an error object as a parameter.
|onDataAvailable|`function`|Callback to run when recording data exists.
|mediaRecorderOptions|`object`|Options used for creating [`MediaRecorder`](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/MediaRecorder) object.
|mediaStreamConstraints<b>*</b>|[`MediaStreamConstraints`](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamConstraints)|Options used for creating a MediaStream object from [`getDisplayMedia`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia) and [`getUserMedia`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

> _**NOTE**: **\*** means it is required_

#### `Returns` (MediaRecorderHookOptions)
|Property|Type|Description
|-|-|-|
|error|`Error`|Information about an operation failure. [Possible exceptions](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
|status|`string`|Current state of recorder. One of `idle`, `acquiring_media`, `ready`, `recording`, `stopping`, `stopped`, `failed`.
|mediaBlob|`Blob`|Raw media data.
|isAudioMuted|`boolean`|Indicates whether audio is active/inactive.
|stopRecording|`function`|End a recording.
|getMediaStream|`function`|Request for a media source. Camera, mic and/or screen access.
|clearMediaStream|`function`|Resets the media stream object to `null`.
|startRecording|`function(timeSlice?)`|Begin a recording. Optional argument `timeSlice` controls [chunk size](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/start#parameters).
|pauseRecording|`function`|Stop without ending a recording allowing the recording to continue later.
|resumeRecording|`function`|Continue a recording from a previous pause.
|muteAudio|`function`|Disable audio.
|unMuteAudio|`function`|Enable audio.
|liveStream|`MediaStream`|Real-time **MUTED** stream of current recording. Muted to prevent audio feedback.

### More examples

```jsx
function LiveStreamPreview({ stream }) {
  let videoPreviewRef = React.useRef();

  React.useEffect(() => {
    if (videoPreviewRef.current && stream) {
      videoPreviewRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) {
    return null;
  }

  return <video ref={videoPreviewRef} width={520} height={480} autoPlay />;
}

<LiveStreamPreview stream={liveStream} />
```

## Related
- [`react-media-recorder`](https://github.com/0x006F/react-media-recorder)

## License
MIT &copy;2020
