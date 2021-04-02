import type { Change, Patch, SyncMessage } from "automerge";

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
  isNewDoc?: boolean;
}

/* a dummy type to prevent accidentally assigning other uint8arrays to this type by accident */
export type BinaryChange = Uint8Array & { binaryChange: true };

// the message type should be in the message
interface SyncWireMessage {
  type: "sync";
  payload: Uint8Array;
}

interface ChangeWireMessage {
  type: "change";
  payload: Uint8Array;
}

export type AutomergeWireMessage = SyncWireMessage | ChangeWireMessage;
export type AutomergeDecodedMessage = SyncDecodedMessage | ChangeDecodedMessage;

// TODO: What to do with type v. payload
interface SyncDecodedMessage {
  type: "sync";
  message: SyncMessage;
}
interface ChangeDecodedMessage {
  type: "change";
  message: BinaryChange;
}

export interface SyncState {
  lastSync: string[];
  waitingChanges: BinaryChange[];
}

export interface GrossEventDataProtocol {
  docId: string;
  source: number;
  target?: number;
  encoded: AutomergeWireMessage;
}
