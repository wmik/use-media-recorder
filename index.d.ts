declare function useMediaRecorder<T>(options: {
  blobOptions?: BlobPropertyBag;
  recordScreen?: boolean;
  onStart?: () => void;
  onStop?: (params: { blob: Blob; url: string }) => void;
  onError?: () => void;
  mediaRecorderOptions?: object;
  mediaStreamConstraints: MediaStreamConstraints;
}): {
  error: Error;
  status: string;
  mediaBlob: Blob;
  mediaBlobUrl: string;
  isAudioMuted: boolean;
  stopRecording: () => void;
  getMediaStream: () => void;
  startRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  muteAudio: () => void;
  unMuteAudio: () => void;
  liveStream: MediaStream;
};

export default useMediaRecorder;
