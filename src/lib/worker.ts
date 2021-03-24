import * as Backend from "automerge/backend"

const backends = {}

interface CreateMessage {
  type: "CREATE"
  id: string
  payload: any
}

interface LocalChangeMessage {
  type: "APPLY_LOCAL_CHANGE"
  id: string
  payload: any
}

interface ApplyChangesMessage {
  type: "APPLY_CHANGES"
  id: string
  payload: any
}

type AutomergeFrontToBackMessage = CreateMessage | LocalChangeMessage | ApplyChangesMessage 

// Respond to messages from the frontend document
addEventListener("message", (evt: any) => {
  const data: AutomergeFrontToBackMessage = evt.data
  const {id, type, payload } = data


  if (type === "CREATE") {
    backends[id] = new Backend.init(payload);
  }
  else if (type === "APPLY_LOCAL_CHANGE") {
    const payload = data.payload
    const [newBackend, patch] = Backend.applyLocalChange(
      backends[id],
      payload
    );
    backends[id] = newBackend
    postMessage({ patch })
  }
  else if (data.type == "APPLY_CHANGES") {
    const payload = data.payload
    const [newBackend, patch] = Backend.applyChanges(
      backends[id],
      payload
    )
    backends[id] = newBackend
    postMessage({ id, patch })
  }
});
