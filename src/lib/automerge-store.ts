import Frontend from 'automerge/frontend'
import MyWorker from './worker.ts?worker'
const worker = new MyWorker()

import { writable } from 'svelte/store'

export function createDoc() { 
  const { subscribe, update } = writable(Frontend.init())

  worker.onmessage = (e) => {
    update(doc => Frontend.applyPatch(doc, e.data.result))
  }

  worker.postMessage({ type: "INIT" })

  function change(changeFn) {
    update(doc => {
      const [newDoc, change] = Frontend.change(doc, changeFn);
      worker.postMessage({
        type: "APPLY_LOCAL_CHANGE",
        payload: change,
      });
      return newDoc
    })
  }

	return {
		subscribe,
		change
	};
}
