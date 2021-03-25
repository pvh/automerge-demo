import { Frontend, ChangeFn } from 'automerge'

import MyWorker from './worker.ts?worker'
const worker = new MyWorker()

import { writable } from 'svelte/store'

export function createDoc(id: string, initialValue?: any) { 
  const { subscribe, update } = writable(Frontend.init())

  worker.postMessage({
    type: "CREATE",
    id,
    payload: initialValue
  });

  worker.onmessage = (e) => {
    // this is wrong -- we should dispatch more deliberately
    if (e.data.id === id) {
      update(doc => Frontend.applyPatch(doc, e.data.patch))
    }
  }

  function change(changeFn: ChangeFn<unknown>) {
    update(doc => {
      const [newDoc, change] = Frontend.change(doc, changeFn);
      worker.postMessage({
        type: "APPLY_LOCAL_CHANGE",
        id,
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

/* whoops, clean this up */
export function loadDoc(id: string) { 
  const { subscribe, update } = writable(Frontend.init())

  worker.postMessage({
    type: "LOAD",
    id
  });

  worker.onmessage = (e) => {
    // this is wrong -- we should dispatch more deliberately
    if (e.data.id === id) {
      update(doc => Frontend.applyPatch(doc, e.data.patch))
    }
  }

  function change(changeFn: ChangeFn<unknown>) {
    update(doc => {
      const [newDoc, change] = Frontend.change(doc, changeFn);
      worker.postMessage({
        type: "APPLY_LOCAL_CHANGE",
        id,
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
