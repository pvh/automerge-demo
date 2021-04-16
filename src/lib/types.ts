import type { BinarySyncMessage, Change, Patch } from 'automerge';

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

interface SyncMessageComms {
  docId: string,
  source: string,
  target: string,
  syncMessage: BinarySyncMessage
}

interface HelloMessage {
  type: "HELLO" 
  source: string,
  target?: string,
}

export type GrossEventDataProtocol = SyncMessageComms | HelloMessage 
