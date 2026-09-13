import type { ElectronAPI, IpcRenderer, IpcRendererListener } from '@electron-toolkit/preload';
import type {
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
    // Call the IPC method without runtime validation in preload
    // Validation happens on the main process side
    return this.renderer.invoke(channel, ...args) as Promise<InvokeChannelReturn<T>>;
  };

  send = <T extends SendChannelName>(channel: T, ...args: SendChannelArgs<T>): void => {
    return this.renderer.send(channel, ...args);
  };

  on = <T extends SendChannelName>(channel: T, listener: IpcRendererListener): void => {
    this.renderer.on(channel, listener);
  };
}
