# Portfolio

This context defines the language for the professional work showcase and the material presented to visitors.

## Work

**Portfolio**:
A curated public presentation of the site owner's professional work and experience.
_Avoid_: Website, résumé

**Project**:
A distinct body of work that can be presented as part of the Portfolio. A Project is not inherently a client engagement, product, or case study.
_Avoid_: Case study, product, client work

**Content Page**:
One published piece in the Portfolio, belonging to a Section and reachable at its own address. A Project is the kind of Content Page in the Projects section.
_Avoid_: Post, article, entry

**Section**:
A named grouping of Content Pages whose name also names their address space (Projects, Writing). A Section exists as soon as it has pages; with none it does not.
_Avoid_: Category, tag, collection

## Pointer interaction

**PointerSnare**:
The overlay that trails the visitor's pointer and dresses up around the Interactive Element under it.
Mounted client-only, on devices with a fine pointer; never present on touch-only devices or the server.
_Avoid_: Lasso, custom cursor, hover ring

**Snare**:
The state in which the PointerSnare has latched onto an Interactive Element; the PointerSnare is otherwise said to be free.
_Avoid_: Snap, capture, latch

**Interactive Element**:
An element the PointerSnare surrounds and highlights — links and buttons by default; any other element joins by being marked snare-worthy (`data-snare`), unless it sits inside a Snare Group.
_Avoid_: Control, actionable, target

**Snare Group**:
An element marked group-worthy (`data-snare-group`) that the PointerSnare wraps as a single Snare for its whole cluster; eligible elements inside it never snare on their own.
_Avoid_: Cluster, container, region

**Cursor Dot**:
The dot that stands in for the native cursor while the PointerSnare is free.
_Avoid_: Fake cursor, reticle

**Tick**:
The full-contrast mark on the PointerSnare's border where the visitor's cursor axes cross it; it tracks the raw cursor and is never eased.
_Avoid_: Marker, crosshair, notch

## Photo gallery

**Gallery**:
The full-bleed strip of photographs on a Content Page, shown one frame at a time. The Gallery is also the Viewer: the same photographs, the same order, the same navigation.
_Avoid_: Carousel, slider, slideshow

**Viewer**:
The state of a Gallery that fills the browser's viewport, where each photo is shown whole and a click anywhere leaves it.
_Avoid_: Lightbox, modal, fullscreen

## Splash intro

**SplashIntro**:
The one-per-session PIXELBREAKER overlay in which the PIXEL letters drop in from above and BREAKER from below, hold, then slide back out the way they came.
_Avoid_: Splash screen, intro animation, loader
