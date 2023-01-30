# [Turtles](https://bauble.studio)

Concurrent turtles.

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
