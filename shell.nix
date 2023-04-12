with import <nixpkgs> {};

mkShell {
  nativeBuildInputs = [
    emscripten
    yarn
    nodejs
    redo-apenwarr
  ];
}
