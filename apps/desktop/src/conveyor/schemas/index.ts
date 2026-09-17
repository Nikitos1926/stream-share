import { z } from 'zod';
import { appIpcSchema } from './app.schema';
import { authIpcInvokeSchema } from './auth.schema';
import { streamIpcInvokeSchema } from './stream.schema';
import { windowIpcSchema } from './window.schema';

// Define all IPC channel schemas in one place
export const ipcInvokeSchemas = {
  ...windowIpcSchema,
  ...appIpcSchema,
  ...streamIpcInvokeSchema,
  ...authIpcInvokeSchema,
} as const;

// Extract types from Zod schemas
export type IPCInvokeChannels = {
  [K in keyof typeof ipcInvokeSchemas]: {
    args: z.infer<(typeof ipcInvokeSchemas)[K]['args']>;
    return: z.infer<(typeof ipcInvokeSchemas)[K]['return']>;
  };
};

export type InvokeChannelName = keyof typeof ipcInvokeSchemas;
export type InvokeChannelArgs<T extends InvokeChannelName> = IPCInvokeChannels[T]['args'];
export type InvokeChannelReturn<T extends InvokeChannelName> = IPCInvokeChannels[T]['return'];

// Runtime validation helpers
export const validateInvokeArgs = <T extends InvokeChannelName>(
  channel: T,
  args: unknown[],
): InvokeChannelArgs<T> => {
  return ipcInvokeSchemas[channel].args.parse(args) as InvokeChannelArgs<T>;
};

export const validateReturn = <T extends InvokeChannelName>(
  channel: T,
  data: unknown,
): InvokeChannelReturn<T> => {
  return ipcInvokeSchemas[channel].return.parse(data) as InvokeChannelReturn<T>;
};

export const ipcSendSchemas = {} as const;

// Extract types from Zod schemas
export type IPCSendChannels = {
  [K in keyof typeof ipcSendSchemas]: {
    args: z.infer<(typeof ipcSendSchemas)[K]['args']>;
    return: z.infer<(typeof ipcSendSchemas)[K]['return']>;
  };
};

export type SendChannelName = keyof typeof ipcSendSchemas;
export type SendChannelArgs<T extends SendChannelName> =
  IPCSendChannels[T]['args'] extends readonly unknown[] ? IPCSendChannels[T]['args'] : never[];

export type SendChannelReturn<T extends SendChannelName> = IPCSendChannels[T]['return'];

type IPCSendSchema = {
  args: z.ZodTypeAny;
  return: z.ZodTypeAny;
};

// Runtime validation helpers
export const validateSendArgs = <T extends SendChannelName>(
  channel: T,
  args: unknown[],
): SendChannelArgs<T> => {
  const schemas = ipcSendSchemas as Record<SendChannelName, IPCSendSchema>;
  return schemas[channel].args.parse(args) as SendChannelArgs<T>;
};
