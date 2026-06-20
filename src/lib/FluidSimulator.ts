import * as tf from '@tensorflow/tfjs';

export type ToolType = 'select' | 'circle' | 'rect' | 'source' | 'clear';

export interface SimParams {
  viscosity: number;
  forceScale: number;
}

export interface Circle {
  type: 'circle';
  x: number;
  y: number;
  r: number;
}

export interface Rect {
  type: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Obstacle = Circle | Rect;

export interface Source {
  x: number;
  y: number;
  u: number;
  v: number;
  hue: number;
  life: number;
}

const GRID = 128;
const DT = 0.05;
const DIFF_ITERS = 12;
const PRESS_ITERS = 20;
const DENSITY_DECAY = 0.9995;
const VELOCITY_DECAY = 0.9995;

const zero4 = () => tf.zeros([1, GRID, GRID, 1]) as tf.Tensor4D;
const scalarF = (v: number) => tf.scalar(v, 'float32');

export class FluidSimulator {
  gridSize = GRID;
  dt = DT;

  u!: tf.Tensor4D;
  v!: tf.Tensor4D;
  d_r!: tf.Tensor4D;
  d_g!: tf.Tensor4D;
  d_b!: tf.Tensor4D;
  mask!: tf.Tensor4D;

  private lapKernel!: tf.Tensor4D;
  private gradXKernel!: tf.Tensor4D;
  private gradYKernel!: tf.Tensor4D;
  private s1!: tf.Scalar;
  private s4!: tf.Scalar;
  private sNeg4!: tf.Scalar;
  private sDtGrid2!: tf.Scalar;
  private invMask!: tf.Tensor4D;

  private diffuseStep!: (x: tf.Tensor4D, cur: tf.Tensor4D, aT: tf.Scalar, denom: tf.Scalar) => tf.Tensor4D;
  private projectStep!: (p: tf.Tensor4D, divT: tf.Tensor4D) => tf.Tensor4D;
  private enforceBoundary!: (t: tf.Tensor4D, decayT: tf.Scalar, invMaskT: tf.Tensor4D) => tf.Tensor4D;
  private gradDiv!: (uIn: tf.Tensor4D, vIn: tf.Tensor4D) => tf.Tensor4D;
  private enforceZeroBoundary!: (t: tf.Tensor4D, invMaskT: tf.Tensor4D) => tf.Tensor4D;

  obstacles: Obstacle[] = [];
  sources: Source[] = [];
  params: SimParams = { viscosity: 0.001, forceScale: 2.0 };

  private initialized = false;

