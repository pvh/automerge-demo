
// Helper function for communicating with the worker.
// When sending a message with `messageBackend()`, a Promise will be returned with the response
let msgId = 0;
const messageBackend = (msg) => {
  // Grab the latest message id
  const id = msgId;
  msgId++;
  // Pass the message to the worker with the message id
  worker.postMessage({ ...msg, id });
  // Listen for a message back from the worker with the corresponding id. Return the data from that message.
  return new Promise((resolve) => {
    const handler = (evt) => {
      if (evt.data.id === id) {
        resolve(evt.data);
      }
      worker.removeEventListener("message", handler);
    };
    worker.addEventListener("message", handler);
  });
};

// Initialiaze a frontend doc
let doc: any = Automerge.Frontend.init();

// Ask web worker to load the serialized doc into the backend state; then sync with frontend and update UI
messageBackend({ type: "LOAD_DOC" /* we only support one doc */ }).then((data: { result: any }) => {
  let newDoc: any = Automerge.Frontend.applyPatch(doc, data.result);
  doc = newDoc;
  updateCounter(doc.count);
});

// Helper function for changing the doc locally, passing change to frontend, and keeping them synced
async function changeDoc(changeFn) {
  const [newDoc, change] = Automerge.Frontend.change(doc, changeFn);
  let latestDoc = newDoc;
  if (change) {
    const data: any = await messageBackend({
      type: "APPLY_LOCAL_CHANGE",
      payload: change,
    });
    latestDoc = Automerge.Frontend.applyPatch(doc, data.result);
  }
  doc = latestDoc;
  updateCounter(doc.count);
}

// Update the counter in the DOM
function updateCounter(count) {
  document.getElementById("count").innerHTML = count;
}

// Button event listeners for incrementing/decrementing the count
document.getElementById("dec").addEventListener("click", () => {
  changeDoc((d) => {
    d.count.decrement();
  });
});

document.getElementById("inc").addEventListener("click", () => {
  changeDoc((d) => {
    d.count.increment();
  });
});