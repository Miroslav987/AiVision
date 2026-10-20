// src/store/videoStore.ts
import { create } from 'zustand';
import { FrameSize } from '@/types/inference';

export type VideoSourceType = 'camera' | 'file' | 'url';
export type VideoStatus = 'idle' | 'requesting' | 'ready' | 'playing' | 'error';

interface VideoState {
  videoEl: HTMLVideoElement | null;
  sourceType: VideoSourceType;
  sourceUrl: string | null;
  deviceId: string | null;
  sourceVersion: number;
  status: VideoStatus;
  errorMsg: string | null;
  devices: MediaDeviceInfo[];
  isPlaying: boolean;
  resolution: FrameSize | null;
  
  setVideoEl: (el: HTMLVideoElement | null) => void;
  setSourceType: (type: VideoSourceType) => void;
  setSourceUrl: (url: string | null) => void;
  setDeviceId: (id: string | null) => void;
  setStatus: (status: VideoStatus, errorMsg?: string | null) => void;
  setDevices: (devices: MediaDeviceInfo[]) => void;
  setIsPlaying: (playing: boolean) => void;
  setResolution: (res: FrameSize | null) => void;
}

export const useVideoStore = create<VideoState>((set) => ({
  videoEl: null,
  sourceType: 'camera',
  sourceUrl: null,
  deviceId: null,
  sourceVersion: 0,
  status: 'idle',
  errorMsg: null,
  devices: [],
  isPlaying: false,
  resolution: null,
  
  setVideoEl: (el) => set({ videoEl: el }),
  
  setSourceType: (type) => set((state) => {
    if (state.sourceType === type) {
      return { sourceVersion: state.sourceVersion + 1 };
    }
    return { 
      sourceType: type, 
      sourceUrl: null, 
      isPlaying: false,
      sourceVersion: state.sourceVersion + 1,
      status: 'idle',
      errorMsg: null
    };
  }),

  setSourceUrl: (url) => set((state) => {
    const trimmed = url?.trim() || null;
    return { sourceUrl: trimmed, sourceVersion: state.sourceVersion + 1 };
  }),

  setDeviceId: (id) => set({ deviceId: id?.trim() || null }),
  setStatus: (status, errorMsg = null) => set({ status, errorMsg }),
  setDevices: (devices) => set({ devices }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setResolution: (resolution) => set({ resolution }),
}));