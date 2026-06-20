import { useFluidStore, type Tool } from '@/store/useFluidStore';
import { Activity, Gauge, Grid3X3, Wrench } from 'lucide-react';

const toolLabels: Record<Tool, string> = {
  select: '查看模式',
  circle: '圆形障碍物',
  rect: '矩形障碍物',
  source: '流体源',
  clear: '清除仿真',
};

export default function StatusBar() {
  const fps = useFluidStore(s => s.fps);
  const tool = useFluidStore(s => s.tool);
  const paused = useFluidStore(s => s.paused);
  const viscosity = useFluidStore(s => s.viscosity);
  const forceScale = useFluidStore(s => s.forceScale);

  const fpsColor =
    fps >= 45 ? 'text-emerald-400' : fps >= 25 ? 'text-amber-400' : 'text-rose-400';
  const fpsBg =
    fps >= 45
      ? 'bg-emerald-500/10 border-emerald-500/30'
      : fps >= 25
      ? 'bg-amber-500/10 border-amber-500/30'
      : 'bg-rose-500/10 border-rose-500/30';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
      <div
        className="flex items-center gap-6 px-6 py-3 rounded-2xl
                    backdrop-blur-xl bg-slate-900/80
                    border border-cyan-500/20
                    shadow-[0_0_40px_rgba(0,240,255,0.15),inset_0_1px_0_rgba(255,255,255,0.05)]"
      >
        <div className="flex items-center gap-2.5">
          <Activity className={`w-4 h-4 ${fpsColor}`} />
          <span className="text-slate-400 text-xs font-mono uppercase tracking-wider">FPS</span>
          <span
            className={`font-mono text-sm font-bold px-2 py-0.5 rounded-lg border ${fpsColor} ${fpsBg}`}
          >
            {fps.toString().padStart(2, '0')}
          </span>
        </div>

        <div className="w-px h-5 bg-slate-700/60" />

        <div className="flex items-center gap-2.5">
          <Grid3X3 className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-400 text-xs font-mono uppercase tracking-wider">GRID</span>
          <span className="font-mono text-sm text-cyan-300 font-bold">128 × 128</span>
        </div>

        <div className="w-px h-5 bg-slate-700/60" />

        <div className="flex items-center gap-2.5">
          <Wrench className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-400 text-xs font-mono uppercase tracking-wider">MODE</span>
          <span
            className={`text-sm font-medium px-2.5 py-0.5 rounded-lg
                       ${paused
                         ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                         : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                       }`}
          >
            {paused ? '⏸  已暂停' : '▶  '}{toolLabels[tool]}
          </span>
        </div>

        <div className="w-px h-5 bg-slate-700/60" />

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <Gauge className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 text-[10px] font-mono uppercase">粘度</span>
            <span className="text-slate-300 text-xs font-mono">{viscosity.toFixed(4)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[10px] font-mono uppercase">力场</span>
            <span className="text-slate-300 text-xs font-mono">{forceScale.toFixed(1)}x</span>
          </div>
        </div>
      </div>
    </div>
  );
}
