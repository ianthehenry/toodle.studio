#include <emscripten.h>
#include <emscripten/bind.h>
#include <string>
#include <stdio.h>
#include "janet.h"

using std::string;

static JanetFunction *janetfn_evaluate = NULL;
static JanetFunction *janetfn_run = NULL;

JanetFunction *extract_function(JanetTable *env, const char *name) {
  JanetTable *declaration = janet_unwrap_table(janet_table_get(env, janet_csymbolv(name)));
  JanetFunction *function = janet_unwrap_function(janet_table_get(declaration, janet_ckeywordv("value")));
  if (!function) {
    fprintf(stderr, "failed to extract function %s\n", name);
  }
  return function;
}

bool call_fn(JanetFunction *fn, int argc, const Janet *argv, Janet *out) {
  JanetFiber *fiber = NULL;
  if (janet_pcall(fn, argc, argv, out, &fiber) == JANET_SIGNAL_OK) {
    return true;
  } else {
    janet_stacktrace(fiber, *out);
    return false;
  }
}

struct Point {
  double x;
  double y;
};

struct Color {
  double r;
  double g;
  double b;
  double a;
};

struct Line {
  Point start;
  Point end;
  Color color;
  double width;
};

struct CompilationResult {
  bool is_error;
  string error;
  uintptr_t environment;
};

struct ContinueResult {
  bool is_error;
  string error;
  std::vector<Line> lines;
};

CompilationResult compilation_error(string message) {
  return (CompilationResult) {
    .is_error = true,
    .error = message,
    .environment = NULL,
  };
}

ContinueResult continue_error(string message) {
  return (ContinueResult) {
    .is_error = true,
    .error = message,
    .lines = std::vector<Line>(),
  };
}

CompilationResult evaluate_script(string source) {
  if (janetfn_evaluate == NULL) {
    fprintf(stderr, "unable to initialize evaluator\n");
    return compilation_error("function uninitialized");
  }

  long long start_time = emscripten_get_now();
  Janet evaluation_result;
  const Janet args[1] = { janet_cstringv(source.c_str()) };
  if (!call_fn(janetfn_evaluate, 1, args, &evaluation_result)) {
    return compilation_error("evaluation error");
  }

  janet_gcroot(evaluation_result);
  return (CompilationResult) {
   .is_error = false,
   .error = "",
   .environment = reinterpret_cast<uintptr_t>(janet_unwrap_table(evaluation_result)),
  };
}

void free_environment(uintptr_t environment_ptr) {
  janet_gcunroot(janet_wrap_table(reinterpret_cast<JanetTable *>(environment_ptr)));
}

ContinueResult run_turtles(uintptr_t environment_ptr) {
  if (janetfn_run == NULL) {
    janet_panicf("unable to initialize runner");
  }

  JanetTable *environment = reinterpret_cast<JanetTable *>(environment_ptr);

  long long start_time = emscripten_get_now();
  Janet run_result;
  const Janet args[1] = { janet_wrap_table(environment) };
  if (!call_fn(janetfn_run, 1, args, &run_result)) {
    return continue_error("evaluation error");
  }

  JanetArray *lines = janet_unwrap_array(run_result);
  int32_t count = lines->count;

  auto line_vec = std::vector<Line>();

  for (int32_t i = 0; i < count; i++) {
    const Janet *line = janet_unwrap_tuple(lines->data[i]);
    const Janet *start = janet_unwrap_tuple(line[0]);
    const Janet *end = janet_unwrap_tuple(line[1]);
    const Janet *color = janet_unwrap_tuple(line[2]);
    double width = janet_unwrap_number(line[3]);
    line_vec.push_back((Line) {
      .start = {janet_unwrap_number(start[0]), janet_unwrap_number(start[1])},
      .end = {janet_unwrap_number(end[0]), janet_unwrap_number(end[1])},
      .color = {janet_unwrap_number(color[0]), janet_unwrap_number(color[1]), janet_unwrap_number(color[2]), janet_unwrap_number(color[3])},
      .width = width,
    });
  }

  return (ContinueResult) {
   .is_error = false,
   .error = "",
   .lines = line_vec,
  };
}

unsigned char *read_file(const char *filename, size_t *length) {
  size_t capacity = 2 << 17;
  unsigned char *src = (unsigned char *)malloc(capacity * sizeof(unsigned char));
  assert(src);
  size_t total_bytes_read = 0;
  FILE *file = fopen(filename, "r");
  assert(file);
  size_t bytes_read;
  do {
    size_t remaining_capacity = capacity - total_bytes_read;
    if (remaining_capacity == 0) {
      capacity <<= 1;
      src = (unsigned char *)realloc(src, capacity * sizeof(unsigned char));
      assert(src);
      remaining_capacity = capacity - total_bytes_read;
    }

    bytes_read = fread(&src[total_bytes_read], sizeof(unsigned char), remaining_capacity, file);
    total_bytes_read += bytes_read;
  } while (bytes_read > 0);

  fclose(file);
  *length = total_bytes_read;
  return src;
}

EMSCRIPTEN_KEEPALIVE
int main() {
  janet_init();
  JanetTable *core_env = janet_core_env(NULL);
  // TODO: shouldn't this be load-image-dict?
  JanetTable *lookup = janet_env_lookup(core_env);

  size_t image_length;
  unsigned char *image = read_file("turtles.jimage", &image_length);

  Janet environment = janet_unmarshal(image, image_length, 0, lookup, NULL);
  if (!janet_checktype(environment, JANET_TABLE)) {
    janet_panicf("invalid image %q", environment);
  }

  janetfn_evaluate = extract_function(janet_unwrap_table(environment), "evaluator/evaluate");
  janet_gcroot(janet_wrap_function(janetfn_evaluate));
  janetfn_run = extract_function(janet_unwrap_table(environment), "runner/run");
  janet_gcroot(janet_wrap_function(janetfn_run));
}

EMSCRIPTEN_BINDINGS(module) {
  using namespace emscripten;

  value_object<Point>("Point")
    .field("x", &Point::x)
    .field("y", &Point::y)
    ;

  value_object<Color>("Color")
    .field("r", &Color::r)
    .field("g", &Color::g)
    .field("b", &Color::b)
    .field("a", &Color::a)
    ;

  value_object<Line>("Line")
    .field("start", &Line::start)
    .field("end", &Line::end)
    .field("color", &Line::color)
    .field("width", &Line::width)
    ;

  register_vector<Line>("LineVector");

  value_object<CompilationResult>("CompilationResult")
    .field("isError", &CompilationResult::is_error)
    .field("error", &CompilationResult::error)
    .field("environment", &CompilationResult::environment)
    ;

  value_object<ContinueResult>("ContinueResult")
    .field("isError", &ContinueResult::is_error)
    .field("error", &ContinueResult::error)
    .field("lines", &ContinueResult::lines)
    ;

  function("evaluate_script", &evaluate_script);
  function("run_turtles", &run_turtles);
  function("free_environment", &free_environment);
};
