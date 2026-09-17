import { z } from 'zod';

/**
 * The result is a union rather than a thrown error: the renderer has to tell a
 * user cancelling from a real failure, and an IPC rejection arrives there as an
 * opaque "Error invoking remote method" string.
 */
export const authIpcInvokeSchema = {
  'auth:signInWithGoogle': {
    args: z.tuple([]),
    return: z.discriminatedUnion('status', [
      z.strictObject({ status: z.literal('success'), code: z.string(), verifier: z.string() }),
      z.strictObject({ status: z.literal('cancelled') }),
      z.strictObject({ status: z.literal('timeout') }),
      z.strictObject({ status: z.literal('error'), message: z.string() }),
    ]),
  },
  'auth:cancelSignIn': {
    args: z.tuple([]),
    return: z.void(),
  },
};
