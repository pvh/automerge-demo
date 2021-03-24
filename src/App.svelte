<script lang="ts">
  import logo from './assets/svelte.png'
  import Counter from './lib/Counter.svelte'

  import { createDoc, loadDoc } from './lib/automerge-store'
  
  let loadDocId = "counter-0"

  let docs = [] 
  const addDoc = () => {
    const id = loadDocId
    const doc = createDoc(id)
    doc.change((d) => d.count = 0)
    docs = [...docs, {id, doc}]

    loadDocId += 1
  }

  const fetchDoc = () => {
    docs = [...docs, {id: loadDocId, doc: loadDoc("counter-" + docs.length)}]
    loadDocId += 1
  }
  
</script>

<main>
  <img src={logo} alt="Svelte Logo" />
  <h1>Automerge Demo</h1>

  <input bind:value={loadDocId}/>
  <button on:click={addDoc}>Create</button>
  <button on:click={fetchDoc}>Load</button>
  {#each docs as {id, doc} }
    <Counter {id} {doc}/>
  {/each}
</main>

<style>
  :root {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  main {
    text-align: center;
    padding: 1em;
    margin: 0 auto;
  }

  img {
    height: 16rem;
    width: 16rem;
  }

  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4rem;
    font-weight: 100;
    line-height: 1.1;
    margin: 2rem auto;
    max-width: 14rem;
  }

  p {
    max-width: 14rem;
    margin: 1rem auto;
    line-height: 1.35;
  }

  @media (min-width: 480px) {
    h1 {
      max-width: none;
    }

    p {
      max-width: none;
    }
  }
</style>
