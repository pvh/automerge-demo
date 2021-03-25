<script lang="ts">
  import logo from './assets/svelte.png'
  import Counter from './lib/Counter.svelte'

  import { createOrLoadDoc } from './lib/automerge-store'
  
  interface CounterDoc { count: number }

  let docName = "counter"

  let docs = {}
  const addDoc = () => {
    const doc = createOrLoadDoc(docName)
    doc.change((d: CounterDoc) => d.count = 0)
    docs = {...docs, [docName]: doc}
  }

</script>

<main>
  <img src={logo} alt="Svelte Logo" />
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
