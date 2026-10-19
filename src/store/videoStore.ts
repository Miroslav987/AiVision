import { create } from 'zustand';

export type VideoSourceType = 'camera' | 'file' | 'url';

interface VideoState {
  sourceType: VideoSourceType;
  sourceUrl: string | null;
  deviceId: string | null;
  isPlaying: boolean;
  resolution: { width: number; height: number } | null;
  
  setSourceType: (type: VideoSourceType) => void;
  setSourceUrl: (url: string | null) => void;
  setDeviceId: (id: string | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setResolution: (res: { width: number; height: number } | null) => void;
}

export const useVideoStore = create<VideoState>((set) => ({
  sourceType: 'camera',
  sourceUrl: null,
  deviceId: null,
  isPlaying: false,
  resolution: null,
  
  setSourceType: (type) => set({ sourceType: type, sourceUrl: null, deviceId: null, isPlaying: false }),
  setSourceUrl: (url) => set({ sourceUrl: url }),
  setDeviceId: (id) => set({ deviceId: id }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setResolution: (res) => set({ resolution: res }),
}));