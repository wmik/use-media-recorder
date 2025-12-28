import { vi } from 'vitest';
import { renderHook, waitFor, act, cleanup } from '@testing-library/react';
import useMediaRecorder from './index';

// Mock MediaRecorder and related APIs
let createMockMediaRecorder = () => ({
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  state: 'inactive',
  ondataavailable: null,
  onstop: null,
  onerror: null
});

let createMockTrack = kind => ({
  stop: vi.fn(),
  enabled: true,
  kind,
  id: `${kind}-track-${Math.random()}`
});

let createMockMediaStream = () => {
  let audioTrack = createMockTrack('audio');
  let videoTrack = createMockTrack('video');

  return {
    id: 'mock-stream',
    active: true,
    getTracks: vi.fn(() => [audioTrack, videoTrack]),
    getAudioTracks: vi.fn(() => [audioTrack]),
    getVideoTracks: vi.fn(() => [videoTrack]),
    addTrack: vi.fn()
  };
};

let mockMediaRecorder;
let mockMediaStream;
let listeners;

beforeEach(() => {
  mockMediaRecorder = createMockMediaRecorder();
  mockMediaStream = createMockMediaStream();
  listeners = {};

  global.MediaStream = vi.fn().mockImplementation(function () {
    return mockMediaStream;
  });
  global.MediaRecorder = vi.fn().mockImplementation(function (stream, options) {
    let recordState = 'inactive';

    return {
      ...mockMediaRecorder,
      stream,
      options,
      get state() {
        return recordState;
      },
      pause: vi.fn(() => {
        mockMediaRecorder.pause();
        recordState = 'paused';
      }),
      resume: vi.fn(() => {
        mockMediaRecorder.resume();
        recordState = 'recording';
      }),
      start: vi.fn(timeSlice => {
        mockMediaRecorder.start(timeSlice);
        recordState = 'recording';
      }),
      stop: vi.fn(() => {
        mockMediaRecorder.stop();
        recordState = 'inactive';

        if (listeners.stop) {
          listeners.stop.forEach(handler => handler());
        }
      }),
      addEventListener: vi.fn((event, handler) => {
        if (!listeners[event]) {
          listeners[event] = [];
        }
        listeners[event].push(handler);
      }),
      removeEventListener: vi.fn((event, handler) => {
        if (listeners[event]) {
          let idx = listeners[event].indexOf(handler);

          if (idx > -1) {
            listeners[event].splice(idx, 1);
          }
        }
      })
    };
  });

  global.MediaRecorder.isTypeSupported = vi.fn(() => true);

  global.navigator.mediaDevices = {
    getUserMedia: vi.fn(() => Promise.resolve(mockMediaStream)),
    getDisplayMedia: vi.fn(() => Promise.resolve(mockMediaStream))
  };
});

