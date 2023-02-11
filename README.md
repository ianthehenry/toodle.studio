# [Toodle Studio](https://toodle.studio)

Turtle doodles!

I wrote this for a book I'm writing about the [Janet Programming Language](https://janet-lang.org/), as a demonstratin of how to embed Janet into a larger app.

# Dependencies

- [`emscripten`](https://emscripten.org/)
- [`redo`](https://github.com/apenwarr/redo)
- [`yarn`](https://yarnpkg.com/)

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
