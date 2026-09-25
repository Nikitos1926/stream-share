import { ConveyorApi } from '../../preload/shared';
import type { SourceChanged } from '../schemas/stream.schema';

export class StreamApi extends ConveyorApi {
  getSources = () => this.invoke('stream:getSources');
  pickSource = (sourceId: string) => this.invoke('stream:pickSource', sourceId);
  startAudioCapture = () => this.invoke('stream:startAudioCapture');
  stopAudioCapture = () => this.invoke('stream:stopAudioCapture');
  setFollowApp = (enabled: boolean) => this.invoke('stream:setFollowApp', enabled);
  getFollowState = () => this.invoke('stream:getFollowState');
  resolveEndedSource = () => this.invoke('stream:resolveEndedSource');
  releaseSource = () => this.invoke('stream:releaseSource');
  onSourceChanged = (listener: (payload: SourceChanged) => void) =>
    this.onEvent('stream:sourceChanged', listener);
}
