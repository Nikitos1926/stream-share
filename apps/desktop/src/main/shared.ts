import { ipcMain } from 'electron';
import {
  ipcInvokeSchemas,
  SendChannelArgs,
  SendChannelName,
  SendChannelReturn,
  validateInvokeArgs,
  validateReturn,
  validateSendArgs,
  type InvokeChannelArgs,
  type InvokeChannelReturn,
} from '../conveyor/schemas';

/**
 * Helper to register IPC handlers
 * @param channel - The IPC channel to register the handler for
 * @param handler - The handler function to register
 * @returns void
 */
export const handle = <T extends keyof typeof ipcInvokeSchemas>(
  channel: T,
  handler: (
    ...args: InvokeChannelArgs<T>
  ) => InvokeChannelReturn<T> | Promise<InvokeChannelReturn<T>>,
) => {
  ipcMain.handle(channel, async (_, ...args) => {
    try {
      const validatedArgs = validateInvokeArgs(channel, args);
      const result = await handler(...validatedArgs);

      return validateReturn(channel, result);
    } catch (error) {
      console.error(`IPC Error in ${channel}:`, error);
      throw error;
    }
  });
};

export const on = <T extends SendChannelName>(
  channel: T,
  handler: (event: Electron.IpcMainEvent, ...args: SendChannelArgs<T>) => SendChannelReturn<T>,
) => {
  ipcMain.on(channel, (event, ...args) => {
    try {
      const validatedArgs = validateSendArgs(channel, args);
      handler(event, ...validatedArgs);
    } catch (error) {
      console.error(`IPC Error in ${channel}:`, error);
      throw error;
    }
  });
};
