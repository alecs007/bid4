// Next's App Router runs its own React build, which ships `<ViewTransition>`
// ahead of the stable types in @types/react. Pull in the canary declarations so
// the page-transition components type-check.
/// <reference types="react/canary" />