  async init() {
    if (this.initialized) return;
    await tf.setBackend('webgl');
    await tf.ready();

    this.s1 = scalarF(1);
    this.s4 = scalarF(4);
    this.sNeg4 = scalarF(-4);
    this.sDtGrid2 = scalarF(this.dt * GRID * GRID);

    this.u = zero4();
    this.v = zero4();
    this.d_r = zero4();
    this.d_g = zero4();
    this.d_b = zero4();
    this.mask = zero4();
    this.invMask = tf.sub(this.s1, this.mask) as tf.Tensor4D;

    this.lapKernel = tf.tensor4d([
      [[[0]], [[1]], [[0]]],
      [[[1]], [[-4]], [[1]]],
      [[[0]], [[1]], [[0]]],
    ]);
    this.gradXKernel = tf.tensor4d([
      [[[0]], [[0]], [[0]]],
      [[[-0.5]], [[0]], [[0.5]]],
      [[[0]], [[0]], [[0]]],
    ]);
    this.gradYKernel = tf.tensor4d([
      [[[0]], [[-0.5]], [[0]]],
      [[[0]], [[0]], [[0]]],
      [[[0]], [[0.5]], [[0]]],
    ]);

    const lapK = this.lapKernel;
    const gxK = this.gradXKernel;
    const gyK = this.gradYKernel;
    const sNeg4 = this.sNeg4;

    this.diffuseStep = (x: tf.Tensor4D, cur: tf.Tensor4D, aT: tf.Scalar, denom: tf.Scalar): tf.Tensor4D => {
      return tf.tidy(() => {
        const conv = tf.conv2d(cur, lapK, 1, 'same') as tf.Tensor4D;
        const next = tf.div(tf.add(x, tf.mul(conv, aT)), denom) as tf.Tensor4D;
        return next;
      });
    };

    this.gradDiv = (uIn: tf.Tensor4D, vIn: tf.Tensor4D): tf.Tensor4D => {
      return tf.tidy(() => {
        const dx = tf.conv2d(uIn, gxK, 1, 'same') as tf.Tensor4D;
        const dy = tf.conv2d(vIn, gyK, 1, 'same') as tf.Tensor4D;
        const div = tf.add(dx, dy) as tf.Tensor4D;
        return div;
      });
    };

    this.projectStep = (p: tf.Tensor4D, divT: tf.Tensor4D): tf.Tensor4D => {
      return tf.tidy(() => {
        const lapP = tf.conv2d(p, lapK, 1, 'same') as tf.Tensor4D;
        const rhs = tf.sub(lapP, divT);
        const nextP = tf.div(rhs, sNeg4) as tf.Tensor4D;
        return nextP;
      });
    };

    this.enforceBoundary = (t: tf.Tensor4D, decayT: tf.Scalar, invMaskT: tf.Tensor4D): tf.Tensor4D => {
      return tf.tidy(() => {
        const masked = tf.mul(t, invMaskT) as tf.Tensor4D;
        const decayed = tf.mul(masked, decayT) as tf.Tensor4D;
        return decayed;
      });
    };

    this.enforceZeroBoundary = (t: tf.Tensor4D, invMaskT: tf.Tensor4D): tf.Tensor4D => {
      return tf.tidy(() => {
        return tf.mul(t, invMaskT) as tf.Tensor4D;
      });
    };

    this.initialized = true;
  }

  setParams(p: Partial<SimParams>) {
    this.params = { ...this.params, ...p };
  }

  addObstacle(obs: Obstacle) {
    this.obstacles.push(obs);
    this.rebuildMask();
  }

  addSource(src: Omit<Source, 'life'>) {
    this.sources.push({ ...src, life: 8 });
  }

  clearAll() {
    this.obstacles = [];
    this.sources = [];
    [this.u, this.v, this.d_r, this.d_g, this.d_b, this.mask, this.invMask].forEach(t => t.dispose());
    this.u = zero4();
    this.v = zero4();
    this.d_r = zero4();
    this.d_g = zero4();
    this.d_b = zero4();
    this.mask = zero4();
    this.invMask = tf.sub(this.s1, this.mask) as tf.Tensor4D;
  }

  private rebuildMask() {
    this.mask.dispose();
    this.invMask.dispose();
    const arr = new Float32Array(GRID * GRID);
    for (const o of this.obstacles) {
      for (let j = 0; j < GRID; j++) {
        for (let i = 0; i < GRID; i++) {
          let inside = false;
          if (o.type === 'circle') {
            const dx = i - o.x * GRID;
            const dy = j - o.y * GRID;
            inside = dx * dx + dy * dy < (o.r * GRID) * (o.r * GRID);
          } else {
            const x = i / GRID;
            const y = j / GRID;
            inside = x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h;
          }
          if (inside) arr[j * GRID + i] = 1;
        }
      }
    }
    this.mask = tf.tensor4d(arr, [1, GRID, GRID, 1]);
    this.invMask = tf.sub(this.s1, this.mask) as tf.Tensor4D;
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hp = (h % 360) / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    let r = 0, g = 0, b = 0;
    if (hp >= 0 && hp < 1) [r, g, b] = [c, x, 0];
    else if (hp < 2) [r, g, b] = [x, c, 0];
    else if (hp < 3) [r, g, b] = [0, c, x];
    else if (hp < 4) [r, g, b] = [0, x, c];
    else if (hp < 5) [r, g, b] = [x, 0, c];
    else if (hp < 6) [r, g, b] = [c, 0, x];
    const m = l - c / 2;
    return [r + m, g + m, b + m];
  }

