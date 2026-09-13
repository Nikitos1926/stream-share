import { ConveyorApi } from '../../preload/shared';

export class AppApi extends ConveyorApi {
  version = () => this.invoke('version');
}
