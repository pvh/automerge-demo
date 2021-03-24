import * as Backend from "automerge/backend"

// Create a new instance of the document backend for this worker instance
let backend = new Backend.init();

// Respond to messages from the frontend document
addEventListener("message", (evt) => {
  const type = evt.data.type
  const payload = evt.data.payload

  if (type === "APPLY_LOCAL_CHANGE") {
    const [newBackend, patch] = Backend.applyLocalChange(
      backend,
      payload
    );
    backend = newBackend
    postMessage({ result: patch })
  }

  if (type === "APPLY_CHANGES") {
    const [newBackend, patch] = Backend.applyChanges(
      backend,
      payload
    )
    backend = newBackend
    postMessage({ result: patch })
  }
});
