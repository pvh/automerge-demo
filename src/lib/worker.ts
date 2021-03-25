import { Backend, Change, Patch, SyncMessage } from "automerge"
import type { BackendState } from "automerge"

// ERRRRR
const workerId = Math.round(Math.random() * 1000)

interface BackendMap { [docId: string]: BackendState }
const backends: BackendMap = {}

interface CreateMessage {
  type: "CREATE"
  id: string
  payload: any
}

interface LoadMessage {
  type: "LOAD"
  id: string
  payload: any
}

interface LocalChangeMessage {
  type: "APPLY_LOCAL_CHANGE"
  id: string
  payload: any
}

type AutomergeFrontToBackMessage = CreateMessage | LoadMessage | LocalChangeMessage 

// Respond to messages from the frontend document
addEventListener("message", (evt: any) => {
  const data: AutomergeFrontToBackMessage = evt.data
  const {id, type, payload } = data

  // TODO: fix the frontend too
  const docId = id

  if (type === "LOAD" || type === "CREATE") {
    backends[id] = Backend.init();

    // broadcast a request for it
    const syncMessage = Backend.syncStart(backends[id])
    const encoded = Backend.encodeSyncMessage(syncMessage)
    sendMessage({docId, source: workerId, encoded: { type: "sync", payload: encoded }})
  }
  
  else if (type === "APPLY_LOCAL_CHANGE") {
    const [newBackend, patch, change] = Backend.applyLocalChange(
      backends[id],
      payload
    );
    backends[id] = newBackend
    postMessage({ id, patch })

    sendMessage({docId, source: workerId, encoded: { type: "change", payload: change}})

    const syncMessage = Backend.encodeSyncMessage(Backend.syncStart(backends[id]))
    sendMessage({docId, source: workerId, encoded: { type: "sync", payload: syncMessage}})
  }
});

// In real life, you'd open a websocket or a webRTC thing, or ... something.
const channel = new BroadcastChannel('automerge-demo-peer-discovery')

interface PeerSyncStatesMap { [peerId: string]: SyncState }
const syncStates: PeerSyncStatesMap = {}

interface GrossEventDataProtocol {
  docId: string,
  source: number,
  target?: number,
  encoded: AutomergeWireMessage
}

channel.addEventListener("message", (evt: any) => {
  const { docId, source, target, encoded } = evt.data as GrossEventDataProtocol
  // TODO: uh, don't broadcast stuff that's just for one peer
  if (target && target != workerId) { /* not for us */ return }

  const decoded = decodeMessage(encoded)
  const backend = backends[docId]
  const syncState = syncStates[source] || { lastSync: [], waitingChanges: [] }

  if (!backend) { console.log(`${docId}? never heard of 'em.`); return }

  const [newBackend, newSyncState, patch, outboundMessages] = receiveMessage(decoded, backend, syncState)

  if (patch) { 
    postMessage({id: docId, patch})
  }

  backends[docId] = newBackend
  syncStates[source] = newSyncState

  outboundMessages.forEach((decoded) => sendMessage({docId, source: workerId, target: source, encoded: encodeMessage(decoded)}))
})

/* a dummy type to prevent accidentally assigning other uint8arrays to this type by accident */
type BinaryChange = Uint8Array & { binaryChange: true }

// the message type should be in the message
interface SyncWireMessage {
  type: 'sync'
  payload: Uint8Array
}

interface ChangeWireMessage {
  type: 'change'
  payload: Uint8Array
}

type AutomergeWireMessage = SyncWireMessage | ChangeWireMessage
type AutomergeDecodedMessage = SyncDecodedMessage | ChangeDecodedMessage

// TODO: What to do with type v. payload
interface SyncDecodedMessage { type: 'sync', message: SyncMessage } 
interface ChangeDecodedMessage { type: 'change', message: BinaryChange }

function decodeMessage(message: AutomergeWireMessage): AutomergeDecodedMessage {
  if (message.type === 'sync') {
    let decoded = Backend.decodeSyncMessage(message.payload)
    return { type: 'sync', message: decoded }
  } else if (message.type === 'change') {
    // Apparently we don't decode these messages?
    // let decoded = Backend.decodeChange(message.payload)
    return { type: 'change', message: message.payload as BinaryChange }
  }
}

function encodeMessage(message: AutomergeDecodedMessage): AutomergeWireMessage {
  if (message.type === 'sync') {
    let payload = Backend.encodeSyncMessage(message.message)
    return { type: 'sync', payload }
  } else if (message.type === 'change') {
    // Apparently we don't decode these messages?
    // let decoded = Backend.decodeChange(message.payload)
    return { type: 'change', payload: message.message as Uint8Array }
  }
}

interface SyncState {
  lastSync: string[]
  waitingChanges: BinaryChange[]
}

// the changes from Backend.syncResponse (et al) could be flavored arrays for type safety

function sendMessage(encodedMessage: GrossEventDataProtocol) {
  console.log(encodedMessage, encodedMessage.encoded)
  channel.postMessage(encodedMessage)
}

function receiveMessage(decodedMessage: AutomergeDecodedMessage, 
                        backend: BackendState,
                        { lastSync, waitingChanges }: SyncState): 
    [BackendState, SyncState, Patch, AutomergeDecodedMessage[] /* next messages */] {
  switch (decodedMessage.type) {
    case 'change':
      // one change at a time
      waitingChanges = [ ...waitingChanges, decodedMessage.message ]
      return [ backend, { lastSync, waitingChanges }, null, [] ]
      break;
    case 'sync':
      const [response, outboundChanges] = Backend.syncResponse(backend, decodedMessage.message)
      
      if (response) {
        const need = Backend.getMissingDeps(backend, waitingChanges, decodedMessage.message.heads)
        if (need.length === 0 && waitingChanges.length > 0) {
          const [updatedBackend, patch] = Backend.applyChanges(backend, waitingChanges)

          backend = updatedBackend
          waitingChanges = []
          
          return [backend, { lastSync, waitingChanges }, patch,
            [
            {type: 'sync', message: response},
            ...outboundChanges.map(c => ({type: 'change', message: c as BinaryChange} as ChangeDecodedMessage))]]
        } else {
          response.need = response.need.concat(need)
          
        return [backend, { lastSync, waitingChanges }, null,
          [
            {type: 'sync', message: response},
            ...outboundChanges.map(c => ({type: 'change', message: c as BinaryChange} as ChangeDecodedMessage))]]
        }
      } else {

        // why do we wait to do this?
        lastSync = Backend.getHeads(backend) // sync complete

        // oh i need to send up the patch somehow
        return [backend, { lastSync, waitingChanges }, null,
          [// clean up
            ...outboundChanges.map(c => ({type: 'change', message: c as BinaryChange} as ChangeDecodedMessage))]]
    }
  
  }
}

