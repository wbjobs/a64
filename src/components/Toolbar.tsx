import { MousePointer2, Circle, Square, Droplets, Trash2 } from 'lucide-react'
import { useFluidStore, type Tool } from '@/store/useFluidStore'
import { cn } from '@/lib/utils'

const toolConfig: Record<Tool, { icon: typeof MousePointer2; label: string }> = {
  select: { icon: MousePointer2, label: '查看模式' },
  circle: { icon: Circle, label: '圆形障碍物' },
  rect: { icon: Square, label: '矩形障碍物' },
  source: { icon: Droplets, label: '流体源' },
  clear: { icon: Trash2, label: '清除' },
}

const toolKeys: Tool[] = ['select', 'circle', 'rect', 'source', 'clear']

export default function Toolbar() {
  const { tool, setTool, triggerClear } = useFluidStore()

  const handleClick = (t: Tool) => {
    if (t === 'clear') {
      triggerClear()
    } else {
      setTool(t)
    }
  }

  return (
    <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-4">
      {toolKeys.map((t) => {
        const { icon: Icon, label } = toolConfig[t]
        const isActive = tool === t

        return (
          <button
            key={t}
            onClick={() => handleClick(t)}
            title={label}
            className={cn(
              'group relative w-14 h-14 rounded-full flex items-center justify-center',
              'backdrop-blur-xl bg-slate-900/60 border',
              'transition-all duration-300 ease-out hover:scale-110',
              t === 'clear'
                ? 'hover:border-rose-400/70 hover:shadow-rose-500/30'
                : isActive
                ? 'border-cyan-400/80 shadow-[0_0_20px_rgba(34,211,238,0.6),0_0_40px_rgba(34,211,238,0.3),inset_0_0_15px_rgba(34,211,238,0.15)] animate-neon-pulse'
                : 'border-slate-700/60 hover:border-cyan-500/50 shadow-lg hover:shadow-cyan-500/20'
            )}
          >
            <Icon
              className={cn(
                'w-6 h-6 transition-colors duration-300',
                t === 'clear'
                  ? 'text-slate-400 group-hover:text-rose-300'
                  : isActive
                  ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.9)]'
                  : 'text-slate-400 group-hover:text-cyan-300'
              )}
            />
            <span
              className={cn(
                'absolute left-16 whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium',
                'bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 text-slate-200',
                'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0',
                'transition-all duration-200 pointer-events-none'
              )}
            >
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
