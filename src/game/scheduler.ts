// Deterministic stand-in for the browser's setInterval/setTimeout.
// The original game is a set of timers (10ms main loop, 100ms slow loop, stock timers,
// tournament timeouts). We run the same timers on a virtual clock so the game is
// reproducible and can be stepped faster than real time.
// Ordering rule: the earliest due timer fires first; ties go to the timer created first.

type Timer = { id: number; due: number; period: number | null; fn: () => void; seq: number };

export class Scheduler {
  now = 0;
  private nextId = 1;
  private seq = 0;
  private timers = new Map<number, Timer>();

  setInterval(fn: () => void, ms: number): number {
    return this.add(fn, ms, ms);
  }

  setTimeout(fn: () => void, ms: number): number {
    return this.add(fn, ms, null);
  }

  clear(id: number | undefined): void {
    if (id !== undefined) this.timers.delete(id);
  }

  /** Runs every timer due up to and including `time`, in order. */
  advanceTo(time: number): void {
    for (;;) {
      let next: Timer | undefined;
      for (const t of this.timers.values()) {
        if (t.due > time) continue;
        if (!next || t.due < next.due || (t.due === next.due && t.seq < next.seq)) next = t;
      }
      if (!next) break;
      this.now = next.due;
      if (next.period === null) this.timers.delete(next.id);
      else next.due += next.period;
      next.fn();
    }
    this.now = time;
  }

  advanceBy(ms: number): void {
    this.advanceTo(this.now + ms);
  }

  private add(fn: () => void, ms: number, period: number | null): number {
    const id = this.nextId++;
    const delay = Math.max(1, ms);
    this.timers.set(id, { id, due: this.now + delay, period: period === null ? null : Math.max(1, period), fn, seq: this.seq++ });
    return id;
  }
}
