import { writable } from 'svelte/store'
import { Frontend, ChangeFn } from 'automerge'

import { send, addListener } from './worker';
import PersistenceWorker from './shared-worker.ts?worker'

import type { FrontendToBackendMessage, BackendToFrontendMessage } from './types'

interface CounterDoc {
  count: number;
}

const urlParams = new URLSearchParams(window.location.search)
const shouldStartPersistenceWorker = urlParams.get('persistence') === 'true'
if (shouldStartPersistenceWorker) {
  console.log('starting persistence worker')
  const persistenceWorker = new PersistenceWorker()
}

export default function openDoc(docId: string, onOpen: () => any) {
  const { subscribe, update } = writable(Frontend.init<CounterDoc>())
  let hasOpened = false

  function sendWorkerMessage(
    message: FrontendToBackendMessage,
  ) {
    send(message)
  }

  function change(changeFn: ChangeFn<CounterDoc>) {
    update((doc) => {
      const [newDoc, changeData] = Frontend.change(doc, changeFn)
      sendWorkerMessage({
        type: 'LOCAL_CHANGE',
        docId,
        payload: changeData,
      })
      return newDoc
    })
  }

  // we should add a single event listener and dispatch to it
  addListener((message: BackendToFrontendMessage) => {

    if (message.docId === docId) {
      if (message.isNewDoc) {
        change((doc) => { doc.count = 0 })
      } else update((doc) => Frontend.applyPatch(doc, message.patch))

      if (!hasOpened) {
        hasOpened = true
        onOpen()
      }
    }
  })


  sendWorkerMessage({
    type: 'OPEN',
    docId,
  })

  return {
    subscribe,
    change,
  }
}
