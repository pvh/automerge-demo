import { Backend, BackendState, PeerState } from "automerge"
import type { FrontendToBackendMessage, BackendToFrontendMessage, GrossEventDataProtocol } from "./types"

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
    const ePeerState: PeerState = Backend.emptyPeerState()
    const [peerState, syncMessage] = Backend.generateSyncMessage(backends[docId], ePeerState)
    sendMessage({docId, source: workerId, syncMessage})
  }
});

// In real life, you'd open a websocket or a webRTC thing, or ... something.
export const channel = new BroadcastChannel('automerge-demo-peer-discovery')

// the changes from Backend.syncResponse (et al) could be flavored arrays for type safety
export function sendMessage(encodedMessage: GrossEventDataProtocol) {
  channel.postMessage(encodedMessage);
}

channel.addEventListener("message", (evt: any) => {
  const { docId, source: peer, target, syncMessage } = evt.data as GrossEventDataProtocol
  // TODO
  if (target && target != workerId) { return /* ain't for us */ }

  const [nextBackend, nextPeerState, patch] = Backend.receiveSyncMessage(
    backends[docId], 
    syncMessage,
    peerStates[peer])
  backends[docId] = nextBackend
  peerStates[peer] = nextPeerState

  peers.forEach((peer) => {
    let nextMessage
    [peerStates[peer], nextMessage] = Backend.generateSyncMessage(backends[docId], peerStates[peer])
    if (nextMessage) { sendMessage({docId, source: workerId, target: peer, syncMessage: nextMessage }) }
  })

  // TODO: batch these until synced
  if (patch) { 
    sendMessageToRenderer({docId, patch})
  }
})

/* wait... which document?
function onConnect(peer) {
  const [peerState, syncMessage] = generateSyncMessage(backends[], peerStates[peer])
  peer.send(syncMessage)
}
*/

type Peer = number
const peers: Peer[] = []
// what is a network
