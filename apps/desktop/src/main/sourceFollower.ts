import log from 'electron-log/main';
import type { FollowState, SourceChanged } from '../conveyor/schemas/stream.schema';
import { findFamilyRoot, isInFamily, isShellProcess } from './processFamily';
import type { ProcessTable } from './processTable';

export const POLL_INTERVAL_MS = 1500;
/**
 * After a return to the anchor, the renderer needs a moment to recapture. A
 * track that ends inside this window is the old followed window's, already
 * handled; answering `return` again would recapture twice.
 */
export const RETURN_GRACE_MS = 4000;
/**
 * How long to wait for the anchor to come back after the followed window
 * closed. League hides its client during a match and re-shows it a few seconds
 * after the game exits; with "close client during game" it relaunches it.
 */
export const RETURN_WAIT_MS = 20_000;

export type WindowSource = { id: string; name: string };

export type FollowerDeps = {
  /** Current top-level windows, cheap (no thumbnails). */
  listWindows: () => Promise<WindowSource[]>;
  /** Full process snapshot. Expensive (~350 ms); called on pick and on new windows only. */
  listProcesses: () => Promise<ProcessTable>;
  /** desktopCapturer source id -> owning PID, 0 when unknown. */
  resolvePid: (sourceId: string) => number;
  /** Writes the id the display-media handler and audio capture will use next. */
  setSelectedSourceId: (sourceId: string) => void;
  /** Push to the renderer. */
  emit: (payload: SourceChanged) => void;
};

type Anchor = {
  sourceId: string;
  pid: number;
  /** Executable name, used to recognise a relaunched instance of the same app. */
  exe: string;
  familyRoot: number;
  startedAt: Date;
};
type Active = { sourceId: string; pid: number; name: string };
type PidWindow = WindowSource & { pid: number };

/**
 * Follows the captured application into windows opened by processes in its
 * family that started after following began, and returns to the anchor window
 * when the followed window closes. Main owns the decision; the renderer only
 * recaptures on each `emit`.
 */
export class SourceFollower {
  private enabled = true;
  private anchor: Anchor | null = null;
  private active: Active | null = null;
  private knownWindowIds = new Set<string>();
  private needsReseed = false;
  /** Set while the followed window is gone and the anchor has not come back yet. */
  private pendingReturnSince: number | null = null;
  private lastReturnAt = 0;
  private lastError: string | null = null;
  private timer: NodeJS.Timeout | null = null;
  private ticking = false;
  /** Bumped by stop() and every pick; async work bails out when it no longer matches. */
  private generation = 0;

  constructor(private readonly deps: FollowerDeps) {}

