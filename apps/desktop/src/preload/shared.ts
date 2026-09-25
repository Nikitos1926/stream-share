import type { ElectronAPI, IpcRenderer, IpcRendererListener } from '@electron-toolkit/preload';
import type {
  EventChannelName,
  EventPayload,
  InvokeChannelName,
  InvokeChannelArgs,
  InvokeChannelReturn,
  SendChannelName,
  SendChannelArgs,
} from '../conveyor/schemas';

export abstract class ConveyorApi {
  protected renderer: IpcRenderer;

  constructor(electronApi: ElectronAPI) {
    this.renderer = electronApi.ipcRenderer;
  }

  invoke = async <T extends InvokeChannelName>(
    channel: T,
    ...args: InvokeChannelArgs<T>
  ): Promise<InvokeChannelReturn<T>> => {
    return this.renderer.invoke(channel, ...args) as Promise<InvokeChannelReturn<T>>;
  };

  send = <T extends SendChannelName>(channel: T, ...args: SendChannelArgs<T>): void => {
    return this.renderer.send(channel, ...args);
  };

  on = <T extends SendChannelName>(channel: T, listener: IpcRendererListener): void => {
    this.renderer.on(channel, listener);
  };

  onEvent = <T extends EventChannelName>(
    channel: T,
    listener: (payload: EventPayload<T>) => void,
  ): (() => void) => {
    const wrapped: IpcRendererListener = (_event, payload) => listener(payload as EventPayload<T>);
    this.renderer.on(channel, wrapped);
    return () => {
      this.renderer.removeListener(channel, wrapped);
    };
  };
}
