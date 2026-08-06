import { WsEvent, WsRequestEnvelope, WsResponseEnvelope } from '../types/protocol/ws';

export const parseMessage = (message: string): WsRequestEnvelope | WsEvent | WsResponseEnvelope => {
  try {
    return JSON.parse(message);
  } catch (error) {
    throw new Error('Invalid message format.', { cause: error });
  }
};
