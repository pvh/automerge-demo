import type {
  BinarySyncMessage, Change, Patch,
} from 'automerge'

export type DocumentId = string
export type PeerId = string

interface FEBEOpen {
  type: 'OPEN',
  docId: string
}
interface FEBELocalChange {
  type: 'LOCAL_CHANGE',
  docId: string,
  payload: Change
}
export type FrontendToBackendMessage = FEBEOpen | FEBELocalChange
interface BEFEPatch {
  docId: string,
  patch: Patch,
  isNewDoc?: boolean
}
export type BackendToFrontendMessage = BEFEPatch

interface SyncMessageComms {
  docId: DocumentId,
  source: string,
  target: string,
  syncMessage: BinarySyncMessage
}

interface HelloMessage {
  type: 'HELLO',
  source: string,
  target?: string,
}

export type GrossEventDataProtocol = SyncMessageComms | HelloMessage
