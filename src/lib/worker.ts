import * as Backend from "automerge/backend"

// This class will handle keeping track of the backend state
class DocBackend {
  backend: Backend
  constructor() {
    this.backend = Backend.init();
  }

  // Loading a serialized document
  load(serializedDoc) {
    const [state] = Backend.load(this.backend, serializedDoc);
    const patch = Backend.getPatch(state);
    this.backend = state;
    return patch;
  }

  patch() {
    const patch = Backend.getPatch(this.backend);
    return patch
  }

  // Apply changes from the front end
  applyLocalChange(change) {
    try {
      const [newState, patch] = Backend.applyLocalChange(
        this.backend,
        change
      );
      this.backend = newState;
      return patch;
    } catch (err) {
      console.warn("Couldn't apply local change", err);
      return null;
    }
  }

  // Applying changes from remote documents
  applyChanges(changes) {
    const [newState, patch] = Backend.applyChanges(
      this.backend,
      changes
    );
    this.backend = newState;
    return patch;
  }
}

// Create a new instance of the document backend for this worker instance
const docBackend = new DocBackend();

// Respond to messages from the frontend document
addEventListener("message", (evt) => {
  const type = evt.data.type;
  const payload = evt.data.payload;
  const id = evt.data.id;

  if (type === "INIT") {
    const patch = docBackend.patch();
    (self as Worker).postMessage({ result: patch });
  }

  if (type === "APPLY_LOCAL_CHANGE") {
    const patch = docBackend.applyLocalChange(payload);
    (self as Worker).postMessage({ result: patch });
  }

  if (type === "APPLY_CHANGES") {
    const patch = docBackend.applyChanges(payload);
    (self as Worker).postMessage({ result: patch });
  }
});
