#!/usr/bin/env bash
redo-ifchange main.css{,.checksum} all.js{,.checksum}

css=$(< main.css.checksum)
js=$(< all.js.checksum)

cd ..

rm -rf public
mkdir -p public

redo-ifchange $(find ui -path '*/node_modules' -prune -o -type f)

ln -f ui/assets/* public/
ln -f build/main.css public/$css
ln -f build/all.js public/$js

mkdir -p public/{about,help}
ui/html/home "/$css" "/$js" > public/index.html

tree public --noreport | tr ' ' ' '