  private applySources(): [tf.Tensor4D, tf.Tensor4D, tf.Tensor4D, tf.Tensor4D, tf.Tensor4D] {
    if (this.sources.length === 0) {
      return [zero4(), zero4(), zero4(), zero4(), zero4()];
    }

    const uArr = new Float32Array(GRID * GRID);
    const vArr = new Float32Array(GRID * GRID);
    const rArr = new Float32Array(GRID * GRID);
    const gArr = new Float32Array(GRID * GRID);
    const bArr = new Float32Array(GRID * GRID);
    const radius = 3;

    for (const s of this.sources) {
      const cx = Math.floor(s.x * GRID);
      const cy = Math.floor(s.y * GRID);
      const [r, g, b] = this.hslToRgb(s.hue, 0.85, 0.55);
      for (let j = -radius; j <= radius; j++) {
        for (let i = -radius; i <= radius; i++) {
          const dist = Math.sqrt(i * i + j * j);
          if (dist > radius) continue;
          const weight = 1 - dist / radius;
          const x = Math.max(0, Math.min(GRID - 1, cx + i));
          const y = Math.max(0, Math.min(GRID - 1, cy + j));
          const idx = y * GRID + x;
          const f = this.params.forceScale * weight * 3;
          uArr[idx] += s.u * f;
          vArr[idx] += s.v * f;
          const dAmt = weight * 3.5;
          rArr[idx] += r * dAmt;
          gArr[idx] += g * dAmt;
          bArr[idx] += b * dAmt;
        }
      }
      s.life--;
    }
    this.sources = this.sources.filter(s => s.life > 0);

    return [
      tf.tensor4d(uArr, [1, GRID, GRID, 1]) as tf.Tensor4D,
      tf.tensor4d(vArr, [1, GRID, GRID, 1]) as tf.Tensor4D,
      tf.tensor4d(rArr, [1, GRID, GRID, 1]) as tf.Tensor4D,
      tf.tensor4d(gArr, [1, GRID, GRID, 1]) as tf.Tensor4D,
      tf.tensor4d(bArr, [1, GRID, GRID, 1]) as tf.Tensor4D,
    ];
  }

  private diffuse(x: tf.Tensor4D, diff: number): tf.Tensor4D {
    const diffS = scalarF(diff);
    const a = tf.mul(this.sDtGrid2, diffS);
    const s4a = tf.mul(this.s4, a);
    const denomT = tf.add(this.s1, s4a);

    let cur: tf.Tensor4D = x.clone() as tf.Tensor4D;
    for (let i = 0; i < DIFF_ITERS; i++) {
      const next = this.diffuseStep(x, cur, a as tf.Scalar, denomT as tf.Scalar);
      cur.dispose();
      cur = next;
    }

    diffS.dispose();
    a.dispose();
    s4a.dispose();
    denomT.dispose();
    return cur;
  }

