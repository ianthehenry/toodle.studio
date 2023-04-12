#!/usr/bin/env bash
redo-ifchange mode
mode=$(cat mode)

actual_outpath_jfc=$PWD/$3
cd ..

redo-ifchange janet/janet.{c,h} src/driver.cpp
redo-ifchange build/toodles.jimage src/examples/*

extra_flags="-O0"
if [[ $mode == "prod" ]]; then
  extra_flags="-O3 --closure 1"
fi

emcc \
  $extra_flags \
  -o $actual_outpath_jfc \
  -I janet \
  janet/janet.c \
  src/driver.cpp \
  --embed-file build/toodles.jimage@toodles.jimage \
  --embed-file src/examples@examples \
  -lembind \
  -s "EXPORTED_FUNCTIONS=['_main']" \
  -s "EXPORTED_RUNTIME_METHODS=['FS', 'UTF8ToString']" \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s AGGRESSIVE_VARIABLE_ELIMINATION=1 \
  -s MODULARIZE \
  -s EXPORT_ES6 \
  -s SINGLE_FILE
