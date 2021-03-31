import { Backend, BackendState } from "automerge"
import type { FrontendToBackendMessage, BackendToFrontendMessage, GrossEventDataProtocol } from "./types"
import { PeerState, SyncMessageWithChanges, generateSyncMessage, receiveSyncMessage, emptyPeerState } from "./protocol"
import { decodeSyncMessage } from "automerge/dist/automerge"

// ERRRRR
const workerId = Math.round(Math.random() * 1000)

const backends: { [docId: string]: BackendState } = {}
const peerStates: { [peerId: string]: PeerState } = {} 
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

    // broadcast a request for it. this uses an empty peer state.
    // broadcast: HOW DO
    const ePeerState: PeerState = emptyPeerState()
    const [peerState, syncMessage] = generateSyncMessage(backends[docId], ePeerState)
    const encoded = Backend.encodeSyncMessage(syncMessage)
    sendMessage({docId, source: workerId, encoded})
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
  // TODO

  onSyncMessage(source.toString(), docId, encoded)

  // TODO: batch these until synced
  if (patch) { 
    sendMessageToRenderer({docId, patch})
  }

  backends[docId] = newBackend
  peerStates[source] = newPeerState

  outboundMessages.forEach((decoded) => sendMessage({docId, source: workerId, target: source, encoded: encodeMessage(decoded)}))
})

/* wait... which document?
function onConnect(peer) {
  const [peerState, syncMessage] = generateSyncMessage(backends[], peerStates[peer])
  peer.send(syncMessage)
}
*/

function onLocalChange(docId: string, change: Change) {
  peers.forEach((peer) => {
    const [nextPeerState, nextMessage] = generateSyncMessage(backends[docId], peerStates[peer], change)
    peerStates[peer] = nextPeerState
    network.send(peer, Backend.encodeSyncMessage(nextMessage))
  }
}

type Peer = string
const peers: Peer[] = []
// what is a network

const network: any = null /*????*/
network.onSyncMessage = onSyncMessage 

function onSyncMessage(peer: Peer, docId: string, message: SyncMessageWithChanges) {
  const [nextBackend, nextPeerState] = receiveSyncMessage(
    backends[docId], 
    message,
    peerStates[peer])
  backends[docId] = nextBackend
  peerStates[peer] = nextPeerState

  peers.forEach((peer) => {
    let nextMessage
    [peerStates[peer], nextMessage] = generateSyncMessage(backends[docId], peerStates[peer])
    if (nextMessage) { network.send(peer, nextMessage) }
  })
}
