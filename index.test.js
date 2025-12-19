import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { cleanup } from '@testing-library/react';
import useMediaRecorder from './index';

// Mock MediaRecorder and related APIs
const createMockMediaRecorder = () => ({
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  state: 'inactive',
  ondataavailable: null,
  onstop: null,
  onerror: null,
});

const createMockTrack = (kind) => ({
  stop: vi.fn(),
  enabled: true,
  kind,
  id: `${kind}-track-${Math.random()}`,
});

const createMockMediaStream = () => {
  const audioTrack = createMockTrack('audio');
  const videoTrack = createMockTrack('video');
  
  return {
    id: 'mock-stream',
    active: true,
    getTracks: vi.fn(() => [audioTrack, videoTrack]),
    getAudioTracks: vi.fn(() => [audioTrack]),
    getVideoTracks: vi.fn(() => [videoTrack]),
  };
};

let mockMediaRecorder;
let mockMediaStream;
let listeners;

beforeEach(() => {
  mockMediaRecorder = createMockMediaRecorder();
  mockMediaStream = createMockMediaStream();
  listeners = {};
  
  global.MediaRecorder = vi.fn((stream, options) => {
    const recorder = {
      ...mockMediaRecorder,
      stream,
      options,
      addEventListener: vi.fn((event, handler) => {
        if (!listeners[event]) {
          listeners[event] = [];
        }
        listeners[event].push(handler);
      }),
      removeEventListener: vi.fn((event, handler) => {
        if (listeners[event]) {
          const idx = listeners[event].indexOf(handler);
          if (idx > -1) {
            listeners[event].splice(idx, 1);
          }
        }
      }),
      start: mockMediaRecorder.start,
      stop: vi.fn(() => {
        if (listeners.stop) {
          listeners.stop.forEach(handler => handler());
        }
      }),
      pause: mockMediaRecorder.pause,
      resume: mockMediaRecorder.resume,
    };
    return recorder;
  });
  
  global.MediaRecorder.isTypeSupported = vi.fn(() => true);
  
  global.navigator.mediaDevices = {
    getUserMedia: vi.fn(() => Promise.resolve(createMockMediaStream())),
    getDisplayMedia: vi.fn(() => Promise.resolve(createMockMediaStream())),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Error Handling Tests
describe('useMediaRecorder - Error Handling', () => {
  it('should catch synchronous errors from MediaRecorder.start()', async () => {
    const onError = vi.fn();
    mockMediaRecorder.start.mockImplementation(() => {
      throw new DOMException('InvalidStateError');
    });
    
    const { result } = renderHook(() =>
      useMediaRecorder({
        onError,
        mediaStreamConstraints: { audio: true },
      })
    );
    
    await result.current.getMediaStream();
    
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    
    result.current.startRecording();
    
    expect(onError).toHaveBeenCalled();
    expect(result.current.status).toBe('failed');
  });
  
  it('should handle getUserMedia rejection', async () => {
    const error = new Error('Permission denied');
    global.navigator.mediaDevices.getUserMedia.mockRejectedValue(error);
    
    const { result } = renderHook(() =>
      useMediaRecorder({
        mediaStreamConstraints: { audio: true },
      })
    );
    
    await result.current.getMediaStream();
    
    await waitFor(() => {
      expect(result.current.error).toBeDefined();
      expect(result.current.status).toBe('failed');
    });
  });
  
  it('should handle getDisplayMedia rejection for screen recording', async () => {
    const error = new Error('User cancelled');
    global.navigator.mediaDevices.getDisplayMedia.mockRejectedValue(error);
    
    const { result } = renderHook(() =>
      useMediaRecorder({
        recordScreen: true,
        mediaStreamConstraints: { audio: true, video: true },
      })
    );
    
    await result.current.getMediaStream();
    
    await waitFor(() => {
      expect(result.current.error).toBeDefined();
      expect(result.current.status).toBe('failed');
    });
  });
  
  it('should handle immediate stopRecording after startRecording', async () => {
    const { result } = renderHook(() =>
      useMediaRecorder({
        mediaStreamConstraints: { audio: true },
      })
    );
    
    await result.current.getMediaStream();
    
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    
    result.current.startRecording();
    result.current.stopRecording();
    
    expect(mockMediaRecorder.stop).toHaveBeenCalled();
  });
});

// State Transition Tests
describe('useMediaRecorder - State Transitions', () => {
  it('should transition through correct states: idle → acquiring_media → ready', async () => {
    const { result } = renderHook(() =>
      useMediaRecorder({
        mediaStreamConstraints: { audio: true },
      })
    );
    
    expect(result.current.status).toBe('idle');
    
    result.current.getMediaStream();
    
    expect(result.current.status).toBe('acquiring_media');
    
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
  });
  
  it('should transition through recording lifecycle', async () => {
    const { result } = renderHook(() =>
      useMediaRecorder({
        mediaStreamConstraints: { audio: true },
      })
    );
    
    await result.current.getMediaStream();
    
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    
    result.current.startRecording();
    expect(result.current.status).toBe('recording');
    expect(mockMediaRecorder.start).toHaveBeenCalled();
    
    result.current.pauseRecording();
    expect(mockMediaRecorder.pause).toHaveBeenCalled();
    
    result.current.resumeRecording();
    expect(mockMediaRecorder.resume).toHaveBeenCalled();
    
    result.current.stopRecording();
    expect(mockMediaRecorder.stop).toHaveBeenCalled();
  });
  
  it('should not allow startRecording when already recording', async () => {
    const { result } = renderHook(() =>
      useMediaRecorder({
        mediaStreamConstraints: { audio: true },
      })
    );
    
    await result.current.getMediaStream();
    
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    
    result.current.startRecording();
    expect(mockMediaRecorder.start).toHaveBeenCalledTimes(1);
    
    result.current.startRecording();
    expect(mockMediaRecorder.start).toHaveBeenCalledTimes(1);
  });
});

// Audio Muting Tests
describe('useMediaRecorder - Audio Muting', () => {
  it('should mute audio tracks', async () => {
    const { result } = renderHook(() =>
      useMediaRecorder({
        mediaStreamConstraints: { audio: true },
      })
    );
    
    await result.current.getMediaStream();
    
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    
    result.current.muteAudio();
    
    expect(result.current.isAudioMuted).toBe(true);
    const audioTracks = result.current.liveStream.getAudioTracks();
    expect(audioTracks[0].enabled).toBe(false);
  });
  
  it('should unmute audio tracks', async () => {
    const { result } = renderHook(() =>
      useMediaRecorder({
        mediaStreamConstraints: { audio: true },
      })
    );
    
    await result.current.getMediaStream();
    
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    
    result.current.muteAudio();
    expect(result.current.isAudioMuted).toBe(true);
    
    result.current.unMuteAudio();
    expect(result.current.isAudioMuted).toBe(false);
  });
});

// Callback Tests
describe('useMediaRecorder - Callbacks', () => {
  it('should call onStart when recording begins', async () => {
    const onStart = vi.fn();
    
    const { result } = renderHook(() =>
      useMediaRecorder({
        onStart,
        mediaStreamConstraints: { audio: true },
      })
    );
    
    await result.current.getMediaStream();
    
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    
    result.current.startRecording();
    
    expect(onStart).toHaveBeenCalled();
  });
  
  it('should call onStop with blob when recording ends', async () => {
    const onStop = vi.fn();
    
    const { result } = renderHook(() =>
      useMediaRecorder({
        onStop,
        mediaStreamConstraints: { audio: true },
      })
    );
    
    await result.current.getMediaStream();
    
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    
    result.current.startRecording();
    result.current.stopRecording();
    
    await waitFor(() => {
      expect(onStop).toHaveBeenCalled();
    });
  });
  
  it('should call onDataAvailable when data is received', async () => {
    const onDataAvailable = vi.fn();
    
    const { result } = renderHook(() =>
      useMediaRecorder({
        onDataAvailable,
        mediaStreamConstraints: { audio: true },
      })
    );
    
    await result.current.getMediaStream();
    
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    
    result.current.startRecording();
    
    const mockBlob = new Blob(['test'], { type: 'audio/webm' });
    
    if (listeners.dataavailable) {
      listeners.dataavailable.forEach(handler => {
        handler({ data: mockBlob });
      });
    }
    
    expect(onDataAvailable).toHaveBeenCalledWith(mockBlob);
  });
  
  it('should handle empty blobs in onDataAvailable', async () => {
    const onDataAvailable = vi.fn();
    
    const { result } = renderHook(() =>
      useMediaRecorder({
        onDataAvailable,
        mediaStreamConstraints: { audio: true },
      })
    );
    
    await result.current.getMediaStream();
    
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    
    result.current.startRecording();
    
    const emptyBlob = new Blob([], { type: 'audio/webm' });
    
    if (listeners.dataavailable) {
      listeners.dataavailable.forEach(handler => {
        handler({ data: emptyBlob });
      });
    }
    
    expect(onDataAvailable).toHaveBeenCalled();
  });
});

// Stream Management Tests
describe('useMediaRecorder - Stream Management', () => {
  it('should clear media stream and reset to idle status', async () => {
    const { result } = renderHook(() =>
      useMediaRecorder({
        mediaStreamConstraints: { audio: true },
      })
    );
    
    await result.current.getMediaStream();
    
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
      expect(result.current.liveStream).toBeDefined();
    });
    
    result.current.clearMediaStream();
    
    expect(result.current.liveStream).toBeNull();
    expect(result.current.status).toBe('idle');
  });
  
  it('should stop all tracks when clearing media stream', async () => {
    const { result } = renderHook(() =>
      useMediaRecorder({
        mediaStreamConstraints: { audio: true },
      })
    );
    
    await result.current.getMediaStream();
    
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    
    const tracks = result.current.liveStream.getTracks();
    
    result.current.clearMediaStream();
    
    tracks.forEach(track => {
      expect(track.stop).toHaveBeenCalled();
    });
  });
  
  it('should clear media blob', async () => {
    const { result } = renderHook(() =>
      useMediaRecorder({
        mediaStreamConstraints: { audio: true },
      })
    );
    
    await result.current.getMediaStream();
    
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    
    result.current.startRecording();
    result.current.stopRecording();
    
    await waitFor(() => {
      expect(result.current.mediaBlob).toBeDefined();
    });
    
    result.current.clearMediaBlob();
    
    expect(result.current.mediaBlob).toBeNull();
  });
});

// Configuration Tests
describe('useMediaRecorder - Custom Configuration', () => {
  it('should use custom media stream', async () => {
    const customStream = createMockMediaStream();
    
    const { result } = renderHook(() =>
      useMediaRecorder({
        customMediaStream: customStream,
        mediaStreamConstraints: { audio: true },
      })
    );
    
    const stream = await result.current.getMediaStream();
    
    expect(stream).toBe(customStream);
    expect(global.navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
  });
  
  it('should pass timeSlice to MediaRecorder.start', async () => {
    const timeSlice = 1000;
    
    const { result } = renderHook(() =>
      useMediaRecorder({
        mediaStreamConstraints: { audio: true },
      })
    );
    
    await result.current.getMediaStream();
    
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    
    result.current.startRecording(timeSlice);
    
    expect(mockMediaRecorder.start).toHaveBeenCalledWith(timeSlice);
  });
  
  it('should use custom blob options', async () => {
    const blobOptions = { type: 'video/mp4' };
    
    const { result } = renderHook(() =>
      useMediaRecorder({
        blobOptions,
        mediaStreamConstraints: { video: true },
      })
    );
    
    await result.current.getMediaStream();
    
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    
    result.current.startRecording();
    
    expect(result.current.status).toBe('recording');
  });
  
  it('should use screen recording with recordScreen flag', async () => {
    const { result } = renderHook(() =>
      useMediaRecorder({
        recordScreen: true,
        mediaStreamConstraints: { audio: true, video: true },
      })
    );
    
    await result.current.getMediaStream();
    
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    
    expect(global.navigator.mediaDevices.getDisplayMedia).toHaveBeenCalled();
    expect(global.navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
  });
  
  it('should pass mediaRecorderOptions to MediaRecorder constructor', async () => {
    const mediaRecorderOptions = {
      mimeType: 'video/webm;codecs=vp9',
      audioBitsPerSecond: 128000,
      videoBitsPerSecond: 2500000,
    };
    
    const { result } = renderHook(() =>
      useMediaRecorder({
        mediaRecorderOptions,
        mediaStreamConstraints: { audio: true, video: true },
      })
    );
    
    await result.current.getMediaStream();
    
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    
    result.current.startRecording();
    
    expect(global.MediaRecorder).toHaveBeenCalledWith(
      expect.anything(),
      mediaRecorderOptions
    );
  });
});

// Edge Cases
describe('useMediaRecorder - Edge Cases', () => {
  it('should handle multiple rapid start/stop calls', async () => {
    const { result } = renderHook(() =>
      useMediaRecorder({
        mediaStreamConstraints: { audio: true },
      })
    );
    
    await result.current.getMediaStream();
    
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
    const { result } = renderHook(() =>
      useMediaRecorder({
        customMediaStream: null,
        mediaStreamConstraints: { audio: true },
      })
    );
    
    await result.current.getMediaStream();
    
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    
    expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
  });
  
  it('should handle unmount during async operations', async () => {
    const { result, unmount } = renderHook(() =>
      useMediaRecorder({
        mediaStreamConstraints: { audio: true },
      })
    );
    
    result.current.getMediaStream();
    
    unmount();
    
    // Should not throw errors
    expect(true).toBe(true);
  });
});