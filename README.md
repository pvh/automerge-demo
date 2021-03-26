# Svelte + TS + Vite + Automerge

This template should help get you started developing with Automerge, Svelte and TypeScript in Vite.

## Architecture

Svelte App --instantiates--> automerge-store --postMessage--> worker process -- BroadcastChannel --> other tabs running this demo 

## TODO

 * Persist documents to IndexedDB.
 * Rethink connection system in terms of peers and not broadcasts
 * How should someone else replace BroadcastChannel with an actual networking solution?
 * How should the Svelte code relate to the Automerge store?
 * Should we bother fixing HMR state preservation? (see hmr-store.js)
 * Improve worker/renderer reply communication.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode).
