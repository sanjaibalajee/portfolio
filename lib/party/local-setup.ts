import type { Settings } from "./types";
export const onePhoneKey = "party:one:setup";
export interface OnePhoneSetup {
  names: string[];
  settings: Settings;
  history: string[];
  inProgress?: boolean;
}
