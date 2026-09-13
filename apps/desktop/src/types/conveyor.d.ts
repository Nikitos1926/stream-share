import type { ConveyorApi } from './api';

declare global {
  interface Window {
    conveyor: ConveyorApi;
  }
}
