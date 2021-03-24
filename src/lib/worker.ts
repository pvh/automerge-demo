import * as Backend from "automerge/backend"
import { encodeChange } from "automerge/backend/columnar"

// ERRRRR
const workerId = Math.round(Math.random() * 1000)

const backends = {}

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

interface ApplyChangesMessage {
  type: "APPLY_CHANGES"
  id: string
  payload: any
}

type AutomergeFrontToBackMessage = CreateMessage | LoadMessage | LocalChangeMessage 

// Respond to messages from the frontend document
addEventListener("message", (evt: any) => {
  const data: AutomergeFrontToBackMessage = evt.data
  const {id, type, payload } = data


  if (type === "CREATE") {
    backends[id] = new Backend.init(payload);
  }

  if (type === "LOAD") {
    backends[id] = new Backend.init();

    // broadcast a request for it
    const payload = Backend.encodeSyncMessage(Backend.syncStart(backends[id]))
    channel.postMessage({type: "SYNC", id, source: workerId, payload})
  }
  
  else if (type === "APPLY_LOCAL_CHANGE") {
    const payload = data.payload
    const [newBackend, patch] = Backend.applyLocalChange(
      backends[id],
      payload
    );
    backends[id] = newBackend
    postMessage({ id, patch })
    const changes = Backend.getLastLocalChange(newBackend)
    channel.postMessage({type: "CHANGES", id, source: workerId, changes})
  }
});

// In real life, you'd open a websocket or a webRTC thing, or ... something.
const channel = new BroadcastChannel('automerge-demo-peer-discovery')

channel.addEventListener("message", (evt: any) => {
  const { type, id, source, target, payload, changes } = evt.data
  if (type == "SYNC") {
    const [syncMessage, changes] = Backend.syncResponse(backends[id], Backend.decodeSyncMessage(payload))
    channel.postMessage({type: "CHANGES", id, source: workerId, target: source, changes})
  }
  else if (type === "CHANGES") {
    if (target && target !== workerId) { return }
    if (!backends[id]) { return }
    const [newBackend, patch] = Backend.applyChanges(backends[id], changes)
    backends[id] = newBackend
    postMessage({ id, patch })
  }
})
