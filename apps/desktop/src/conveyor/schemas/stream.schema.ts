import { z } from 'zod';

export const streamIpcInvokeSchema = {
  'stream:getSources': {
    args: z.tuple([]),
    return: z.array(
      z.strictObject({
        isScreen: z.boolean(),
        appIcon: z.string(),
        display_id: z.string(),
        id: z.string(),
        name: z.string(),
        thumbnail: z.string(),
      }),
    ),
  },
  'stream:pickSource': {
    args: z.tuple([z.string()]),
    return: z.void(),
  },
  'stream:startAudioCapture': {
    args: z.tuple([]),
    return: z.void(),
  },
  'stream:stopAudioCapture': {
    args: z.tuple([]),
    return: z.void(),
  },
};
