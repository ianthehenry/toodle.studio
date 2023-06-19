# [Toodle Studio](https://toodle.studio)

Turtle doodles!

I wrote this app for [Chapter Ten](https://janet.guide/embedding-janet/) of [*Janet for Mortals*](https://janet.guide/), as a demonstration of how to embed the [Janet Programming Language](https://janet-lang.org/) into a WebAssembly app.

It began life as a heavily-simplified fork of [Bauble](https://github.com/ianthehenry/bauble.studio), which is -- in my opinion -- a much more interesting graphics playground. But [Toodle.Studio](https://toodle.studio/) is stateful, and [Bauble.Studio](https://bauble.studio/) is stateless, so the Janet interop bits are a bit more interesting here.

# Dependencies

- [`emscripten`](https://emscripten.org/)
- [`redo`](https://github.com/apenwarr/redo)
- [`yarn`](https://yarnpkg.com/)
- Janet 1.29.1

Bauble requires at least Janet 1.29.1. It may work with newer versions of Janet, assuming that the image format is compatible, but it's better to [update the version of Janet that Bauble includes](build/janet/janet-version) to match your local version.

Afterwards, install JavaScript dependencies with:

```
$ yarn
$ (cd ui && yarn)
```

# Building

Dev build:

```
$ redo
```

Prod build:

```
$ BUILD_MODE=prod redo
```

Lint the JS with:

```
(cd ui/; yarn eslint .)
```

After building, you can serve a local copy like this:

```
$ node_modules/.bin/alive-server public
```
