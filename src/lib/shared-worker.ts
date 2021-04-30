import { DB } from './db'
import { throttleByArgument } from './utils'

const THROTTLE_TIME = 3000
const db = new DB()
const saveSnapshotByDocId = throttleByArgument(
  (docId) => db.saveSnapshot(docId),
  THROTTLE_TIME,
  (docId) => docId,
)

const channel = new BroadcastChannel('automerge-demo-peer-discovery')

channel.addEventListener('message', (evt: any) => {
  const { docId } = evt.data
  saveSnapshotByDocId(docId)
})
