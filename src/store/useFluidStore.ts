import { create } from 'zustand'

export type Tool = 'select' | 'circle' | 'rect' | 'source' | 'clear'

interface FluidState {
  tool: Tool
  viscosity: number
  forceScale: number
  paused: boolean
  fps: number
  sourceHue: number
  clearTrigger: number
  setTool: (tool: Tool) => void
  setViscosity: (viscosity: number) => void
  setForceScale: (forceScale: number) => void
  togglePaused: () => void
  setFps: (fps: number) => void
  setSourceHue: (hue: number) => void
  triggerClear: () => void
  resetSettings: () => void
}

export const useFluidStore = create<FluidState>((set) => ({
  tool: 'source',
  viscosity: 0.001,
  forceScale: 2.0,
  paused: false,
  fps: 60,
  sourceHue: 200,
  clearTrigger: 0,

  setTool: (tool) => set({ tool }),
  setViscosity: (viscosity) => set({ viscosity }),
  setForceScale: (forceScale) => set({ forceScale }),
  togglePaused: () => set((state) => ({ paused: !state.paused })),
  setFps: (fps) => set({ fps }),
  setSourceHue: (sourceHue) => set({ sourceHue }),
  triggerClear: () => set((state) => ({ clearTrigger: state.clearTrigger + 1 })),
  resetSettings: () =>
    set({
      tool: 'source',
      viscosity: 0.001,
      forceScale: 2.0,
      paused: false,
      sourceHue: 200,
    }),
}))
