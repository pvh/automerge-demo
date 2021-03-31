import type { Change, Patch } from 'automerge';

export type FrontendToBackendMessage = FEBEOpen | FEBELocalChange;
interface FEBEOpen {
  type: "OPEN";
  docId: string;
}
interface FEBELocalChange {
  type: "LOCAL_CHANGE";
  docId: string;
  payload: Change;
}
export type BackendToFrontendMessage = BEFEPatch;
interface BEFEPatch {
  docId: string;
  patch: Patch;
}

export interface GrossEventDataProtocol {
  docId: string,
  source: number,
  target?: number,
  encoded: Uint8Array
}
