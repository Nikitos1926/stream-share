import log from 'electron-log/main';
import type { FollowState, SourceChanged } from '../conveyor/schemas/stream.schema';
import { findFamilyRoot, isInFamily } from './processFamily';
import type { ProcessTable } from './processTable';

export const POLL_INTERVAL_MS = 1500;
/**
 * After the poller returns to the anchor, the renderer needs a moment to
 * recapture. A track that ends inside this window is the old followed
 * window's, already handled; answering `return` again would recapture twice.
 */
export const RETURN_GRACE_MS = 4000;

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

type Anchor = { sourceId: string; pid: number; familyRoot: number; startedAt: Date };
type Active = { sourceId: string; pid: number; name: string };

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
  private timer: NodeJS.Timeout | null = null;
  private ticking = false;
  private lastReturnAt = 0;

  constructor(private readonly deps: FollowerDeps) {}

  getState(): FollowState {
    return {
      enabled: this.enabled,
      following: this.active !== null,
      activeName: this.active?.name ?? null,
    };
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      // Leave the picture where it is; just stop deciding.
      this.stopPolling();
      this.active = null;
      return;
    }
    if (this.anchor) this.startPolling();
  }

  /** Called on every manual pick. Screens disable following; windows re-anchor. */
  async onSourcePicked(sourceId: string): Promise<void> {
    this.stop();
    if (!sourceId.startsWith('window:')) return;

    const pid = this.deps.resolvePid(sourceId);
    if (!pid) {
      log.warn('[follower] could not resolve a pid for', sourceId);
      return;
    }

    try {
      const table = await this.deps.listProcesses();
      const familyRoot = findFamilyRoot(table, pid);
      if (familyRoot === null) {
        log.warn('[follower] pid not in process table', pid);
        return;
      }
      const windows = await this.deps.listWindows();
      this.knownWindowIds = new Set(windows.map((w) => w.id));
      this.anchor = { sourceId, pid, familyRoot, startedAt: new Date() };
      log.info('[follower] anchored', { sourceId, pid, familyRoot: table.get(familyRoot)?.name });
      if (this.enabled) this.startPolling();
    } catch (err) {
      this.fail(err);
    }
  }

  /**
   * The renderer's video track ended. Decide right now instead of waiting for
   * the next tick: return to the anchor if it still exists, otherwise `lost`.
   */
  async resolveEnded(): Promise<SourceChanged> {
    const anchor = this.anchor;
    if (!this.enabled || !anchor) return { reason: 'lost' };
    let windows: WindowSource[] = [];
    try {
      windows = await this.deps.listWindows();
    } catch (err) {
      log.warn('[follower] listWindows failed in resolveEnded', err);
    }
    this.knownWindowIds = new Set(windows.map((w) => w.id));

    const anchorListed = windows.some((w) => w.id === anchor.sourceId);
    const justReturned = Date.now() - this.lastReturnAt < RETURN_GRACE_MS;
    if (this.active === null && justReturned && anchorListed) return { reason: 'noop' };

    return this.returnToAnchor(windows);
  }

  /** Forget everything. Used on screen pick, stream stop and errors. */
  stop(): void {
    this.stopPolling();
    this.anchor = null;
    this.active = null;
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
    try {
      const windows = await this.deps.listWindows();
      const ids = new Set(windows.map((w) => w.id));
      const appeared = windows.filter((w) => !this.knownWindowIds.has(w.id));
      const gone = [...this.knownWindowIds].filter((id) => !ids.has(id));
      this.knownWindowIds = ids;

      if (this.active && gone.includes(this.active.sourceId)) {
        this.deps.emit(this.returnToAnchor(windows));
        if (!this.anchor) return; // anchor lost, follower stopped itself
      }

      if (appeared.length > 0) await this.considerNewWindows(appeared);
    } catch (err) {
      this.fail(err);
    } finally {
      this.ticking = false;
    }
  }

  /** Prefer the exact anchor window; fall back to any window of the anchor process. */
  private returnToAnchor(windows: WindowSource[]): SourceChanged {
    const anchor = this.anchor;
    this.active = null;
    if (!anchor) return { reason: 'lost' };

    const target =
      windows.find((w) => w.id === anchor.sourceId) ??
      windows.find((w) => this.deps.resolvePid(w.id) === anchor.pid);

    if (!target) {
      log.info('[follower] anchor window gone, giving up');
      this.stop();
      return { reason: 'lost' };
    }

    this.deps.setSelectedSourceId(target.id);
    this.anchor = { ...anchor, sourceId: target.id };
    this.lastReturnAt = Date.now();
    log.info('[follower] returned to', target.name, target.id);
    return { reason: 'return', sourceId: target.id, name: target.name };
  }

  /**
   * A window qualifies when its process is in the anchor's family, is not the
   * anchor process itself, and was created after following started. The last
   * rule keeps pre-existing siblings (Riot Client) from taking over.
   */
  private async considerNewWindows(appeared: WindowSource[]): Promise<void> {
    const anchor = this.anchor;
    if (!anchor) return;

    const withPid = appeared
      .map((w) => ({ ...w, pid: this.deps.resolvePid(w.id) }))
      .filter((w) => w.pid !== 0 && w.pid !== anchor.pid);
    if (withPid.length === 0) return;

    const table = await this.deps.listProcesses();
    const candidates = withPid.flatMap((w) => {
      const info = table.get(w.pid);
      if (!info) return [];
      if (info.createdAt <= anchor.startedAt) return [];
      if (!isInFamily(table, w.pid, anchor.familyRoot)) return [];
      return [{ ...w, createdAt: info.createdAt }];
    });
    if (candidates.length === 0) return;

    candidates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const winner = candidates[0]!;
    if (this.active?.sourceId === winner.id) return;

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
    this.deps.emit({ reason: 'error', message });
  }
}
