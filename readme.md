# use-media-recorder

> React based hooks to utilize the media recorder api for audio, video and screen recording.

## Features
- 🖥️ Screen recording
- 🎥 Video recording
- 🎤 Audio recording

## Installation
> `npm install @wmik/use-media-recorder`

## Example
```jsx
import React from 'react';
import useMediaRecorder from '@wmik/use-media-recorder';

function ScreenRecorderApp() {
  let {
    error,
    status,
    mediaBlobUrl,
    stopRecording,
    getMediaStream,
    startRecording
  } = useMediaRecorder({
    recordScreen: true,
    blobOptions: { type: 'video/mp4' },
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
      <video
        src={mediaBlobUrl}
        width={520}
        height={480}
        controls={status === 'stopped'}
      />
    </article>
  );
}
```

## API

### _`useMediaRecorder` (Default export)_
Creates a media recorder object.

### `Parameters` (MediaRecorderProps)
|Property|Type|Description
|-|-|-|
|blobOptions|`BlobPropertyBag`|Options used for creating a [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob/Blob) object.
|recordScreen|`boolean`|Enable/disable screen capture.
|onStart|`function`|Callback to run when recording starts.
|onStop|`function`|Callback to run when recording stops. Accepts an object parameter with properties `blob` and `url`.
|onError|`function`|Callback to run when an error occurs while recording. Accepts an error object as a parameter.
|mediaRecorderOptions|`object`|Options used for creating [`MediaRecorder`](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/MediaRecorder) object.
|mediaStreamConstraints|[`MediaStreamConstraints`](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamConstraints)|Options used for creating a MediaStream object from [`getDisplayMedia`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia) and [`getUserMedia`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

### `Returns` (MediaRecorderHookOptions)
|Property|Type|Description
|-|-|-|
|error|`Error`|Detailed error information about an operation failure.
|status|`string`|Current state of recorder.
|mediaBlob|`Blob`|Raw media data.
|mediaBlobUrl|`string`|URL representation of blob. Used as a media source in DOM elements e.g `video.src/audio.src`
|isAudioMuted|`boolean`|Indicated whether audio is active/inactive.
|stopRecording|`function`|End a recording.
|getMediaStream|`function`|Request for a media source. Camera or mic or screen access.
|startRecording|`function`|Begin a recording.
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

<LiveStream stream={liveStream} />
```

## License
MIT &copy;2020
