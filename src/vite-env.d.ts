/// <reference types="vite/client" />

// Ambient declarations for side-effect asset imports (per-sim CSS, etc.).
// Without these, strict setups (noUncheckedSideEffectImports / editors that
// resolve `import "x.css"`) raise TS2307/TS2882 on every `import "./foo.css"`.
// `vite/client` already covers these at build time; this makes `tsc` and IDEs
// agree regardless of that flag. Explicit fallback kept in case vite/client
// types are pruned by `types: []`.
declare module "*.css";
