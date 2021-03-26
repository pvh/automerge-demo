import { Backend, Patch } from "automerge";
import type { BackendState } from "automerge";
import type { AutomergeWireMessage, SyncState, GrossEventDataProtocol, AutomergeDecodedMessage, BinaryChange } from "./types"

/* i would suggest we fold the .type into the binary of the message */

export function decodeMessage(message: AutomergeWireMessage): AutomergeDecodedMessage {
  if (message.type === 'sync') {
    let decoded = Backend.decodeSyncMessage(message.payload);
    return { type: 'sync', message: decoded };
  } else if (message.type === 'change') {
    // Apparently we don't decode these messages?
    // let decoded = Backend.decodeChange(message.payload)
    return { type: 'change', message: message.payload as BinaryChange };
  }
}
export function encodeMessage(message: AutomergeDecodedMessage): AutomergeWireMessage {
  if (message.type === 'sync') {
    let payload = Backend.encodeSyncMessage(message.message);
    return { type: 'sync', payload };
  } else if (message.type === 'change') {
    // Apparently we don't decode these messages?
    // let decoded = Backend.decodeChange(message.payload)
    return { type: 'change', payload: message.message as Uint8Array };
  }
}

export function receiveMessage(decodedMessage: AutomergeDecodedMessage,
  backend: BackendState,
  { lastSync, waitingChanges }: SyncState): [BackendState, SyncState, Patch, AutomergeDecodedMessage[] /* next messages */] {

  let patch = null
  let outboundMessages: AutomergeDecodedMessage[] = []
  
  switch (decodedMessage.type) {
    case 'change':
      // collect changes, waiting for a sync (this feels wrong to pvh)
      waitingChanges = [...waitingChanges, decodedMessage.message];
      break;
    case 'sync':
      const [response, outboundChanges] = Backend.syncResponse(backend, decodedMessage.message);

      if (response) {
        // if we can't apply these changes yet, hang on to them and request the gaps
        const need = Backend.getMissingDeps(backend, waitingChanges, decodedMessage.message.heads);
        
        if (need.length !== 0) {
          response.need = [...response.need, ...need];
        }
        else if (waitingChanges.length > 0) {
          [backend, patch] = Backend.applyChanges(backend, waitingChanges);
          waitingChanges = [];
        }

        outboundMessages = [
          { type: 'sync', message: response },
          ...outboundChanges.map(c => ({ type: 'change', message: c as BinaryChange } as AutomergeDecodedMessage))
        ];
      } else {
        lastSync = Backend.getHeads(backend); // sync complete
      }
  }
  return [backend, { lastSync, waitingChanges }, patch, outboundMessages]
}
