import FluidCanvas from '@/components/FluidCanvas';
import Toolbar from '@/components/Toolbar';
import ControlPanel from '@/components/ControlPanel';
import StatusBar from '@/components/StatusBar';
import { Info, Github } from 'lucide-react';

export default function Home() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col">
      <header className="relative z-30 pt-6 pb-2 px-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center
                          bg-gradient-to-br from-cyan-400/30 to-fuchsia-500/30
                          border border-cyan-400/50
                          shadow-[0_0_20px_rgba(0,240,255,0.35),inset_0_0_15px_rgba(0,240,255,0.1)]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-6 h-6 text-cyan-300"
                style={{ filter: 'drop-shadow(0 0 8px rgba(0,240,255,0.8))' }}
              >
                <defs>
                  <linearGradient id="wg" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#00f0ff" />
                    <stop offset="100%" stopColor="#ff00aa" />
                  </linearGradient>
                </defs>
                <path
                  stroke="url(#wg)"
                  d="M4 20c0-4 2-6 4-8s4-4 4-8c0 4 2 6 4 8s4 4 4 8"
                  strokeLinecap="round"
                />
                <path
                  stroke="url(#wg)"
                  d="M3 17h18M4 14c2 0 3 1 4 1s3-1 5-1 3 1 4 1 2-1 4-1"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <h1
                className="font-display text-2xl font-black tracking-[0.15em] neon-text"
                style={{ color: '#00f0ff' }}
              >
                FLUID · LAB
              </h1>
              <p className="text-xs text-slate-500 font-mono tracking-widest mt-0.5">
                NAVIER-STOKES 2D SIMULATOR · GPU ACCELERATED
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm
                         backdrop-blur-xl bg-slate-900/60 border border-slate-700/60
                         text-slate-400 hover:text-cyan-300 hover:border-cyan-500/50
                         hover:shadow-[0_0_15px_rgba(0,240,255,0.2)]
                         transition-all duration-300"
              title="关于"
            >
              <Info className="w-4 h-4" />
              <span className="font-mono">INFO</span>
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm
                         backdrop-blur-xl bg-slate-900/60 border border-slate-700/60
                         text-slate-400 hover:text-fuchsia-300 hover:border-fuchsia-500/50
                         hover:shadow-[0_0_15px_rgba(255,0,170,0.2)]
                         transition-all duration-300"
              title="源码"
            >
              <Github className="w-4 h-4" />
              <span className="font-mono">CODE</span>
            </button>
          </div>
        </div>

        <div
          className="mt-5 rounded-2xl px-5 py-3
                      border border-cyan-500/15
                      bg-gradient-to-r from-cyan-500/5 via-transparent to-fuchsia-500/5"
        >
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0"
              style={{ boxShadow: '0 0 10px rgba(0,240,255,0.8)' }}
            />
            <p className="text-slate-400 text-sm leading-relaxed">
              <span className="text-cyan-300 font-semibold">交互提示：</span>
              选择左侧工具栏中的工具后，在中央画布上
              <span className="text-white font-medium">按住鼠标并拖拽</span>
              。
              <span className="text-cyan-300"> 圆形 / 矩形</span>
              工具用于创建障碍物（拖拽定义尺寸），
              <span className="text-fuchsia-300"> 流体源</span>
              工具用于喷射带颜色的流体粒子，拖拽方向决定流体流动方向。
              可通过右侧滑块调整<span className="text-cyan-300">粘度</span>、
              <span className="text-cyan-300">力场强度</span>等物理参数。
            </p>
          </div>
        </div>
      </header>

      <main className="relative flex-1 flex items-center justify-center py-8 px-4">
        <Toolbar />
        <FluidCanvas size={720} />
        <ControlPanel />
      </main>

      <StatusBar />

      <div className="pointer-events-none absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-cyan-500/5 blur-3xl" />
      <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-fuchsia-500/5 blur-3xl" />
    </div>
  );
}
