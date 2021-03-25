import { Backend, Change, SyncMessage } from "automerge"
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


  if (type === "CREATE") {
    backends[id] = Backend.init();
  }

  if (type === "LOAD") {
    backends[id] = Backend.init();

    // broadcast a request for it
    const syncMessage = Backend.syncStart(backends[id])
    const encoded = Backend.encodeSyncMessage(syncMessage)
    channel.postMessage({type: "sync", id, source: workerId, encoded})
  }
  
  else if (type === "APPLY_LOCAL_CHANGE") {
    const payload = data.payload
    const [newBackend, patch, change] = Backend.applyLocalChange(
      backends[id],
      payload
    );
    backends[id] = newBackend
    postMessage({ id, patch })

    channel.postMessage({type: "change", id, source: workerId, change})

    const syncMessage = Backend.encodeSyncMessage(Backend.syncStart(backends[id]))
    channel.postMessage({type: "sync", id, source: workerId, encoded: syncMessage})
  }
});

// In real life, you'd open a websocket or a webRTC thing, or ... something.
const channel = new BroadcastChannel('automerge-demo-peer-discovery')

channel.addEventListener("message", (evt: any) => {
  const { type, id, source, target, encoded, change } = evt.data
  if (type == "sync") {
    if (!backends[id]) { 
      console.log(`Received SYNC request for a document we don't have: ${id}`)
      return
    }
    const [outBoundSyncMessage, changes] = Backend.syncResponse(backends[id], Backend.decodeSyncMessage(encoded))
    changes.forEach((change) => 
      channel.postMessage({type: "change", id, source: workerId, target: source, change}))
    
    if (outBoundSyncMessage) {
      const encoded = Backend.encodeSyncMessage(outBoundSyncMessage)
      channel.postMessage({type: "sync", id, source: workerId, encoded})
    }
  }

  else if (type === "change") {
    if (target && target !== workerId) { return }
    if (!backends[id]) { return }
    const [newBackend, patch] = Backend.applyChanges(backends[id], [change])
    backends[id] = newBackend
    postMessage({ id, patch })
  }
})

interface AutomergeSyncMessage {
  type: 'sync'
  payload: Uint8Array
}

interface AutomergeChangesMessage {
  type: 'change'
  payload: Uint8Array
}

type AutomergeWireMessage = AutomergeSyncMessage | AutomergeChangesMessage

type AutomergeDecodedMessage = SyncDecodedMessage | ChangeDecodedMessage
interface SyncDecodedMessage { type: 'sync', message: SyncMessage } 
interface ChangeDecodedMessage { type: 'change', message: BinaryChange }


// TODO: What to do with type v. payload
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

interface SyncState {
  lastSync: string[]
  waitingChanges: BinaryChange[]
}

/* a dummy type to prevent accidentally assigning other uint8arrays to this type by accident */
type BinaryChange = Uint8Array & { binaryChange: true }

// the changes from Backend.syncResponse (et al) could be flavored arrays for type safety

function receiveMessage(decodedMessage: AutomergeDecodedMessage, 
                        backend: BackendState,
                        { lastSync, waitingChanges }: SyncState): 
    [BackendState, SyncState, AutomergeDecodedMessage[] /* next message */] {
  switch (decodedMessage.type) {
    case 'change':
      // one change at a time
      waitingChanges = [ ...waitingChanges, decodedMessage.message ]
      return [ backend, { lastSync, waitingChanges }, [] ]
      break;
    case 'sync':
      const [response, outboundChanges] = Backend.syncResponse(backend, decodedMessage.message)
      
      if (response) {
        const need = Backend.getMissingDeps(backend, waitingChanges,
          decodedMessage.message.heads)
        if (need.length === 0 && waitingChanges.length > 0) {
          const updatedBackend = Backend.applyChanges(backend, waitingChanges)
          backend = updatedBackend
          waitingChanges = []
        } else {
          response.need = response.need.concat(need)
        }
      } else {
        // why do we wait to do this?
        lastSync = Backend.getHeads(backend) // sync complete
      }
      return [backend, { lastSync, waitingChanges }, 
        [
          {type: 'sync', message: response},
          ...outboundChanges.map(c => ({type: 'change', message: c as BinaryChange} as ChangeDecodedMessage))]]
  }
}

