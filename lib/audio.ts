// 声学引擎(§SOUND-DESIGN 6)。单例;只在 /lab 实验内部、opt-in 手势后创建 AudioContext。
// 防爆音:一切参数变更走 ramp(setTargetAtTime),绝不直接给增益赋非零值。
// 本切片只含引擎核心 + EXP-001 呼吸音;noise-floor 混音台/sleep timer 属候补,不在本期。

const MASTER_MAX = 0.25; // §SOUND-DESIGN 3:master gain 上限
const VOICE_MAX = 0.5;   // 呼吸音峰值;× master 后 ≈ 0.125,不刺耳
const RAMP_FAST = 0.06;  // 开关/停起的时间常数,≥20ms 防爆音
const RAMP_ATTACK = 0.12; // 呼吸音起音时间常数,≥50ms(§SOUND-DESIGN 3)

export type BreathVoice = {
  /** v ∈ [0,1],跟随 4-7-8 包络;ramp 到 v * VOICE_MAX */
  setLevel(v: number): void;
  stop(): void;
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private visBound = false;
  muted = false;

  /** 已 opt-in 且未静音。 */
  get active(): boolean {
    return this.ctx !== null && !this.muted;
  }

  /** 首次 opt-in 手势调用:建 context + master(从 0 ramp 到 MASTER_MAX)。幂等。 */
  async enable(): Promise<void> {
    if (typeof window === "undefined") return;
    if (this.ctx) {
      if (this.ctx.state === "suspended") await this.ctx.resume();
      return;
    }
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);
    this.master.gain.setTargetAtTime(MASTER_MAX, this.ctx.currentTime, RAMP_FAST);
    this.bindVisibility();
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  /** 静音 = suspend(真关,iOS 不依赖静音拨片);取消静音 = resume。 */
  setMuted(m: boolean): void {
    this.muted = m;
    if (!this.ctx) return;
    if (m) {
      this.ctx.suspend();
    } else if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  toggleMute(): void {
    this.setMuted(!this.muted);
  }

  /** 路由离开实验页:挂起。 */
  suspend(): void {
    if (this.ctx && this.ctx.state === "running") this.ctx.suspend();
  }

  /** 切后台立即挂起;回前台且未静音则恢复(§SOUND-DESIGN 6)。 */
  private bindVisibility(): void {
    if (this.visBound || typeof document === "undefined") return;
    this.visBound = true;
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.suspend();
      } else if (!this.muted && this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    });
  }

  /** EXP-001 呼吸音:循环白噪声 → 低通(低频域"气息")→ 增益;未 enable 时返回空操作。 */
  createBreathVoice(): BreathVoice {
    if (!this.ctx || !this.master) {
      return { setLevel: () => {}, stop: () => {} };
    }
    const ctx = this.ctx;
    const seconds = 2;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420; // 夜里的声音是低的(§SOUND-DESIGN 3)
    filter.Q.value = 0.7;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();

    // setLevel 节流到 ~12 Hz:长时程会话(数小时)里避免 automation 事件无限累积;
    // 0.12 s ramp 保证听感上依然平滑。
    let lastLevelAt = -Infinity;

    return {
      setLevel(v: number) {
        const now = ctx.currentTime;
        if (now - lastLevelAt < 0.08) return;
        lastLevelAt = now;
        const target = Math.max(0, Math.min(1, v)) * VOICE_MAX;
        gain.gain.setTargetAtTime(target, now, RAMP_ATTACK);
      },
      stop() {
        gain.gain.setTargetAtTime(0, ctx.currentTime, RAMP_FAST);
        window.setTimeout(() => {
          try {
            src.stop();
          } catch {
            // 已停,忽略
          }
        }, 600);
      },
    };
  }
}

export const audio = new AudioEngine();
