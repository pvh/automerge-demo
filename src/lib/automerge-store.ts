import { writable } from 'svelte/store'
import { Frontend, ChangeFn } from 'automerge'

import AutomergeWorker from './worker.ts?worker'

import type { FrontendToBackendMessage, BackendToFrontendMessage } from './types'

const automergeWorker = new AutomergeWorker()

export default function openDoc(docId: string) {
  const { subscribe, update } = writable(Frontend.init())

  function sendWorkerMessage(worker: Worker, message: FrontendToBackendMessage) {
    worker.postMessage(message)
  }

  automergeWorker.onmessage = (event: MessageEvent) => {
    const message: BackendToFrontendMessage = event.data
    // this is wrong -- we should dispatch more deliberately
    if (message.docId === docId) {
      update((doc) => Frontend.applyPatch(doc, message.patch))
    }
  }

  sendWorkerMessage(automergeWorker, {
    type: 'OPEN',
    docId,
  })

  function change(changeFn: ChangeFn<unknown>) {
    update((doc) => {
      const [newDoc, changeData] = Frontend.change(doc, changeFn)
      sendWorkerMessage(automergeWorker, {
        type: 'LOCAL_CHANGE',
        docId,
        payload: changeData,
      })
      return newDoc
    })
  }

  return {
    subscribe,
    change,
  }
}
