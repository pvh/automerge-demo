import { Backend } from "automerge"
import type { BackendState } from "automerge"
import type { FrontendToBackendMessage, BackendToFrontendMessage, SyncState, GrossEventDataProtocol } from "./types"
import { encodeMessage, decodeMessage, receiveMessage } from "./protocol"

// ERRRRR
const workerId = Math.round(Math.random() * 1000)

const backends: { [docId: string]: BackendState } = {}
const syncStates: { [peerId: string]: SyncState } = {} 
// must we store these on disk? 
// how are they corrected aside if they go funky aside from somehow successfully syncing the whole repo?

// This function is mostly here to give me type checking on the communication.
const sendMessageToRenderer = (message: BackendToFrontendMessage) => {
  postMessage(message)
}

// Respond to messages from the frontend document
addEventListener("message", (evt: any) => {
  const data: FrontendToBackendMessage = evt.data
  const { docId } = data

  if (data.type === "OPEN") {
    backends[docId] = Backend.init();

    // broadcast a request for it
    const syncMessage = Backend.syncStart(backends[docId])
    const encoded = Backend.encodeSyncMessage(syncMessage)
    sendMessage({docId, source: workerId, encoded: { type: "sync", payload: encoded }})
  }
  
  else if (data.type === "LOCAL_CHANGE") {
    const [newBackend, patch, change] = Backend.applyLocalChange(
      backends[docId],
      data.payload
    );
    backends[docId] = newBackend
    sendMessageToRenderer({ docId, patch })

    // Because we only apply messages when we get a sync, we have to send a sync to everyone
    // and because sync is per-peer, we have to calculate a separate sync-state for everyone (or send a full sync msg).
    // But we don't actually need to send a sync message! The other peer is a stranger.
    sendMessage({docId, source: workerId, encoded: { type: "change", payload: change}})

    const syncMessage = Backend.encodeSyncMessage(Backend.syncStart(backends[docId]))
    sendMessage({docId, source: workerId, encoded: { type: "sync", payload: syncMessage}})
  }
});

// In real life, you'd open a websocket or a webRTC thing, or ... something.
export const channel = new BroadcastChannel('automerge-demo-peer-discovery')


// the changes from Backend.syncResponse (et al) could be flavored arrays for type safety
export function sendMessage(encodedMessage: GrossEventDataProtocol) {
  channel.postMessage(encodedMessage);
}

channel.addEventListener("message", (evt: any) => {
  const { docId, source, target, encoded } = evt.data as GrossEventDataProtocol
  
  // TODO: uh, don't broadcast stuff that's just for one peer
  if (target && target != workerId) { /* not for us */ return }

  const decoded = decodeMessage(encoded)
  const backend = backends[docId]
  const syncState = syncStates[source] || { lastSync: [], waitingChanges: [] }

  // we aren't tracking this document yet.
  if (!backend) { return }

  const [newBackend, newSyncState, patch, outboundMessages] = receiveMessage(decoded, backend, syncState)

  if (patch) { 
    sendMessageToRenderer({docId, patch})
  }

  backends[docId] = newBackend
  syncStates[source] = newSyncState

  outboundMessages.forEach((decoded) => sendMessage({docId, source: workerId, target: source, encoded: encodeMessage(decoded)}))
})
