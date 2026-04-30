# Sorskoot BabylonJS Engine — Copilot Instructions

## Project Overview

`@sorskoot/babylon-kit` is a lightweight, modular game engine/tools layer built on top
of [Babylon.js](https://www.babylonjs.com/). It provides the structural scaffolding needed to build browser-based 3D
games and WebXR experiences:

- **Game loop & scene management** — `Game`, `SceneManager`, `GameScene`
- **Entity system** — `GameObject` (abstract base with lifecycle hooks)
- **Asset pipeline** — `AssetManager` (async `.glb` loading, GPU instancing, thin instances)
- **Subsystems** — `AnimationManager`, `ParticleManager`, `UIManager`, `InteractionManager`, `XRManager`, `InputManager`
- **GLTF extension** — Custom `SORSKOOT_BJS_ENGINE` loader extension; Blender add-on exports per-node metadata
- **Metadata repository** — Runtime index of Sorskoot GLTF node metadata (`MetadataRepository`)

The package is published as an ES module (`"type": "module"`) and is consumed by game projects as a peer dependency
alongside `@babylonjs/core`, `@babylonjs/gui`, and `@babylonjs/loaders`.

---
## General Guidelines

- We use US English spelling and grammar in all code and documentation.
- Do not include emojis in code or documentation unless explicitly asked.

---

## Documentation Requirements

### TSDoc (inline API documentation)

Every exported class, interface, enum, type alias, function, method, and property **must** have a TSDoc comment block (
`/** … */`). Follow these rules:

- Use `@param name - Description` for every parameter (note the dash separator).
- Use `@returns` for non-void return values.
- Use `@throws` when a method throws a documented error.
- Use `@example` blocks with fenced ` ```ts ` code to show realistic usage.
- Reference other exported symbols with `{@link SymbolName}`.
- Mark internal/private helpers with `/** @internal */`.
- Short one-liner properties may use a single-line doc comment (`/** Description. */`).

### Markdown documentation (`docs/`)

Every major subsystem should have a corresponding `.md` file in `docs/`. Each file must include:

1. **A brief introduction** — what the subsystem does and when to use it.
2. **API table** — key methods/properties in a Markdown table.
3. **At least one realistic code example** in a fenced ` ```ts ` block.
4. **Links** to related subsystems where relevant.

The `typedoc` tool (`npm run docs`) generates HTML from TSDoc into `docs-api/`. Do not edit `docs-api/` by hand.

### Other

If parts of the code require a commet header use the following format:

```ts
// -={ Input bindings }=──────────────────────────────────────────────────._
Code('Input binding A');
Code('Input binding B');
Code('Input binding C');
```

---

## TypeScript Style Guide

### General

- **Target / module**: `ESNext` modules (`"type": "module"` in `package.json`). Use standard ES import/export — no
  CommonJS `require`.
- **Strict mode**: Assume `strict: true`. Avoid `any`; use `unknown` where the type is truly unknown and narrow it.
- **Access modifiers**: Always declare `public`, `protected`, or `private` explicitly on class members.
- **`readonly`**: Prefer `readonly` on private fields that are never reassigned after construction (use
  `private readonly`).
- Be explicit in code.

### Braces / Brackets

*Always* use curly braces, For multi-line blocks and single-line blocks. For example:

```ts
if (condition) {
    doSomething();
}
```

### Naming

| Kind                 | Convention                                                               | Example                              |
|----------------------|--------------------------------------------------------------------------|--------------------------------------|
| Classes / Interfaces | `PascalCase`                                                             | `AssetManager`, `InstantiateOptions` |
| Enums & enum members | `PascalCase`                                                             | `SorskootEntryTypes.Generic`         |
| Functions / methods  | `camelCase`                                                              | `loadModel`, `addGameObject`         |
| Private fields       | `camelCase` with leading `_` only for backing properties                 | `_enabled` (backing `enabled`)       |
| Local variables      | `camelCase`                                                              | `const container = …`                |
| Constants            | `camelCase` (module-level) or `UPPER_SNAKE_CASE` (true global constants) | `metadataRepository`                 |
| Type parameters      | Single uppercase letter or `PascalCase` noun                             | `T`, `TResult`                       |

### Classes

- Prefer **abstract base classes** (`abstract class`) over interfaces when shared behaviour is needed (`GameScene`,
  `GameObject`).
- Order members: `private` fields → `protected` fields → `public` fields → constructor → getters/setters → `public`
  methods → `protected` methods → `private` methods → `abstract` members.
- Use `Map<K, V>` and `Set<T>` over plain objects for collections.
- Provide a `dispose()` method on every class that holds BabylonJS resources; call it when tearing down.

### Async

- Use `async / await` for all async operations; avoid raw `.then()` chains.
- `setup()` on `GameScene` is always `async` and returns `Promise<void>`.
- `loadModel` on `AssetManager` is always `async` and returns `Promise<AssetContainer>`.

### Imports

- Import BabylonJS types from their specific sub-packages where possible (e.g. `@babylonjs/core/Loading/sceneLoader`).
- Use `import type { … }` for type-only imports to keep the compiled output clean.
- Group imports: external packages first, then internal engine modules, separated by a blank line.

```ts
import {Engine, Scene} from '@babylonjs/core';
import type {XRManagerOptions} from './XRManager';

import {GameObject} from './GameObject';
import {InteractionManager} from './InteractionManager';
```

### Error handling

- Throw descriptive `Error` objects with context: `throw new Error(\`Model '${key}' not loaded. Call loadModel()
  first.\`);`
- Document thrown errors in TSDoc with `@throws`.

### Null / undefined

- Prefer `null` (not `undefined`) for "intentionally absent" values that are part of the public API (e.g.
  `node: TransformNode | null = null`).
- Use optional chaining (`?.`) and nullish coalescing (`??`) rather than explicit `if (x !== null)` guards where it
  keeps code concise.

---

## Architecture Notes for Copilot

- `Game` is the single entry point; never instantiate managers directly in consumer code — go through
  `game.assetManager`, `game.sceneManager`, etc.
- `GameScene` subclasses implement `setup(): Promise<void>`. Scene-level per-frame logic goes in
  `update(deltaTime: number)` (override allowed).
- `GameObject` subclasses implement `onStart()` and `onUpdate(deltaTime: number)`. Do **not** start a render loop inside
  a `GameObject`.
- The GLTF extension key is `SORSKOOT_BJS_ENGINE`. Per-node metadata is accessible at `mesh.metadata.sorskoot` and
  indexable via the `metadataRepository` singleton.
- Particle systems are JSON-driven; do not hard-code particle config in TypeScript source.
- WebXR is opt-in: call `await this.initializeXR(options)` inside `GameScene.setup()` after cameras and floor meshes are
  ready.