function delay(callback) {
  setTimeout(() => {
    callback();
  }, 1000);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Error Handling Tests
describe('useMediaRecorder - Error Handling', () => {
  it('should catch synchronous errors from MediaRecorder.start()', async () => {
    let onError = vi.fn();

    mockMediaRecorder.start.mockImplementation(() => {
      throw new DOMException('InvalidStateError');
    });

    let { result } = renderHook(() =>
      useMediaRecorder({
        onError,
        mediaStreamConstraints: { audio: true }
      })
    );

    await act(async () => {
      await result.current.getMediaStream();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    await act(async () => {
      await result.current.startRecording();
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
      expect(result.current.status).toBe('failed');
    });
  });

  it('should handle getUserMedia rejection', async () => {
    let error = new Error('Permission denied');

    global.navigator.mediaDevices.getUserMedia.mockRejectedValue(error);

    let { result } = renderHook(() =>
      useMediaRecorder({
        mediaStreamConstraints: { audio: true }
      })
    );

    await act(async () => {
      await result.current.getMediaStream();
    });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
      expect(result.current.status).toBe('failed');
    });
  });

  it('should handle getDisplayMedia rejection for screen recording', async () => {
    let error = new Error('User cancelled');

    global.navigator.mediaDevices.getDisplayMedia.mockRejectedValue(error);

    let { result } = renderHook(() =>
      useMediaRecorder({
        recordScreen: true,
        mediaStreamConstraints: { audio: true, video: true }
      })
    );

    await act(async () => {
      await result.current.getMediaStream();
    });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
      expect(result.current.status).toBe('failed');
    });
  });

  it('should handle immediate stopRecording after startRecording', async () => {
    let { result } = renderHook(() =>
      useMediaRecorder({
        mediaStreamConstraints: { audio: true }
      })
    );

    await act(async () => {
      await result.current.getMediaStream();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    await act(async () => {
      await result.current.startRecording();
      result.current.stopRecording();
    });

    await waitFor(() => {
      expect(mockMediaRecorder.stop).toHaveBeenCalled();
    });
  });
});

// State Transition Tests
describe('useMediaRecorder - State Transitions', () => {
  it('should transition through correct states: idle → acquiring_media → ready', async () => {
    let { result } = renderHook(() =>
      useMediaRecorder({
        mediaStreamConstraints: { audio: true }
      })
    );

    expect(result.current.status).toBe('idle');

    await act(async () => await result.current.getMediaStream());

    // TODO: mock delay to simulate user selection in browser
    // expect(result.current.status).toBe('acquiring_media');

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
  });

  it('should transition through recording lifecycle', async () => {
    let { result } = renderHook(() =>
      useMediaRecorder({
        mediaStreamConstraints: { audio: true }
      })
    );

    await act(async () => {
      await result.current.getMediaStream();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    await act(async () => {
      await result.current.startRecording();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('recording');
    });

    await waitFor(() => {
      expect(mockMediaRecorder.start).toHaveBeenCalled();
    });

    await act(async () => {
      await result.current.pauseRecording();
    });

    await waitFor(() => {
      expect(mockMediaRecorder.pause).toHaveBeenCalled();
      expect(result.current.status).toBe('paused');
    });

    await act(async () => {
      await result.current.resumeRecording();
    });

    await waitFor(() => {
      expect(mockMediaRecorder.resume).toHaveBeenCalled();
      expect(result.current.status).toBe('recording');
    });

    await act(async () => {
      await result.current.stopRecording();
      // TODO: Test intermediate state
      //expect(result.current.status).toBe('stopping');
    });

    await waitFor(() => {
      expect(mockMediaRecorder.stop).toHaveBeenCalled();
      expect(result.current.status).toBe('idle');
    });
  });

  it('should not allow startRecording when already recording', async () => {
    let { result } = renderHook(() =>
      useMediaRecorder({
        mediaStreamConstraints: { audio: true }
      })
    );

    await act(async () => {
      await result.current.getMediaStream();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    await act(async () => {
      await result.current.startRecording();
    });

    await waitFor(() => {
      expect(mockMediaRecorder.start).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await result.current.startRecording();
    });

    await waitFor(() => {
      expect(mockMediaRecorder.start).toHaveBeenCalledTimes(1);
    });
  });
});

// Audio Muting Tests
describe('useMediaRecorder - Audio Muting', () => {
  it('should mute audio tracks', async () => {
    let { result } = renderHook(() =>
      useMediaRecorder({
        mediaStreamConstraints: { audio: true }
      })
    );

    await act(async () => {
      result.current.getMediaStream();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    await act(async () => {
      await result.current.muteAudio();
    });

    await waitFor(() => {
      expect(result.current.isAudioMuted).toBe(true);
    });

    let audioTracks = result.current.liveStream.getAudioTracks();

    expect(audioTracks[0].enabled).toBe(false);
  });

  it('should unmute audio tracks', async () => {
    let { result } = renderHook(() =>
      useMediaRecorder({
        mediaStreamConstraints: { audio: true }
      })
    );

    await act(async () => {
      await result.current.getMediaStream();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    await act(() => {
      result.current.muteAudio();
    });

    await waitFor(() => {
      expect(result.current.isAudioMuted).toBe(true);
    });

    await act(() => {
      result.current.unMuteAudio();
    });

    await waitFor(() => {
      expect(result.current.isAudioMuted).toBe(false);
    });
  });
});

// Callback Tests
describe('useMediaRecorder - Callbacks', () => {
  it('should call onStart when recording begins', async () => {
    let onStart = vi.fn();

    let { result } = renderHook(() =>
      useMediaRecorder({
        onStart,
        mediaStreamConstraints: { audio: true }
      })
    );

    await act(async () => {
      await result.current.getMediaStream();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    await act(async () => {
      await result.current.startRecording();
    });

    await waitFor(() => {
      expect(onStart).toHaveBeenCalled();
    });
  });

  it('should call onStop with blob when recording ends', async () => {
    let onStop = vi.fn();

    let { result } = renderHook(() =>
      useMediaRecorder({
        onStop,
        mediaStreamConstraints: { audio: true }
      })
    );

    await act(async () => {
      await result.current.getMediaStream();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    await act(async () => {
      await result.current.startRecording();
      result.current.stopRecording();
    });

    await waitFor(() => {
      expect(onStop).toHaveBeenCalled();
    });
  });

  it('should call onDataAvailable when data is received', async () => {
    let onDataAvailable = vi.fn();

    let { result } = renderHook(() =>
      useMediaRecorder({
        onDataAvailable,
        mediaStreamConstraints: { audio: true }
      })
    );

    await act(async () => {
      await result.current.getMediaStream();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    await act(async () => {
      result.current.startRecording();
    });

    let mockBlob = new Blob(['test'], { type: 'audio/webm' });

    if (listeners.dataavailable) {
      listeners.dataavailable.forEach(handler => {
        handler({ data: mockBlob });
      });
    }

    await waitFor(() => {
      expect(onDataAvailable).toHaveBeenCalledWith(mockBlob);
    });
  });

  it('should handle empty blobs in onDataAvailable', async () => {
    let onDataAvailable = vi.fn();

    let { result } = renderHook(() =>
      useMediaRecorder({
        onDataAvailable,
        mediaStreamConstraints: { audio: true }
      })
    );

    await act(async () => {
      await result.current.getMediaStream();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    await act(async () => {
      await result.current.startRecording();
    });

    let emptyBlob = new Blob([], { type: 'audio/webm' });

    if (listeners.dataavailable) {
      listeners.dataavailable.forEach(handler => {
        handler({ data: emptyBlob });
      });
    }

    await waitFor(() => {
      expect(onDataAvailable).toHaveBeenCalled();
    });
  });
});

// Stream Management Tests
describe('useMediaRecorder - Stream Management', () => {
  it('should clear media stream and reset to idle status', async () => {
    let { result } = renderHook(() =>
      useMediaRecorder({
        mediaStreamConstraints: { audio: true }
      })
    );

    await act(async () => {
      await result.current.getMediaStream();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
      expect(result.current.liveStream).toBeDefined();
    });

    await act(() => {
      result.current.clearMediaStream();
    });

    await waitFor(() => {
      expect(result.current.liveStream).toBeNull();
      expect(result.current.status).toBe('idle');
    });
  });

  it('should stop all tracks when clearing media stream', async () => {
    let { result } = renderHook(() =>
      useMediaRecorder({
        mediaStreamConstraints: { audio: true }
      })
    );

    await act(async () => {
      await result.current.getMediaStream();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    let tracks = result.current.liveStream.getTracks();

    await act(() => {
      result.current.clearMediaStream();
    });

    await waitFor(() => {
      tracks.forEach(track => {
        expect(track.stop).toHaveBeenCalled();
      });
    });
  });

  it('should clear media blob', async () => {
    let { result } = renderHook(() =>
      useMediaRecorder({
        mediaStreamConstraints: { audio: true }
      })
    );

    await act(async () => {
      await result.current.getMediaStream();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    await waitFor(() => {
      result.current.startRecording();
      result.current.stopRecording();
    });

    await waitFor(() => {
      expect(result.current.mediaBlob).toBeDefined();
    });

    await act(() => {
      result.current.clearMediaBlob();
    });

    await waitFor(() => {
      expect(result.current.mediaBlob).toBeNull();
    });
  });
});

// Configuration Tests
describe('useMediaRecorder - Custom Configuration', () => {
  it('should use custom media stream', async () => {
    let customStream = createMockMediaStream();

    let { result } = renderHook(() =>
      useMediaRecorder({
        customMediaStream: customStream,
        mediaStreamConstraints: { audio: true }
      })
    );

    let stream = await result.current.getMediaStream();

    expect(stream).toEqual(customStream);
    expect(global.navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
  });

  it('should pass timeSlice to MediaRecorder.start', async () => {
    let timeSlice = 1000;

    let { result } = renderHook(() =>
      useMediaRecorder({
        mediaStreamConstraints: { audio: true }
      })
    );

    await act(async () => {
      await result.current.getMediaStream();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    await act(async () => {
      await result.current.startRecording(timeSlice);
    });

    await waitFor(() => {
      expect(mockMediaRecorder.start).toHaveBeenCalledWith(timeSlice);
    });
  });

  it('should use custom blob options', async () => {
    let blobOptions = { type: 'video/mp4' };

    let { result } = renderHook(() =>
      useMediaRecorder({
        blobOptions,
        mediaStreamConstraints: { video: true }
      })
    );

    await act(async () => {
      await result.current.getMediaStream();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    await act(async () => {
      await result.current.startRecording();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('recording');
    });
  });

  it('should use screen recording with recordScreen flag', async () => {
    let { result } = renderHook(() =>
      useMediaRecorder({
        recordScreen: true,
        mediaStreamConstraints: { audio: true, video: true }
      })
    );

    await act(async () => {
      await result.current.getMediaStream();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    await waitFor(() => {
      expect(global.navigator.mediaDevices.getDisplayMedia).toHaveBeenCalled();
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    });
  });

  it('should pass mediaRecorderOptions to MediaRecorder constructor', async () => {
    let mediaRecorderOptions = {
      mimeType: 'video/webm;codecs=vp9',
      audioBitsPerSecond: 128000,
      videoBitsPerSecond: 2500000
    };

    let { result } = renderHook(() =>
      useMediaRecorder({
        mediaRecorderOptions,
        mediaStreamConstraints: { audio: true, video: true }
      })
    );

    await result.current.getMediaStream();

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    await act(async () => {
      await result.current.startRecording();
    });

    await waitFor(() => {
      expect(global.MediaRecorder).toHaveBeenCalledWith(
        expect.anything(),
        mediaRecorderOptions
      );
    });
  });
});

// Edge Cases
describe('useMediaRecorder - Edge Cases', () => {
  it('should handle multiple rapid start/stop calls', async () => {
    let { result } = renderHook(() =>
      useMediaRecorder({
        mediaStreamConstraints: { audio: true }
      })
    );

    await act(async () => {
      await result.current.getMediaStream();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    result.current.startRecording();
    result.current.stopRecording();
    result.current.startRecording();
    result.current.stopRecording();

    expect(result.current.status).toBeDefined();
  });

  it('should handle null custom media stream gracefully', async () => {
    let { result } = renderHook(() =>
      useMediaRecorder({
        customMediaStream: null,
        mediaStreamConstraints: { audio: true }
      })
    );

    await act(async () => {
      await result.current.getMediaStream();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    await waitFor(() => {
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    });
  });

  it('should handle unmount during async operations', async () => {
    let { result, unmount } = renderHook(() =>
      useMediaRecorder({
        mediaStreamConstraints: { audio: true }
      })
    );

    await act(async () => {
      await result.current.getMediaStream();
    });

    unmount();

    // Should not throw errors
    expect(true).toBe(true);
  });
});
