const test = require('ava');
const { renderHook } = require('@testing-library/react-hooks');
const useMediaRecorder = require('.');

test('hook options', t => {
  let { result } = renderHook(() => useMediaRecorder({}));
  let {
    error,
    isAudioMuted,
    liveStream,
    mediaBlob,
    status,
    getMediaStream,
    clearMediaStream,
    clearMediaBlob,
    muteAudio,
    unMuteAudio,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording
  } = result.current;

  t.is(status, 'idle');
  t.is(error, null);
  t.is(liveStream, null);
  t.is(mediaBlob, null);
  t.false(isAudioMuted);
  t.true(typeof getMediaStream === 'function');
  t.true(typeof clearMediaStream === 'function');
  t.true(typeof clearMediaBlob === 'function');
  t.true(typeof muteAudio === 'function');
  t.true(typeof unMuteAudio === 'function');
  t.true(typeof startRecording === 'function');
  t.true(typeof stopRecording === 'function');
  t.true(typeof pauseRecording === 'function');
  t.true(typeof resumeRecording === 'function');
});
