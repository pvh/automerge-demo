/* eslint-env worker */
import { Backend, BackendState, BinaryChange, SyncState } from 'automerge'
import type { BackendToFrontendMessage, GrossEventDataProtocol } from './types'

declare const self: WorkerGlobalScope

// ERRRRR
const workerId = Math.round(Math.random() * 1000).toString()

const backends: { [docId: string]: BackendState } = {}
const syncStates: { [peerId: string]: { [docId: string]: SyncState } } = {}

// In real life, you'd open a websocket or a webRTC thing, or ... something.
export const channel = new BroadcastChannel('automerge-demo-peer-discovery')
import { Backend, decodeChange } from "automerge";
import type { BackendState } from "automerge";
import type {
  FrontendToBackendMessage,
  BackendToFrontendMessage,
  SyncState,
  GrossEventDataProtocol,
} from "./types";
import { encodeMessage, decodeMessage, receiveMessage } from "./protocol";
import { DB } from "./db";

// ERRRRR
const workerId = Math.round(Math.random() * 1000);

const db = new DB();

const backends: { [docId: string]: BackendState } = {};
const syncStates: { [peerId: string]: SyncState } = {};
// must we store these on disk?
// how are they corrected aside if they go funky aside from somehow successfully syncing the whole repo?

// This function is mostly here to give me type checking on the communication.
const sendMessageToRenderer = (message: BackendToFrontendMessage) => {
  postMessage(message);
};

export function sendMessage(message: GrossEventDataProtocol) {
  channel.postMessage(message)
}

// Respond to messages from the frontend document
self.addEventListener('message', (evt: any) => {
  const { data } = evt
  const { docId } = data

  if (data.type === 'OPEN') {
    backends[docId] = Backend.init()

    db.getChanges(docId).then((encodedChanges: BinaryChange[]) => {
      const [newBackend, patch] = Backend.applyChanges(
        backends[docId],
        encodedChanges
      );
      backends[docId] = newBackend;
      sendMessageToRenderer({ docId, patch });
    });

    // broadcast a request for the document
    Object.entries(syncStates).forEach(([peer, syncState]) => {
      const [nextSyncState, syncMessage] = Backend.generateSyncMessage(
        backends[docId],
        syncState[docId] || Backend.initSyncState(),
      )
      syncStates[peer] = { ...syncStates[peer], [docId]: nextSyncState }
      sendMessage({
        docId, source: workerId, target: peer, syncMessage,
      })
    })
  }

  // broadcast the change
  if (data.type === 'LOCAL_CHANGE') {
    const [newBackend, patch, change] = Backend.applyLocalChange(backends[docId], data.payload)
    sendMessageToRenderer({ docId, patch })

    const decodedChange = decodeChange(change)
    db.storeChange(docId, (decodedChange as any).hash, change)

    backends[docId] = newBackend
    Object.entries(syncStates).forEach(([peer, syncState]) => {
      const [nextSyncState, syncMessage] = Backend.generateSyncMessage(
        backends[docId],
        syncState[docId] || Backend.initSyncState(),
      )
      syncStates[peer] = { ...syncStates[peer], [docId]: nextSyncState }
      sendMessage({
        docId, source: workerId, target: peer, syncMessage,
      })
    })
  }
})

channel.addEventListener('message', ({ data }: any) => {
  const { source, target } = data as GrossEventDataProtocol

  if (target && target !== workerId) { return /* ain't for us */ }

  // think more about reconnection...
  if (data.type === 'HELLO') {
    if (syncStates[source] === undefined) {
      syncStates[source] = {}
      sendMessage({ source: workerId, target: source, type: 'HELLO' })
    }
    return
  }

  // it's safe to peel these out now, because we've type-discriminated away the HELLO messages
  const { docId, syncMessage } = data

  if (!backends[docId]) { return }

  const [nextBackend, nextSyncState, patch] = Backend.receiveSyncMessage(
    backends[docId],
    syncStates[source][docId] || Backend.initSyncState(),
    syncMessage,
  )
  backends[docId] = nextBackend
  syncStates[source] = { ...syncStates[source], [docId]: nextSyncState }

  Object.keys(syncStates).forEach((peer) => {
    const [nextPeerSyncState, nextPeerMessage] = Backend.generateSyncMessage(
      backends[docId],
      syncStates[peer][docId] || Backend.initSyncState(),
    )
    syncStates[peer] = { ...syncStates[peer], [docId]: nextPeerSyncState }

    if (nextPeerMessage) {
      sendMessage({
        docId, source: workerId, target: peer, syncMessage: nextPeerMessage,
      })
    }
  })

  // TODO: batch these until synced
  if (patch) {
    sendMessageToRenderer({ docId, patch })
  }
})

// announce ourselves to the other peers
// (this is a bit inelegant)
sendMessage({ source: workerId, type: 'HELLO' })