  private async advectCpu(
    fieldArr: Float32Array,
    uArr: Float32Array,
    vArr: Float32Array,
    maskArr: Uint8Array
  ): Promise<Float32Array> {
    const out = new Float32Array(GRID * GRID);
    const dtG = this.dt * GRID;
    const N = GRID;
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const idx = j * N + i;

        if (maskArr[idx]) {
          out[idx] = 0;
          continue;
        }

        const x = i - uArr[idx] * dtG;
        const y = j - vArr[idx] * dtG;

        let x0 = Math.floor(x);
        let y0 = Math.floor(y);
        let x1 = x0 + 1;
        let y1 = y0 + 1;

        x0 = Math.max(0, Math.min(N - 1, x0));
        y0 = Math.max(0, Math.min(N - 1, y0));
        x1 = Math.max(0, Math.min(N - 1, x1));
        y1 = Math.max(0, Math.min(N - 1, y1));

        const wx = x - x0;
        const wy = y - y0;

        const m00 = maskArr[y0 * N + x0];
        const m10 = maskArr[y0 * N + x1];
        const m01 = maskArr[y1 * N + x0];
        const m11 = maskArr[y1 * N + x1];

        let f00 = m00 ? 0 : fieldArr[y0 * N + x0];
        let f10 = m10 ? 0 : fieldArr[y0 * N + x1];
        let f01 = m01 ? 0 : fieldArr[y1 * N + x0];
        let f11 = m11 ? 0 : fieldArr[y1 * N + x1];

        if (m00 || m10 || m01 || m11) {
          let wSum = 0;
          if (!m00) { const w = (1 - wx) * (1 - wy); f00 *= w; wSum += w; }
          if (!m10) { const w = wx * (1 - wy); f10 *= w; wSum += w; }
          if (!m01) { const w = (1 - wx) * wy; f01 *= w; wSum += w; }
          if (!m11) { const w = wx * wy; f11 *= w; wSum += w; }
          const c0 = f00 + f10;
          const c1 = f01 + f11;
          out[idx] = wSum > 0 ? (c0 + c1) / wSum : 0;
        } else {
          const c0 = f00 * (1 - wx) + f10 * wx;
          const c1 = f01 * (1 - wx) + f11 * wx;
          out[idx] = c0 * (1 - wy) + c1 * wy;
        }
      }
    }
    return out;
  }

  private async advect(
    field: tf.Tensor4D,
    uF: tf.Tensor4D,
    vF: tf.Tensor4D
  ): Promise<tf.Tensor4D> {
    const [f, u, v, m] = await Promise.all([
      field.data() as Promise<Float32Array>,
      uF.data() as Promise<Float32Array>,
      vF.data() as Promise<Float32Array>,
      this.mask.data(),
    ]);
    const maskArr = new Uint8Array(m.length);
    for (let i = 0; i < m.length; i++) maskArr[i] = m[i] > 0.5 ? 1 : 0;
    const outData = await this.advectCpu(f, u, v, maskArr);
    const result = tf.tensor4d(outData, [1, GRID, GRID, 1]);
    return result as tf.Tensor4D;
  }

  private project(uIn: tf.Tensor4D, vIn: tf.Tensor4D): [tf.Tensor4D, tf.Tensor4D] {
    const div = this.gradDiv(uIn, vIn);

    let p: tf.Tensor4D = tf.zerosLike(div) as tf.Tensor4D;
    for (let i = 0; i < PRESS_ITERS; i++) {
      const nextP = this.projectStep(p, div);
      p.dispose();
      p = nextP;
    }

    const pX = tf.conv2d(p, this.gradXKernel, 1, 'same') as tf.Tensor4D;
    const pY = tf.conv2d(p, this.gradYKernel, 1, 'same') as tf.Tensor4D;
    const uOut = tf.sub(uIn, pX) as tf.Tensor4D;
    const vOut = tf.sub(vIn, pY) as tf.Tensor4D;

    div.dispose();
    p.dispose();
    pX.dispose();
    pY.dispose();
    return [uOut, vOut];
  }

  private applyBoundaryMask(t: tf.Tensor4D, decay: number | null): tf.Tensor4D {
    if (decay === null) {
      return this.enforceZeroBoundary(t, this.invMask);
    }
    const decayT = scalarF(decay);
    const result = this.enforceBoundary(t, decayT, this.invMask);
    decayT.dispose();
    return result;
  }

  private enforceObstacleCollision(u: tf.Tensor4D, v: tf.Tensor4D, r: tf.Tensor4D, g: tf.Tensor4D, b: tf.Tensor4D): [tf.Tensor4D, tf.Tensor4D, tf.Tensor4D, tf.Tensor4D, tf.Tensor4D] {
    const uOut = this.enforceZeroBoundary(u, this.invMask);
    const vOut = this.enforceZeroBoundary(v, this.invMask);
    const rOut = this.enforceZeroBoundary(r, this.invMask);
    const gOut = this.enforceZeroBoundary(g, this.invMask);
    const bOut = this.enforceZeroBoundary(b, this.invMask);
    return [uOut, vOut, rOut, gOut, bOut];
  }

  async step() {
    if (!this.initialized) return;

    const [dU, dV, dR, dG, dB] = this.applySources();
    const visc = this.params.viscosity;
    const [oldU, oldV, oldR, oldG, oldB] = [this.u, this.v, this.d_r, this.d_g, this.d_b];

    const uInit = tf.add(oldU, dU) as tf.Tensor4D;
    const vInit = tf.add(oldV, dV) as tf.Tensor4D;
    const rInit = tf.add(oldR, dR) as tf.Tensor4D;
    const gInit = tf.add(oldG, dG) as tf.Tensor4D;
    const bInit = tf.add(oldB, dB) as tf.Tensor4D;
    dU.dispose(); dV.dispose(); dR.dispose(); dG.dispose(); dB.dispose();
    oldU.dispose(); oldV.dispose(); oldR.dispose(); oldG.dispose(); oldB.dispose();

    const u0 = this.diffuse(uInit, visc);
    const v0 = this.diffuse(vInit, visc);
    uInit.dispose(); vInit.dispose();

    const [u0p, v0p] = this.project(u0, v0);
    u0.dispose(); v0.dispose();

    const u1 = await this.advect(u0p, u0p, v0p);
    const v1 = await this.advect(v0p, u0p, v0p);
    u0p.dispose(); v0p.dispose();

    const [u2, v2] = this.project(u1, v1);
    u1.dispose(); v1.dispose();

    const u3 = this.applyBoundaryMask(u2, VELOCITY_DECAY);
    const v3 = this.applyBoundaryMask(v2, VELOCITY_DECAY);
    u2.dispose(); v2.dispose();

    const [r1T, g1T, b1T] = await Promise.all([
      this.advect(rInit, u3, v3),
      this.advect(gInit, u3, v3),
      this.advect(bInit, u3, v3),
    ]);
    rInit.dispose(); gInit.dispose(); bInit.dispose();
    const r1 = this.applyBoundaryMask(r1T, DENSITY_DECAY);
    const g1 = this.applyBoundaryMask(g1T, DENSITY_DECAY);
    const b1 = this.applyBoundaryMask(b1T, DENSITY_DECAY);
    r1T.dispose(); g1T.dispose(); b1T.dispose();

    const [uFinal, vFinal, rFinal, gFinal, bFinal] = this.enforceObstacleCollision(u3, v3, r1, g1, b1);
    u3.dispose(); v3.dispose();
    r1.dispose(); g1.dispose(); b1.dispose();

    this.u = uFinal; this.v = vFinal;
    this.d_r = rFinal; this.d_g = gFinal; this.d_b = bFinal;
  }

  async getVelocityData(): Promise<{ u: Float32Array; v: Float32Array }> {
    const [u, v] = await Promise.all([this.u.data(), this.v.data()]);
    return { u: new Float32Array(u), v: new Float32Array(v) };
  }

  async getDensityData(): Promise<{ r: Float32Array; g: Float32Array; b: Float32Array }> {
    const [r, g, b] = await Promise.all([this.d_r.data(), this.d_g.data(), this.d_b.data()]);
    return { r: new Float32Array(r), g: new Float32Array(g), b: new Float32Array(b) };
  }

  async getMaskData(): Promise<Uint8Array> {
    const m = await this.mask.data();
    const out = new Uint8Array(m.length);
    for (let i = 0; i < m.length; i++) out[i] = m[i] > 0.5 ? 1 : 0;
    return out;
  }

  dispose() {
    [this.u, this.v, this.d_r, this.d_g, this.d_b, this.mask, this.invMask,
     this.lapKernel, this.gradXKernel, this.gradYKernel,
     this.s1, this.s4, this.sNeg4, this.sDtGrid2
    ].forEach(t => t && t.dispose && t.dispose());
    this.initialized = false;
  }
}
