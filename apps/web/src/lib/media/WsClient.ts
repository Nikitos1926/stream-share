import {
  constructRequest,
  parseMessage,
  WsEvent,
  WsRequest,
  WsResponse,
  WsResponseEnvelope,
} from '@stream-share/shared';

type Pending = {
  resolve: (msg: WsResponse) => void;
  reject: (err: Error) => void;
};

export class WsClient {
  private ws: WebSocket;
  private pending = new Map<number, Pending>();
  private eventHandlers = new Map<WsEvent['name'], Set<(msg: WsEvent) => void>>();
  private nextId = 1;
  private openPromise: Promise<void> | null = null;

  constructor(url: string) {
    this.ws = new WebSocket(url);

    if (this.ws.readyState !== WebSocket.OPEN) {
      this.openPromise = new Promise<void>((res, rej) => {
        this.ws.addEventListener('open', () => res(), { once: true });
        this.ws.addEventListener('close', () => rej(new Error(`Ws open failed`)), {
          once: true,
        });
      });
    }
    this.ws.addEventListener('message', this.handleMessage);
    this.ws.addEventListener('close', this.handleClose);
  }

  private handleMessage = (ev: MessageEvent) => {
    const envelope = parseMessage(ev.data) as WsResponseEnvelope | WsEvent;

    if (envelope.type === 'res') {
      if (!envelope.requestId) return;
      const p = this.pending.get(envelope.requestId);
      if (!p) return;
      this.pending.delete(envelope.requestId);
      if (!envelope.ok) {
        p.reject(new Error(envelope.error.msg, { cause: envelope.error.code }));
        return;
      }
      p.resolve(envelope);
      return;
    }
    const set = this.eventHandlers.get(envelope.name);
    if (set) for (const handler of set) handler(envelope);
  };

  private handleClose = () => {
    for (const p of this.pending.values()) {
      p.reject(new Error('Ws closed'));
    }
    this.pending.clear();
  };

  async request<M extends WsResponse['method']>(
    msg: Extract<WsRequest, { method: M }>,
  ): Promise<Extract<WsResponse, { method: M }>> {
    if (this.openPromise) await this.openPromise;
    const requestId = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, {
        resolve: resolve as (msg: WsResponse) => void,
        reject,
      });
      this.ws.send(constructRequest({ ...msg, requestId }));
    }) as Promise<Extract<WsResponse, { method: M }>>;
  }

  on<M extends WsEvent['name']>(name: M, handler: (msg: Extract<WsEvent, { name: M }>) => void) {
    let set = this.eventHandlers.get(name);
    if (!set) {
      set = new Set();
      this.eventHandlers.set(name, set);
    }
    const wrapped = handler as (msg: WsEvent) => void;
    set.add(wrapped);
    return () => set.delete(wrapped);
  }

  close(): void {
    this.ws.close();
  }
}
