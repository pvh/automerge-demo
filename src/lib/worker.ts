import { Backend, BackendState, SyncState } from "automerge"
import type { FrontendToBackendMessage, BackendToFrontendMessage, GrossEventDataProtocol } from "./types"

// ERRRRR
const workerId = Math.round(Math.random() * 1000).toString()

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

    // broadcast a request for the document
    Object.entries(syncStates).forEach(([peer, syncState]) => {
      const [nextSyncState, syncMessage] = Backend.generateSyncMessage(backends[docId], syncState)
      syncStates[peer] = nextSyncState
      console.log('open message', syncMessage)
      sendMessage({docId, source: workerId, target: peer, syncMessage})  
    })
  }

  // broadcast the change
  if (data.type === "LOCAL_CHANGE") {
    const [newBackend, patch, change] = Backend.applyLocalChange(backends[docId], data.payload)
    sendMessageToRenderer({docId, patch})

    backends[docId] = newBackend
    Object.entries(syncStates).forEach(([peer, syncState]) => {
      const [nextSyncState, syncMessage] = Backend.generateSyncMessage(backends[docId], syncState)
      syncStates[peer] = nextSyncState
      sendMessage({docId, source: workerId, target: peer, syncMessage})  
    })
  }
});

// In real life, you'd open a websocket or a webRTC thing, or ... something.
export const channel = new BroadcastChannel('automerge-demo-peer-discovery')
sendMessage({source: workerId, type: "HELLO"}) // bit of a hack


// the changes from Backend.syncResponse (et al) could be flavored arrays for type safety
export function sendMessage(message: GrossEventDataProtocol) {
  channel.postMessage(message);
}

channel.addEventListener("message", ({data}: any) => { 
  const { source: peer, target } = data as GrossEventDataProtocol
  
  // TODO
  if (target && target != workerId) { return /* ain't for us */ }

  // think more about reconnection...
  if (data.type === "HELLO") {
    if (syncStates[peer] === undefined) {
      syncStates[peer] = Backend.initSyncState()
      sendMessage({source: workerId, target: peer, type: "HELLO"})  
    }
    return
  }

  // it's safe to peel these out now, because we've type-discriminated away the HELLO messages
  const { docId, syncMessage } = data

  if (!backends[docId]) { return }
  
  const [nextBackend, nextSyncState, patch] = Backend.receiveSyncMessage(
    backends[docId], 
    syncStates[peer], 
    syncMessage)
  backends[docId] = nextBackend
  syncStates[peer] = nextSyncState

  Object.keys(syncStates).forEach((peer) => {
    let nextMessage
    ;[syncStates[peer], nextMessage] = Backend.generateSyncMessage(backends[docId], syncStates[peer])
    if (nextMessage) { sendMessage({docId, source: workerId, target: peer, syncMessage: nextMessage }) }
  })

  // TODO: batch these until synced
  if (patch) { 
    sendMessageToRenderer({docId, patch})
  }
})
