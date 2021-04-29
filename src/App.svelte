<script lang="ts">
  import openDoc from './lib/automerge-store'
  import Counter from './lib/Counter.svelte'
  
  interface CounterDoc { count: number }
  let docs = {}
  const addDoc = () => {
    const doc = openDoc(docName)
    doc.change((d: CounterDoc) => d.count = 0)
    docs = {...docs, [docName]: doc}
  }

  let docName = "counter"
</script>

<main>
  <h1>Automerge Demo</h1>

  <input bind:value={docName}/>
  <button on:click={addDoc}>Open</button>
  {#each Object.entries(docs) as [id, doc] }
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

  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4rem;
    font-weight: 100;
    line-height: 1.1;
    margin: 2rem auto;
    max-width: 14rem;
  }

  @media (min-width: 480px) {
    h1 {
      max-width: none;
    }
  }
</style>
