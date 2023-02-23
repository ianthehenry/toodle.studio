# [Toodle Studio](https://toodle.studio)

Turtle doodles!

I wrote this for a book I'm writing about the [Janet Programming Language](https://janet-lang.org/), as a demonstration of how to embed Janet into a larger app.

It began life as a heavily-simplified fork of [Bauble](https://github.com/ianthehenry/bauble.studio), which is -- in my opinion -- a much more interesting graphics playground. But [Toodle.Studio](https://toodle.studio/) is stateful, and [Bauble.Studio](https://bauble.studio/) is stateless, so the Janet interop bits are a bit more interesting here.

# Dependencies

- [`emscripten`](https://emscripten.org/)
- [`redo`](https://github.com/apenwarr/redo)
- [`yarn`](https://yarnpkg.com/)
- Janet 1.26.0

You should use the same version of Janet as the one that is vendored in the `janet/` directory. You might be able to get by with a newer version, but you will run the risk of undefined behavior if there's a material difference between the image format or the image load dictionary.

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
