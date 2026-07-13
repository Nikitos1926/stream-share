import { SignalingAction } from '../enums';
import { SignalingApiKeys, SuccessWsResponse, WsEvent, WsRequestEnvelope } from '../protocol';

export const constructSuccessResponse = <T extends SignalingAction>(
  method: T,
  result: Extract<SuccessWsResponse, { method: T }>['result'],
  requestId: number,
): string => {
  return JSON.stringify({
    type: 'res',
    method,
    ok: true,
    result,
    requestId,
  });
};

export const constructErrorResponse = (
  method: SignalingApiKeys,
  error: { code: string; msg: string },
  requestId: number,
): string => {
  return JSON.stringify({
    type: 'res',
    method,
    ok: false,
    error,
    requestId,
  });
};

export function constructRequest(data: WsRequestEnvelope): string {
  return JSON.stringify({
    ...data,
    type: 'req',
  });
}

export function constructEvent(data: Omit<WsEvent, 'type'>): string {
  return JSON.stringify({ ...data, type: 'event' });
}
