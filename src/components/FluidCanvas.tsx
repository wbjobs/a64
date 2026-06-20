import { useEffect, useRef, useState, useCallback } from 'react';
import { FluidSimulator, Obstacle } from '@/lib/FluidSimulator';
import { useFluidStore, Tool } from '@/store/useFluidStore';

interface Props {
  size?: number;
}

export default function FluidCanvas({ size = 768 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vecCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<FluidSimulator | null>(null);
  const rafRef = useRef<number>(0);
  const isDrawingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const prevPosRef = useRef<{ x: number; y: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [showVectors, setShowVectors] = useState(true);

  const showVectorsRef = useRef(showVectors);
  useEffect(() => { showVectorsRef.current = showVectors; }, [showVectors]);

  const tool = useFluidStore(s => s.tool);
  const viscosity = useFluidStore(s => s.viscosity);
  const forceScale = useFluidStore(s => s.forceScale);
  const paused = useFluidStore(s => s.paused);
  const sourceHue = useFluidStore(s => s.sourceHue);
  const setFps = useFluidStore(s => s.setFps);
  const clearTrigger = useFluidStore(s => s.clearTrigger);

  const pausedRef = useRef(paused);
  const sizeRef = useRef(size);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { sizeRef.current = size; }, [size]);

  const toolRef = useRef(tool);
  const sourceHueRef = useRef(sourceHue);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { sourceHueRef.current = sourceHue; }, [sourceHue]);

  const getCanvasPos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const renderFrame = async () => {
    const sim = simRef.current;
    if (!sim) return;

    if (!pausedRef.current) {
      await sim.step();
    }

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const GRID = sim.gridSize;
    const curSize = sizeRef.current;

    const [dens, vel, mask] = await Promise.all([
      sim.getDensityData(),
      sim.getVelocityData(),
      sim.getMaskData(),
    ]);

    const imgData = ctx.createImageData(GRID, GRID);
    const px = imgData.data;
    for (let j = 0; j < GRID; j++) {
      for (let i = 0; i < GRID; i++) {
        const idx = j * GRID + i;
        const pIdx = idx * 4;
        if (mask[idx]) {
          px[pIdx] = 80;
          px[pIdx + 1] = 90;
          px[pIdx + 2] = 120;
          px[pIdx + 3] = 255;
        } else {
          const r = Math.min(255, Math.floor(dens.r[idx] * 1500));
          const g = Math.min(255, Math.floor(dens.g[idx] * 1500));
          const b = Math.min(255, Math.floor(dens.b[idx] * 1500));
          const bgR = 10, bgG = 14, bgB = 26;
          const alpha = Math.min(1, (r + g + b) / 100);
          px[pIdx] = Math.floor(bgR * (1 - alpha) + r * alpha);
          px[pIdx + 1] = Math.floor(bgG * (1 - alpha) + g * alpha);
          px[pIdx + 2] = Math.floor(bgB * (1 - alpha) + b * alpha);
          px[pIdx + 3] = 255;
        }
      }
    }

    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = GRID;
    tmpCanvas.height = GRID;
    tmpCanvas.getContext('2d')!.putImageData(imgData, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(tmpCanvas, 0, 0, canvas.width, canvas.height);

    if (showVectorsRef.current && vecCanvasRef.current) {
      const vctx = vecCanvasRef.current.getContext('2d')!;
      vctx.clearRect(0, 0, vecCanvasRef.current.width, vecCanvasRef.current.height);
      const step = 8;
      const scale = curSize / GRID * 1.6;
      vctx.strokeStyle = 'rgba(0, 240, 255, 0.55)';
      vctx.fillStyle = 'rgba(0, 240, 255, 0.8)';
      vctx.lineWidth = 1;
      for (let j = step / 2; j < GRID; j += step) {
        for (let i = step / 2; i < GRID; i += step) {
          const idx = Math.floor(j) * GRID + Math.floor(i);
          const u = vel.u[idx];
          const v = vel.v[idx];
          const mag = Math.sqrt(u * u + v * v);
          if (mag < 0.02) continue;
          const px1 = i * scale;
          const py1 = j * scale;
          const px2 = px1 + u * scale * 4;
          const py2 = py1 + v * scale * 4;

          vctx.beginPath();
          vctx.moveTo(px1, py1);
          vctx.lineTo(px2, py2);
          vctx.stroke();

          const ang = Math.atan2(v, u);
          const ah = 3;
          vctx.beginPath();
          vctx.moveTo(px2, py2);
          vctx.lineTo(
            px2 - ah * Math.cos(ang - Math.PI / 6),
            py2 - ah * Math.sin(ang - Math.PI / 6)
          );
          vctx.lineTo(
            px2 - ah * Math.cos(ang + Math.PI / 6),
            py2 - ah * Math.sin(ang + Math.PI / 6)
          );
          vctx.closePath();
          vctx.fill();
        }
      }
    }

    drawObstaclesOverlay();
  };

  const drawObstaclesOverlay = () => {
    if (!overlayCanvasRef.current || !simRef.current) return;
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255, 100, 150, 0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.shadowColor = 'rgba(255, 100, 150, 0.8)';
    ctx.shadowBlur = 12;

    for (const o of simRef.current.obstacles) {
      if (o.type === 'circle') {
        ctx.beginPath();
        ctx.arc(o.x * size, o.y * size, o.r * size, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.strokeRect(o.x * size, o.y * size, o.w * size, o.h * size);
      }
    }
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
  };

  useEffect(() => {
    let stopped = false;
    (async () => {
      const sim = new FluidSimulator();
      simRef.current = sim;
      await sim.init();
      if (stopped) {
        sim.dispose();
        return;
      }
      setReady(true);

      setTimeout(() => {
        if (stopped || !simRef.current) return;
        const sim = simRef.current;

        sim.addObstacle({ type: 'circle', x: 0.6, y: 0.55, r: 0.06 });

        for (let k = 0; k < 12; k++) {
          const off = k * 0.01;
          sim.addSource({
            x: 0.3 + off,
            y: 0.45,
            u: 0.8,
            v: -0.1,
            hue: 200,
          });
        }
        for (let k = 0; k < 8; k++) {
          const off = k * 0.008;
          sim.addSource({
            x: 0.45,
            y: 0.35 + off,
            u: -0.2,
            v: 0.7,
            hue: 320,
          });
        }
      }, 1500);

      let frameCount = 0;
      let lastTime = performance.now();
      let running = false;
      const loop = async () => {
        if (stopped) return;
        if (!running) {
          running = true;
          try {
            frameCount++;
            const now = performance.now();
            if (now - lastTime >= 500) {
              const fps = Math.round((frameCount * 1000) / (now - lastTime));
              setFps(fps);
              frameCount = 0;
              lastTime = now;
            }
            if (!stopped) {
              await renderFrame();
            }
          } finally {
            running = false;
          }
        }
        if (!stopped) {
          rafRef.current = requestAnimationFrame(loop as unknown as FrameRequestCallback);
        }
      };
      void loop();
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(rafRef.current);
      simRef.current?.dispose();
    };
  }, [setFps]);

  useEffect(() => {
    simRef.current?.setParams({ viscosity, forceScale });
  }, [viscosity, forceScale]);

  useEffect(() => {
    if (clearTrigger > 0) {
      simRef.current?.clearAll();
      drawObstaclesOverlay();
    }
  }, [clearTrigger]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    isDrawingRef.current = true;
    prevPosRef.current = pos;

    if (tool === 'clear') {
      simRef.current?.clearAll();
      return;
    }
    if (tool === 'select') return;

    if (tool === 'circle' || tool === 'rect') {
      dragStartRef.current = pos;
    }
    if (tool === 'source') {
      simRef.current?.addSource({
        x: pos.x,
        y: pos.y,
        u: 0,
        v: -1.5,
        hue: sourceHue,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    if (!isDrawingRef.current) {
      prevPosRef.current = pos;
      return;
    }

    if (tool === 'source' && simRef.current) {
      const prev = prevPosRef.current ?? pos;
      const u = (pos.x - prev.x) * 5;
      const v = (pos.y - prev.y) * 5;
      simRef.current.addSource({
        x: pos.x,
        y: pos.y,
        u: u || (Math.random() - 0.5) * 0.5,
        v: v || -1,
        hue: sourceHue,
      });
    }

    prevPosRef.current = pos;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if ((tool === 'circle' || tool === 'rect') && dragStartRef.current && simRef.current) {
      const start = dragStartRef.current;
      const end = getCanvasPos(e);
      let obs: Obstacle;
      if (tool === 'circle') {
        const cx = (start.x + end.x) / 2;
        const cy = (start.y + end.y) / 2;
        const dx = (end.x - start.x) / 2;
        const dy = (end.y - start.y) / 2;
        const r = Math.max(0.02, Math.sqrt(dx * dx + dy * dy));
        obs = { type: 'circle', x: cx, y: cy, r };
      } else {
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const w = Math.max(0.02, Math.abs(end.x - start.x));
        const h = Math.max(0.02, Math.abs(end.y - start.y));
        obs = { type: 'rect', x, y, w, h };
      }
      simRef.current.addObstacle(obs);
      drawObstaclesOverlay();
    }

    dragStartRef.current = null;
  };

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { isDrawingRef.current = false; dragStartRef.current = null; }}
    >
      <div
        className="absolute inset-0 rounded-2xl overflow-hidden"
        style={{
          boxShadow:
            '0 0 40px rgba(0, 240, 255, 0.3), 0 0 80px rgba(0, 240, 255, 0.1), inset 0 0 60px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(0, 240, 255, 0.4)',
        }}
      >
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="absolute inset-0 cursor-crosshair"
          style={{
            background: 'radial-gradient(ellipse at 30% 20%, #0f172a 0%, #0a0e1a 100%)',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        />
        <canvas
          ref={vecCanvasRef}
          width={size}
          height={size}
          className="absolute inset-0 pointer-events-none"
        />
        <canvas
          ref={overlayCanvasRef}
          width={size}
          height={size}
          className="absolute inset-0 pointer-events-none"
        />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 backdrop-blur">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-primary font-display font-bold text-xl neon-text">
                INITIALIZING GPU...
              </p>
              <p className="text-slate-400 mt-2 font-mono text-sm">
                TensorFlow.js WebGL backend loading
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => setShowVectors(v => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
            showVectors
              ? 'bg-primary/20 text-primary border border-primary/50 shadow-neon'
              : 'bg-slate-800/60 text-slate-400 border border-slate-600/50'
          }`}
        >
          VECTORS
        </button>
      </div>
    </div>
  );
}
