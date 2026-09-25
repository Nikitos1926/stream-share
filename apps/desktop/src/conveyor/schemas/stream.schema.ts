import { z } from 'zod';

export const sourceChangedSchema = z.discriminatedUnion('reason', [
  z.strictObject({
    reason: z.enum(['follow', 'return']),
    sourceId: z.string(),
    name: z.string(),
  }),
  z.strictObject({ reason: z.literal('lost') }),
  z.strictObject({ reason: z.literal('noop') }),
  z.strictObject({ reason: z.literal('error'), message: z.string() }),
]);
export type SourceChanged = z.infer<typeof sourceChangedSchema>;

export const followStateSchema = z.strictObject({
  enabled: z.boolean(),
  following: z.boolean(),
  activeName: z.string().nullable(),
  lastError: z.string().nullable(),
});
export type FollowState = z.infer<typeof followStateSchema>;

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
  'stream:setFollowApp': {
    args: z.tuple([z.boolean()]),
    return: z.void(),
  },
  'stream:getFollowState': {
    args: z.tuple([]),
    return: followStateSchema,
  },
  'stream:resolveEndedSource': {
    args: z.tuple([]),
    return: sourceChangedSchema,
  },
  'stream:releaseSource': {
    args: z.tuple([]),
    return: z.void(),
  },
};

export const streamIpcEventSchema = {
  'stream:sourceChanged': { payload: sourceChangedSchema },
};
