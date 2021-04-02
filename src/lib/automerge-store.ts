import { writable } from "svelte/store";
import { Frontend, ChangeFn } from "automerge";

import AutomergeWorker from "./worker.ts?worker";
import PersistenceWorker from "./shared-worker.ts?worker";

import type {
  FrontendToBackendMessage,
  BackendToFrontendMessage,
} from "./types";

interface CounterDoc {
  count: number;
}

const worker = new AutomergeWorker();

// const urlParams = new URLSearchParams(window.location.search);
// const shouldStartPersistenceWorker = urlParams.get("persistence") === "true";
// if (shouldStartPersistenceWorker) {
//   const persistenceWorker = new PersistenceWorker();
// }

export function openDoc(docId: string, onOpen: () => any) {
  const { subscribe, update } = writable(Frontend.init<CounterDoc>());
  let hasOpened = false;

  function sendWorkerMessage(
    worker: Worker,
    message: FrontendToBackendMessage
  ) {
    worker.postMessage(message);
  }

  worker.onmessage = (event: MessageEvent) => {
    const message: BackendToFrontendMessage = event.data;
    // this is wrong -- we should dispatch more deliberately
    if (message.docId === docId) {
      if (message.isNewDoc) {
        change((doc) => (doc.count = 0));
      } else update((doc) => Frontend.applyPatch(doc, message.patch));

      if (!hasOpened) {
        hasOpened = true;
        onOpen();
      }
    }
  };

  sendWorkerMessage(worker, {
    type: "OPEN",
    docId,
  });

  function change(changeFn: ChangeFn<CounterDoc>) {
    update((doc) => {
      const [newDoc, changeData] = Frontend.change(doc, changeFn);
      sendWorkerMessage(worker, {
        type: "LOCAL_CHANGE",
        docId,
        payload: changeData,
      });
      return newDoc;
    });
  }

  return {
    subscribe,
    change,
  };
}
