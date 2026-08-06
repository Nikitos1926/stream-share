import { SignalingAction } from '../enums';
import {
  SignalingApiKeys,
  SuccessWsResponse,
  WsEvent,
  WsRequestEnvelope,
} from '../types/protocol/ws';

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
  error: { code: string | number; msg: string },
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

export const constructRequest = (data: WsRequestEnvelope): string => {
  return JSON.stringify({
    ...data,
    type: 'req',
  });
};

export const constructEvent = (data: WsEvent): string => {
  return JSON.stringify(data);
};
