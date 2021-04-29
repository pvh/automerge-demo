/* eslint-env worker */
import { Backend, BackendState, SyncState } from 'automerge'
import type { BackendToFrontendMessage, GrossEventDataProtocol } from './types'

declare const self: WorkerGlobalScope

// ERRRRR
const workerId = Math.round(Math.random() * 1000).toString()

const backends: { [docId: string]: BackendState } = {}
const syncStates: { [peerId: string]: SyncState } = {}

// In real life, you'd open a websocket or a webRTC thing, or ... something.
export const channel = new BroadcastChannel('automerge-demo-peer-discovery')

// This function is mostly here to give me type checking on the communication.
const sendMessageToRenderer = (message: BackendToFrontendMessage) => {
  postMessage(message)
}

export function sendMessage(message: GrossEventDataProtocol) {
  channel.postMessage(message)
}

// Respond to messages from the frontend document
self.addEventListener('message', (evt: any) => {
  const { data } = evt
  const { docId } = data

  if (data.type === 'OPEN') {
    backends[docId] = Backend.init()

    // broadcast a request for the document
    Object.entries(syncStates).forEach(([peer, syncState]) => {
      const [nextSyncState, syncMessage] = Backend.generateSyncMessage(backends[docId], syncState)
      syncStates[peer] = nextSyncState
      sendMessage({
        docId, source: workerId, target: peer, syncMessage,
      })
    })
  }

  // broadcast the change
  if (data.type === 'LOCAL_CHANGE') {
    const [newBackend, patch] = Backend.applyLocalChange(backends[docId], data.payload)
    sendMessageToRenderer({ docId, patch })

    backends[docId] = newBackend
    Object.entries(syncStates).forEach(([peer, syncState]) => {
      const [nextSyncState, syncMessage] = Backend.generateSyncMessage(backends[docId], syncState)
      syncStates[peer] = nextSyncState
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
      syncStates[source] = Backend.initSyncState()
      sendMessage({ source: workerId, target: source, type: 'HELLO' })
    }
    return
  }

  // it's safe to peel these out now, because we've type-discriminated away the HELLO messages
  const { docId, syncMessage } = data

  if (!backends[docId]) { return }

  const [nextBackend, nextSyncState, patch] = Backend.receiveSyncMessage(
    backends[docId],
    syncStates[source],
    syncMessage,
  )
  backends[docId] = nextBackend
  syncStates[source] = nextSyncState

  Object.keys(syncStates).forEach((peer) => {
    let nextMessage;
    [syncStates[peer], nextMessage] = Backend.generateSyncMessage(backends[docId], syncStates[peer])
    if (nextMessage) {
      sendMessage({
        docId, source: workerId, target: peer, syncMessage: nextMessage,
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
