// This needs to go back into automerge

/**
 * Call this function when a sync message is received from another node. The `message` argument
 * needs to already have been decoded using `decodeSyncMessage()`. This function determines the
 * changes that we need to send to the other node in response. Returns an array of changes (as
 * byte arrays).
 */
export function getChangesToSend(backend: , have: Hash[], need: Hash[]) {
  const opSet = backend.get('opSet')
  if (have.length === 0) {
    return need.map(hash => OpSet.getChangeByHash(opSet, hash))
  }

  let lastSyncHashes = {}, bloomFilters = []
  for (let have of message.have) {
    for (let hash of have.lastSync) lastSyncHashes[hash] = true
    bloomFilters.push(new BloomFilter(have.bloom))
  }

  // Get all changes that were added since the last sync
  const changes = OpSet.getMissingChanges(opSet, List(Object.keys(lastSyncHashes)))
    .map(change => decodeChangeMeta(change, true))

  let changeHashes = {}, dependents = {}, hashesToSend = {}
  for (let change of changes) {
    changeHashes[change.hash] = true

    // For each change, make a list of changes that depend on it
    for (let dep of change.deps) {
      if (!dependents[dep]) dependents[dep] = []
      dependents[dep].push(change.hash)
    }

    // Exclude any change hashes contained in one or more Bloom filters
    if (bloomFilters.every(bloom => !bloom.containsHash(change.hash))) {
      hashesToSend[change.hash] = true
    }
  }

  // Include any changes that depend on a Bloom-negative change
  let stack = Object.keys(hashesToSend)
  while (stack.length > 0) {
    const hash = stack.pop()
    if (dependents[hash]) {
      for (let dep of dependents[hash]) {
        if (!hashesToSend[dep]) {
          hashesToSend[dep] = true
          stack.push(dep)
        }
      }
    }
  }

  // Include any explicitly requested changes
  let changesToSend = []
  for (let hash of message.need) {
    hashesToSend[hash] = true
    if (!changeHashes[hash]) { // Change is not among those returned by getMissingChanges()?
      const change = OpSet.getChangeByHash(opSet, hash)
      if (change) changesToSend.push(change)
    }
  }

  // Return changes in the order they were returned by getMissingChanges()
  for (let change of changes) {
    if (hashesToSend[change.hash]) changesToSend.push(change.change)
  }
  return changesToSend
}
