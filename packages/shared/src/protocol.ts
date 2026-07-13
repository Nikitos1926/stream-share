import {
  DtlsParameters,
  IceCandidate,
  IceParameters,
  MediaKind,
  RtpCapabilities,
  RtpParameters,
} from 'mediasoup-client/types';
import { CommonActions, StreamerActions, ViewerActions, WsEventsValues } from './enums/wsMethods';

export type SignalingApi = {
  [StreamerActions.GetRtpCapabilities]: {
    params: null;
    result: RtpCapabilities;
  };

  [CommonActions.CreateTransport]: {
    params: { direction: 'send' | 'recv' };
    result: {
      id: string;
      iceParameters: IceParameters;
      dtlsParameters: DtlsParameters;
      iceCandidates: IceCandidate[];
    };
  };

  [CommonActions.ConnectTransport]: {
    params: { dtlsParameters: DtlsParameters };
    result: null;
  };

  [StreamerActions.Produce]: {
    params: { rtpParameters: RtpParameters; kind: MediaKind };
    result: { producerId: string };
  };

  [StreamerActions.CloseProducer]: {
    params: null;
    result: null;
  };

  [ViewerActions.JoinStream]: {
    params: null;
    result: { producerIds: string[]; rtpCapabilities: RtpCapabilities };
  };

  [ViewerActions.SetPreferredLayer]: {
    params: null;
    result: {
      consumerId: string;
      producerId: string;
      kind: MediaKind;
      rtpParameters: RtpParameters;
    };
  };

  [ViewerActions.Consume]: {
    params: { rtpCapabilities: RtpCapabilities; producerId: string };
    result: { consumerId: string; rtpParameters: RtpParameters; kind: MediaKind };
  };
};
export type SignalingApiKeys = keyof SignalingApi;

export type WsRequest = {
  [M in SignalingApiKeys]: {
    type: 'req';
    method: M;
    params: SignalingApi[M]['params'];
  };
}[SignalingApiKeys];

export type SuccessWsResponse = {
  [M in SignalingApiKeys]: {
    type: 'res';
    ok: true;
    method: M;
    result: SignalingApi[M]['result'];
  };
}[SignalingApiKeys];

export type ErrorWsResponse = {
  type: 'res';
  method: SignalingApiKeys;
  ok: false;
  error: { code: string; msg: string };
};

export type WsResponse = SuccessWsResponse | ErrorWsResponse;

export type WsEvent = {
  [N in WsEventsValues]: {
    type: 'event';
    data?: Record<string, unknown>;
    name: N;
  };
}[WsEventsValues];

export type Envelope<T> = T & { requestId: number };

export type WsResponseEnvelope = Envelope<WsResponse>;
export type WsRequestEnvelope = Envelope<WsRequest>;
