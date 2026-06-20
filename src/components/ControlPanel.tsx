import { Pause, Play } from 'lucide-react'
import { useFluidStore } from '@/store/useFluidStore'
import { cn } from '@/lib/utils'

export default function ControlPanel() {
  const {
    viscosity,
    setViscosity,
    forceScale,
    setForceScale,
    paused,
    togglePaused,
    sourceHue,
    setSourceHue,
  } = useFluidStore()

  const logViscosityToLinear = (logVal: number) => Math.pow(10, logVal)
  const linearViscosityToLog = (linVal: number) => Math.log10(linVal)

  const viscosityLogMin = -4
  const viscosityLogMax = -2
  const viscosityLogVal = linearViscosityToLog(viscosity)
  const viscositySliderPercent =
    ((viscosityLogVal - viscosityLogMin) / (viscosityLogMax - viscosityLogMin)) * 100

  const forceSliderPercent = ((forceScale - 0.1) / (10 - 0.1)) * 100
  const hueSliderPercent = (sourceHue / 360) * 100

  const handleViscosityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = Number(e.target.value)
    const logVal =
      viscosityLogMin + (percent / 100) * (viscosityLogMax - viscosityLogMin)
    setViscosity(Number(logViscosityToLinear(logVal).toFixed(6)))
  }

  return (
    <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20 w-72">
      <div
        className={cn(
          'rounded-2xl backdrop-blur-xl bg-slate-900/70',
          'border border-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]',
          'p-6 space-y-6'
        )}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-cyan-300 tracking-wide">
            控制面板
          </h2>
          <button
            onClick={togglePaused}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300',
              'backdrop-blur-md bg-slate-800/60 border',
              paused
                ? 'border-emerald-400/70 text-emerald-300 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                : 'border-amber-400/70 text-amber-300 hover:bg-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.4)]'
            )}
            title={paused ? '继续' : '暂停'}
          >
            {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-slate-300">粘度</label>
            <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-800/80 text-cyan-300 border border-cyan-500/30">
              {viscosity.toFixed(4)}
            </span>
          </div>
          <div className="relative h-2 rounded-full bg-slate-800/80 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full"
              style={{ width: `${viscositySliderPercent}%` }}
            />
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={viscositySliderPercent}
              onChange={handleViscosityChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-[0_0_10px_rgba(34,211,238,0.8)] border-2 border-cyan-400 pointer-events-none transition-all"
              style={{ left: `calc(${viscositySliderPercent}% - 8px)` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0.0001</span>
            <span>0.001</span>
            <span>0.01</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-slate-300">力场强度</label>
            <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-800/80 text-cyan-300 border border-cyan-500/30">
              {forceScale.toFixed(1)}
            </span>
          </div>
          <div className="relative h-2 rounded-full bg-slate-800/80 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full"
              style={{ width: `${forceSliderPercent}%` }}
            />
            <input
              type="range"
              min={0.1}
              max={10}
              step={0.1}
              value={forceScale}
              onChange={(e) => setForceScale(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-[0_0_10px_rgba(34,211,238,0.8)] border-2 border-cyan-400 pointer-events-none transition-all"
              style={{ left: `calc(${forceSliderPercent}% - 8px)` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0.1</span>
            <span>5.0</span>
            <span>10.0</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-slate-300">流体源颜色</label>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border border-white/30 shadow-[0_0_8px_currentColor]"
                style={{
                  backgroundColor: `hsl(${sourceHue}, 100%, 60%)`,
                  color: `hsl(${sourceHue}, 100%, 60%)`,
                }}
              />
              <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-800/80 text-cyan-300 border border-cyan-500/30">
                {sourceHue}°
              </span>
            </div>
          </div>
          <div className="relative h-2 rounded-full overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to right, hsl(0,100%,60%), hsl(60,100%,60%), hsl(120,100%,60%), hsl(180,100%,60%), hsl(240,100%,60%), hsl(300,100%,60%), hsl(360,100%,60%))',
              }}
            />
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={sourceHue}
              onChange={(e) => setSourceHue(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 pointer-events-none transition-all shadow-lg"
              style={{
                left: `calc(${hueSliderPercent}% - 8px)`,
                borderColor: `hsl(${sourceHue}, 100%, 60%)`,
                boxShadow: `0 0 10px hsl(${sourceHue}, 100%, 60%)`,
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0°</span>
            <span>180°</span>
            <span>360°</span>
          </div>
        </div>
      </div>
    </div>
  )
}