  getState(): FollowState {
    return {
      enabled: this.enabled,
      following: this.active !== null,
      activeName: this.active?.name ?? null,
      lastError: this.lastError,
    };
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      // Leave the picture where it is; just stop deciding.
      this.stopPolling();
      this.active = null;
      this.pendingReturnSince = null;
      return;
    }
    this.lastError = null;
    if (this.anchor) {
      // Windows that opened while off are not "new"; start from the current list.
      this.needsReseed = true;
      this.startPolling();
    }
  }

  /** Called on every manual pick. Screens disable following; windows re-anchor. */
  async onSourcePicked(sourceId: string): Promise<void> {
    this.stop();
    const gen = this.generation;
    if (!sourceId.startsWith('window:')) return;

    const pid = this.deps.resolvePid(sourceId);
    if (!pid) {
      log.warn('[follower] could not resolve a pid for', sourceId);
      return;
    }

    try {
      const table = await this.deps.listProcesses();
      if (gen !== this.generation) return;
      if (isShellProcess(table, pid)) {
        log.info('[follower] not following a shell process window', table.get(pid)?.name);
        return;
      }
      const familyRoot = findFamilyRoot(table, pid);
      if (familyRoot === null) {
        log.warn('[follower] pid not in process table', pid);
        return;
      }
      const windows = await this.deps.listWindows();
      if (gen !== this.generation) return;
      this.knownWindowIds = new Set(windows.map((w) => w.id));
      this.anchor = {
        sourceId,
        pid,
        exe: table.get(pid)?.name ?? '',
        familyRoot,
        startedAt: new Date(),
      };
      log.info('[follower] anchored', { sourceId, pid, familyRoot: table.get(familyRoot)?.name });
      if (this.enabled) this.startPolling();
    } catch (err) {
      if (gen === this.generation) this.fail(err);
    }
  }

  /**
   * The renderer's video track ended. Decide right now instead of waiting for
   * the next tick.
   */
  async resolveEnded(): Promise<SourceChanged> {
    const anchor = this.anchor;
    if (!this.enabled || !anchor) return { reason: 'lost' };
    const gen = this.generation;
    let windows: WindowSource[] = [];
    try {
      windows = await this.deps.listWindows();
    } catch (err) {
      log.warn('[follower] listWindows failed in resolveEnded', err);
    }
    // A newer pick replaced this anchor while we looked; its own capture is under way.
    if (gen !== this.generation) return { reason: 'noop' };
    this.knownWindowIds = new Set(windows.map((w) => w.id));

    // The followed window closed before the poller noticed.
    if (this.active) return this.beginReturn(windows);
    // Already waiting for the anchor to come back; the poller will emit the outcome.
    if (this.pendingReturnSince !== null) return { reason: 'noop' };
    // The poller just returned to the anchor and the renderer's recapture is in
    // flight: the ended track is the old followed window's. Only while the anchor
    // is actually there, though; if it vanished in the meantime, this is its track.
    const anchorListed = windows.some((w) => w.id === anchor.sourceId);
    if (anchorListed && Date.now() - this.lastReturnAt < RETURN_GRACE_MS) return { reason: 'noop' };

    // The anchor's own window closed while nothing was followed. Do not fall
    // back to another window of the same process: the streamer closed what
    // they were sharing, and the next window could be anything.
    log.info('[follower] captured window closed, stopping');
    this.stop();
    return { reason: 'lost' };
  }

  /** Forget everything. Used on screen pick, stream stop and errors. */
  stop(): void {
    this.generation += 1;
    this.stopPolling();
    this.anchor = null;
    this.active = null;
    this.pendingReturnSince = null;
    this.knownWindowIds.clear();
  }

  private startPolling(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), POLL_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    if (this.ticking || !this.anchor) return;
    this.ticking = true;
    const gen = this.generation;
    try {
      const windows = await this.deps.listWindows();
      if (gen !== this.generation) return;
      const ids = new Set(windows.map((w) => w.id));
      if (this.needsReseed) {
        this.knownWindowIds = ids;
        this.needsReseed = false;
        return;
      }
      const appeared = windows.filter((w) => !this.knownWindowIds.has(w.id));
      const gone = [...this.knownWindowIds].filter((id) => !ids.has(id));
      this.knownWindowIds = ids;

      if (this.active && gone.includes(this.active.sourceId)) {
        const result = this.beginReturn(windows);
        if (result.reason === 'return') this.deps.emit(result);
      }

      if (appeared.length > 0) await this.considerNewWindows(appeared, gen);
      if (gen !== this.generation) return;

      if (
        this.pendingReturnSince !== null &&
        Date.now() - this.pendingReturnSince > RETURN_WAIT_MS
      ) {
        log.info('[follower] anchor did not come back, giving up');
        this.stop();
        this.deps.emit({ reason: 'lost' });
      }
    } catch (err) {
      if (gen === this.generation) this.fail(err);
    } finally {
      this.ticking = false;
    }
  }

  /**
   * The followed window is gone. Return now if the anchor is visible, otherwise
   * wait for it (League re-shows or relaunches its client after a match).
   */
  private beginReturn(windows: WindowSource[]): SourceChanged {
    this.active = null;
    const target = this.findReturnTarget(windows);
    if (target) return this.completeReturn(target);
    if (this.pendingReturnSince === null) {
      this.pendingReturnSince = Date.now();
      log.info('[follower] anchor not visible, waiting for it to come back');
    }
    return { reason: 'noop' };
  }

  /** Prefer the exact anchor window; fall back to any window of the anchor process. */
  private findReturnTarget(windows: WindowSource[]): WindowSource | undefined {
    const anchor = this.anchor;
    if (!anchor) return undefined;
    return (
      windows.find((w) => w.id === anchor.sourceId) ??
      windows.find((w) => this.deps.resolvePid(w.id) === anchor.pid)
    );
  }

  private completeReturn(target: WindowSource): SourceChanged {
    this.pendingReturnSince = null;
    this.active = null;
    this.deps.setSelectedSourceId(target.id);
    if (this.anchor) this.anchor = { ...this.anchor, sourceId: target.id };
    this.lastReturnAt = Date.now();
    log.info('[follower] returned to', target.name, target.id);
    return { reason: 'return', sourceId: target.id, name: target.name };
  }

  /**
   * New windows appeared. Three things can be in there:
   * - the anchor's own window coming back (complete a pending return);
   * - a relaunched instance of the anchor app after its process exited (adopt it);
   * - a window of a family process started after following began (follow it).
   * The last rule's "created after" part keeps pre-existing siblings (Riot Client)
   * from taking over.
   */
  private async considerNewWindows(appeared: WindowSource[], gen: number): Promise<void> {
    const anchor = this.anchor;
    if (!anchor) return;

    const withPid: PidWindow[] = appeared
      .map((w) => ({ ...w, pid: this.deps.resolvePid(w.id) }))
      .filter((w) => w.pid !== 0);

    const ownWindow = withPid.find((w) => w.pid === anchor.pid);
    if (ownWindow && this.pendingReturnSince !== null) {
      this.deps.emit(this.completeReturn(ownWindow));
      return;
    }

    const others = withPid.filter((w) => w.pid !== anchor.pid);
    if (others.length === 0) return;

    const table = await this.deps.listProcesses();
    if (gen !== this.generation) return;
    const anchorAlive = table.has(anchor.pid);

    const candidates: (PidWindow & { createdAt: Date })[] = [];
    for (const w of others) {
      const info = table.get(w.pid);
      if (!info) continue;
      if (!isInFamily(table, w.pid, anchor.familyRoot)) continue;
      if (info.createdAt <= anchor.startedAt) continue;

      const sameExe = info.name.toLowerCase() === anchor.exe.toLowerCase();
      if (sameExe && !anchorAlive) {
        // The anchor process was replaced (League's "close client during game").
        this.anchor = { ...anchor, sourceId: w.id, pid: w.pid };
        log.info('[follower] anchor relaunched as', w.name, w.id);
        if (this.pendingReturnSince !== null) this.deps.emit(this.completeReturn(w));
        return;
      }
      // A second instance of the anchor app while the anchor is alive is not a game.
      if (sameExe) continue;
      candidates.push({ ...w, createdAt: info.createdAt });
    }
    if (candidates.length === 0) return;

    candidates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const winner = candidates[0]!;
    if (this.active?.sourceId === winner.id) return;

    // A new follow supersedes waiting for the anchor.
    this.pendingReturnSince = null;
    this.active = { sourceId: winner.id, pid: winner.pid, name: winner.name };
    this.deps.setSelectedSourceId(winner.id);
    log.info('[follower] following', winner.name, winner.id);
    this.deps.emit({ reason: 'follow', sourceId: winner.id, name: winner.name });
  }

  private fail(err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    log.error('[follower] disabled after error:', message);
    this.stop();
    this.enabled = false;
    this.lastError = message;
    this.deps.emit({ reason: 'error', message });
  }
}
