import type { Change, Patch, SyncMessage } from 'automerge';

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
  syncMessage: SyncMessage
}

interface HelloMessage {
  type: "HELLO" 
  source: string,
  target?: string,
}

export type GrossEventDataProtocol = SyncMessageComms | HelloMessage 
