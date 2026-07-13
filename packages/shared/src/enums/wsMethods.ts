export const CommonActions = {
  CreateTransport: 'createTransport',
  ConnectTransport: 'connectTransport',
} as const;

export const StreamerActions = {
  ...CommonActions,
  GetRtpCapabilities: 'getRtpCapabilities',
  Produce: 'produce',
  CloseProducer: 'closeProducer',
} as const;

export const ViewerActions = {
  ...CommonActions,
  JoinStream: 'joinStream',
  Consume: 'consume',
  SetPreferredLayer: 'setPreferredLayer',
} as const;

export const WsEvents = {
  StreamEnd: 'streamEnd',
  StreamerDisconnect: 'streamerDisconnect',
} as const;

export type StreamerActionsType = typeof StreamerActions;
export type ViewerActionsType = typeof ViewerActions;
export type WsEventsType = typeof WsEvents;

export type StreamerActionsValues = StreamerActionsType[keyof StreamerActionsType];
export type ViewerActionsValues = ViewerActionsType[keyof ViewerActionsType];
export type WsEventsValues = WsEventsType[keyof WsEventsType];

export type SignalingAction = StreamerActionsValues | ViewerActionsValues;
