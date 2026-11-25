export type Source = {
  isScreen: boolean;
  /** Absent in desktop builds that predate minimized-window support. */
  isMinimized?: boolean;
  appIcon: string;
  display_id: string;
  id: string;
  name: string;
  thumbnail: string;
};
