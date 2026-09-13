import { ConveyorApi } from '../../preload/shared';

export class StreamApi extends ConveyorApi {
  getSources = () => this.invoke('stream:getSources');
  pickSource = (sourceId: string) => this.invoke('stream:pickSource', sourceId);
  startAudioCapture = () => this.invoke('stream:startAudioCapture');
  stopAudioCapture = () => this.invoke('stream:stopAudioCapture');
}
