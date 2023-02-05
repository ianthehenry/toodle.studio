/*

Based on the following Bauble script:

```janet
(def left-eye-target [100 20 40])
(def right-eye-target [100 20 40])

(defn eye [$ target]
  ($
  | color (+ c 0.5)
  | color (- c (dot normal ~(normalize ,target) - 0.72 | clamp -1 0 | step 0 * 1))
  | color [c.b c.g c.r]
))

(def eye-sockets (sphere 5 | move [8 10 10] | mirror :z))

(def eyes
  (sphere 5
    | fork (move [8 10 10] | eye left-eye-target) (move [8 10 -10] | eye right-eye-target)))

(def foot
  (box [17 5 5] :r 5
    | twist :x 0.05
    | bend :y :z -0.052
    | bend :z :y -0.012
    | rotate :x 3.30 :y 1.63 :x -0.89))

(defn skin [s] (color s (+ c [-0.4 0.2 -0.3])
#  | fresnel
))

(def head
  (box :r 10 20
    | scale :z (ss p.x 0 20 1 0.25)
    | morph 0.5 (sphere 20)
    | subtract :r 5 (box [45 7 63] | rotate :z (- pi/4) | move :x 25)
    | subtract :r 1 (box [10.6 0 63] | rotate :z (- 1.28 pi/4) | move :x 24 :y -1.1)
    | subtract :r 4 eye-sockets
    | subtract :r 1 (sphere 1 | move :y 8.3 :z 2.4 :x 17.0 | mirror :z)
    | skin
    | union eyes

    | scale 0.9
    ))

(def shell  (ellipsoid [50 50 45] | morph -0.2 (box 50)))

(def head-rotation (sin+ (/ t 1.7) * sin+ (t / 9 + 9) * sin+ (+ t 10) | ss 0 1 0 0.3 + 0.1))
(def head-tilt (sin t * 0.02))

(def foot-offset [42 -17 18])
(def foot-pivot [-6 0 -5])
(intersect :r 10
  shell
  (half-space :y -18)
| subtract :r 5 (sphere 41 | move :y 95)
| subtract :r 5 (sphere 23 | move [40 -18 0])
| rotate :x (sin (t * 2) * 0.01)
| color (pow c 2)
| color [c.b c.g c.r]
| union (box :r 10 [54 10 15] | bend :z :y 0.01 | rotate :y (ss p.x 0 56 0 head-rotation) | skin
| move [30 -10 0]
| union :r 10 (head | move [77 10 0] | rotate :pivot [30 0 0] :y head-rotation :z head-tilt)
| union :r 10
  (foot
    | fork
      (rotate :pivot foot-pivot :y (sin+ (t * 3) * -0.75) | move foot-offset)
      (rotate :pivot foot-pivot :y (sin+ (t * 3 + (1 * pi/2)) * -0.75) | move foot-offset | reflect :z)
    | spoon (move :x -57 | reflect :z)
    | skin))
# | rotate :y (tau* 0.2) :x (tau* -0.01)
)
```

But with modifications for eyes to follow mouse, and to add the frame.

*/

let shader = `#version 300 es
precision highp float;

uniform vec3 camera_origin;
uniform mat3 camera_matrix;
uniform float t;
uniform vec4 viewport;

uniform vec3 left_eye_target;
uniform vec3 right_eye_target;

out vec4 frag_color;

const int MAX_STEPS = 256;
const float MINIMUM_HIT_DISTANCE = 0.1;
const float NORMAL_OFFSET = 0.005;
const float MAXIMUM_TRACE_DISTANCE = 64.0 * 1024.0;

const float PI = 3.14159265359;

float nearest_distance(vec3 p);
mat3 rotate_x(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat3(
    1.0, 0.0, 0.0,
    0.0, c, -s,
    0.0, s, c);
}
float s3d_ellipsoid(vec3 p, vec3 size) {
  float k0 = length(p / size);
  float k1 = length(p / (size * size));
  return k0 * (k0 - 1.0) / k1;

}
float s3d_box(vec3 p, vec3 size) {
  vec3 q = abs(p) - size;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);

}
float intersect_0(vec3 p, float r) {
  float b, h = 0.0;
  r = max(r, 0.0000000001);
  float a = mix(s3d_ellipsoid(p, vec3(50.0, 50.0, 45.0)), s3d_box(p, vec3(50.0, 50.0, 50.0)), -0.2);
  float _r1; {
    vec3 p1 = (p - vec3(0.0, -18.0, 0.0));
    _r1 = (-p1.y);
  }
  b = _r1;
  h = clamp(0.5 - 0.5 * (b - a) / r, 0.0, 1.0);
  a = mix(b, a, h) + r * h * (1.0 - h);

  return a;
}
float subtract_1(vec3 p, float r) {
  float b, h = 0.0;
  r = max(r, 0.0000000001);
  float a = intersect_0(p, 10.0);
  float _r1; {
    vec3 p1 = (p - vec3(0.0, 95.0, 0.0));
    _r1 = (length(p1) - 41.0);
  }
  b = _r1;
  h = clamp(0.5 - 0.5 * (a + b) / r, 0.0, 1.0);
  a = mix(a, -b, h) + r * h * (1.0 - h);

  return a;
}
float subtract_0(vec3 p, float r) {
  float b, h = 0.0;
  r = max(r, 0.0000000001);
  float a = subtract_1(p, 5.0);
  float _r1; {
    vec3 p1 = (p - vec3(40.0, -18.0, 0.0));
    _r1 = (length(p1) - 23.0);
  }
  b = _r1;
  h = clamp(0.5 - 0.5 * (a + b) / r, 0.0, 1.0);
  a = mix(a, -b, h) + r * h * (1.0 - h);

  return a;
}
mat3 rotate_y(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat3(
    c, 0.0, s,
    0.0, 1.0, 0.0,
    -s, 0.0, c);
}
vec3 bend_z_0(vec3 p, float rate) {
  float s = sin(rate * p.x);
  float c = cos(rate * p.x);
  mat2 m = mat2(c, -s, s, c);
  vec2 transformed = m * p.yx;
  return vec3(transformed.y, transformed.x, p.z);
}
mat3 rotate_z(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat3(
    c, -s, 0.0,
    s, c, 0.0,
    0.0, 0.0, 1.0);
}
float min3(vec3 p) {
  return min(p.x, min(p.y, p.z));
}
float subtract_5(vec3 p, float r) {
  float b, h = 0.0;
  r = max(r, 0.0000000001);
  float _r1; {
    vec3 scale0_1 = vec3(1.0, 1.0, (1.0 * (1.0 + (smoothstep(0.0, 20.0, p.x) * -0.75))));
    vec3 p1 = (p / scale0_1);
    _r1 = mix(((s3d_box(p1, vec3(10.0, 10.0, 10.0)) - 10.0) * min3(abs(scale0_1))), (length(p) - 20.0), 0.5);
  }
  float a = _r1;
  float _r2; {
    vec3 p1 = (p - vec3(25.0, 0.0, 0.0));
    vec3 p2 = (p1 * mat3(0.707107, 0.707107, 0.0, -0.707107, 0.707107, 0.0, 0.0, 0.0, 1.0));
    _r2 = s3d_box(p2, vec3(45.0, 7.0, 63.0));
  }
  b = _r2;
  h = clamp(0.5 - 0.5 * (a + b) / r, 0.0, 1.0);
  a = mix(a, -b, h) + r * h * (1.0 - h);

  return a;
}
float subtract_4(vec3 p, float r) {
  float b, h = 0.0;
  r = max(r, 0.0000000001);
  float a = subtract_5(p, 5.0);
  float _r1; {
    vec3 p1 = (p - vec3(24.0, -1.1, 0.0));
    vec3 p2 = (p1 * mat3(0.880158, -0.474681, 0.0, 0.474681, 0.880158, 0.0, 0.0, 0.0, 1.0));
    _r1 = s3d_box(p2, vec3(10.6, 0.0, 63.0));
  }
  b = _r1;
  h = clamp(0.5 - 0.5 * (a + b) / r, 0.0, 1.0);
  a = mix(a, -b, h) + r * h * (1.0 - h);

  return a;
}
vec3 abs_z_0(vec3 p) {
  p.z = abs(p.z);
  return p;
}
float subtract_3(vec3 p, float r) {
  float b, h = 0.0;
  r = max(r, 0.0000000001);
  float a = subtract_4(p, 1.0);
  float _r1; {
    vec3 p1 = abs_z_0(p);
    vec3 p2 = (p1 - vec3(8.0, 10.0, 10.0));
    _r1 = (length(p2) - 5.0);
  }
  b = _r1;
  h = clamp(0.5 - 0.5 * (a + b) / r, 0.0, 1.0);
  a = mix(a, -b, h) + r * h * (1.0 - h);

  return a;
}
vec3 abs_z_1(vec3 p) {
  p.z = abs(p.z);
  return p;
}
float subtract_2(vec3 p, float r) {
  float b, h = 0.0;
  r = max(r, 0.0000000001);
  float a = subtract_3(p, 4.0);
  float _r1; {
    vec3 p1 = abs_z_1(p);
    vec3 p2 = (p1 - vec3(17.0, 8.3, 2.4));
    _r1 = (length(p2) - 1.0);
  }
  b = _r1;
  h = clamp(0.5 - 0.5 * (a + b) / r, 0.0, 1.0);
  a = mix(a, -b, h) + r * h * (1.0 - h);

  return a;
}
float union_4(vec3 p) {
  float _r1; {
    vec3 p1 = (p - vec3(8.0, 10.0, 10.0));
    _r1 = (length(p1) - 5.0);
  }
  float d = _r1;
  float _r2; {
    vec3 p1 = (p - vec3(8.0, 10.0, -10.0));
    _r2 = (length(p1) - 5.0);
  }
  d = min(d, _r2);
  return d;
}
float union_3(vec3 p) {
  float d = subtract_2(p, 1.0);
  d = min(d, union_4(p));
  return d;
}
float union_2(vec3 p, float t, float r) {
  float b, h = 0.0;
  r = max(r, 0.0000000001);
  float _r1; {
    vec3 p1 = (p - vec3(30.0, -10.0, 0.0));
    vec3 p2 = (p1 * (mat3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0) * rotate_y((1.0 * (0.0 + (smoothstep(0.0, 56.0, p1.x) * (((0.0 + (smoothstep(0.0, 1.0, (((0.5 * (sin((t / 1.7)) + 1.0)) * (0.5 * (sin(((t / 9.0) + 9.0)) + 1.0))) * (0.5 * (sin((t + 10.0)) + 1.0)))) * 0.3)) + 0.1) - 0.0)))))));
    vec3 p3 = bend_z_0(p2, -0.01);
    _r1 = (s3d_box(p3, vec3(44.0, 0.0, 5.0)) - 10.0);
  }
  float a = _r1;
  float _r2; {
    vec3 pivot0_1 = vec3(30.0, 0.0, 0.0);
    vec3 p1 = (p - pivot0_1);
    vec3 p2 = (p1 * ((mat3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0) * rotate_y((1.0 * ((0.0 + (smoothstep(0.0, 1.0, (((0.5 * (sin((t / 1.7)) + 1.0)) * (0.5 * (sin(((t / 9.0) + 9.0)) + 1.0))) * (0.5 * (sin((t + 10.0)) + 1.0)))) * 0.3)) + 0.1)))) * rotate_z((1.0 * (sin(t) * 0.02)))));
    vec3 p3 = (p2 - (-pivot0_1));
    vec3 p4 = (p3 - vec3(77.0, 10.0, 0.0));
    float scale0_1 = 0.9;
    vec3 p5 = (p4 / scale0_1);
    _r2 = (union_3(p5) * scale0_1);
  }
  b = _r2;
  h = clamp(0.5 + 0.5 * (b - a) / r, 0.0, 1.0);
  a = mix(b, a, h) - r * h * (1.0 - h);

  return a;
}
vec3 bend_y_0(vec3 p, float rate) {
  float s = sin(rate * p.x);
  float c = cos(rate * p.x);
  mat2 m = mat2(c, -s, s, c);
  vec2 transformed = m * p.zx;
  return vec3(transformed.y, p.y, transformed.x);
}
vec3 twist_x_0(vec3 p, float rate) {
  float s = sin(rate * p.x);
  float c = cos(rate * p.x);
  mat2 m = mat2(c, -s, s, c);
  vec2 transformed = m * p.yz;
  return vec3(p.x, transformed.x, transformed.y);
}
vec3 neg_z_0(vec3 p) {
  p.z = -p.z;
  return p;
}
float union_6(vec3 p, float t) {
  float _r1; {
    vec3 p1 = (p - vec3(42.0, -17.0, 18.0));
    vec3 pivot0_1 = vec3(-6.0, 0.0, -5.0);
    vec3 p2 = (p1 - pivot0_1);
    vec3 p3 = (p2 * (mat3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0) * rotate_y((1.0 * ((0.5 * (sin((t * 3.0)) + 1.0)) * -0.75)))));
    vec3 p4 = (p3 - (-pivot0_1));
    vec3 p5 = (p4 * mat3(-0.059169, -0.77571, 0.628309, -0.157469, -0.614279, -0.773217, 0.98575, -0.14469, -0.085804));
    vec3 p6 = bend_z_0(p5, 0.012);
    vec3 p7 = bend_y_0(p6, 0.052);
    vec3 p8 = twist_x_0(p7, 0.05);
    _r1 = (s3d_box(p8, vec3(12.0, 0.0, 0.0)) - 5.0);
  }
  float d = _r1;
  float _r2; {
    vec3 p1 = neg_z_0(p);
    vec3 p2 = (p1 - vec3(42.0, -17.0, 18.0));
    vec3 pivot0_1 = vec3(-6.0, 0.0, -5.0);
    vec3 p3 = (p2 - pivot0_1);
    vec3 p4 = (p3 * (mat3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0) * rotate_y((1.0 * ((0.5 * (sin(((t * 3.0) + 1.570796)) + 1.0)) * -0.75)))));
    vec3 p5 = (p4 - (-pivot0_1));
    vec3 p6 = (p5 * mat3(-0.059169, -0.77571, 0.628309, -0.157469, -0.614279, -0.773217, 0.98575, -0.14469, -0.085804));
    vec3 p7 = bend_z_0(p6, 0.012);
    vec3 p8 = bend_y_0(p7, 0.052);
    vec3 p9 = twist_x_0(p8, 0.05);
    _r2 = (s3d_box(p9, vec3(12.0, 0.0, 0.0)) - 5.0);
  }
  d = min(d, _r2);
  return d;
}
vec3 neg_z_1(vec3 p) {
  p.z = -p.z;
  return p;
}
float union_5(vec3 p, float t) {
  float d = union_6(p, t);
  float _r1; {
    vec3 p1 = neg_z_1(p);
    vec3 p2 = (p1 - vec3(-57.0, 0.0, 0.0));
    _r1 = union_6(p2, t);
  }
  d = min(d, _r1);
  return d;
}
float union_1(vec3 p, float t, float r) {
  float b, h = 0.0;
  r = max(r, 0.0000000001);
  float a = union_2(p, t, 10.0);
  b = union_5(p, t);
  h = clamp(0.5 + 0.5 * (b - a) / r, 0.0, 1.0);
  a = mix(b, a, h) - r * h * (1.0 - h);

  return a;
}
float union_0(vec3 p, float t) {
  float _r1; {
    vec3 p1 = (p * (mat3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0) * rotate_x((1.0 * (sin((t * 2.0)) * 0.01)))));
    _r1 = subtract_0(p1, 5.0);
  }
  float d = _r1;
  d = min(d, union_1(p, t, 10.0));
  return d;
}
vec3 intersect_color_0(vec3 p, vec3 normal, float r) {
  float b, h;
  r = max(r, 0.0000000001);
  float a = mix(s3d_ellipsoid(p, vec3(50.0, 50.0, 45.0)), s3d_box(p, vec3(50.0, 50.0, 50.0)), -0.2);
  vec3 color = mix((0.5 * (1.0 + normal)), (0.5 * (1.0 + normal)), -0.2);
  float _r1; {
    vec3 p1 = (p - vec3(0.0, -18.0, 0.0));
    _r1 = (-p1.y);
  }
  vec3 _r2; {
    vec3 p1 = (p - vec3(0.0, -18.0, 0.0));
    _r2 = (0.5 * (1.0 + normal));
  }
  b = _r1;
  h = clamp(0.5 - 0.5 * (b - a) / r, 0.0, 1.0);
  a = mix(b, a, h) + r * h * (1.0 - h);
  color = mix(_r2, color, h);
  return color;
}
vec3 subtract_color_1(vec3 p, vec3 normal, float r) {
  float b, h;
  r = max(r, 0.0000000001);
  float a = intersect_0(p, 10.0);
  vec3 color = intersect_color_0(p, normal, 10.0);
  float _r1; {
    vec3 p1 = (p - vec3(0.0, 95.0, 0.0));
    _r1 = (length(p1) - 41.0);
  }
  vec3 _r2; {
    vec3 p1 = (p - vec3(0.0, 95.0, 0.0));
    _r2 = (0.5 * (1.0 + normal));
  }
  b = _r1;
  h = clamp(0.5 - 0.5 * (a + b) / r, 0.0, 1.0);
  a = mix(a, -b, h) + r * h * (1.0 - h);
  color = mix(color, _r2, h);
  return color;
}
vec3 subtract_color_0(vec3 p, vec3 normal, float r) {
  float b, h;
  r = max(r, 0.0000000001);
  float a = subtract_1(p, 5.0);
  vec3 color = subtract_color_1(p, normal, 5.0);
  float _r1; {
    vec3 p1 = (p - vec3(40.0, -18.0, 0.0));
    _r1 = (length(p1) - 23.0);
  }
  vec3 _r2; {
    vec3 p1 = (p - vec3(40.0, -18.0, 0.0));
    _r2 = (0.5 * (1.0 + normal));
  }
  b = _r1;
  h = clamp(0.5 - 0.5 * (a + b) / r, 0.0, 1.0);
  a = mix(a, -b, h) + r * h * (1.0 - h);
  color = mix(color, _r2, h);
  return color;
}
vec3 subtract_color_5(vec3 p, vec3 normal, float r) {
  float b, h;
  r = max(r, 0.0000000001);
  float _r1; {
    vec3 scale0_1 = vec3(1.0, 1.0, (1.0 * (1.0 + (smoothstep(0.0, 20.0, p.x) * -0.75))));
    vec3 p1 = (p / scale0_1);
    _r1 = mix(((s3d_box(p1, vec3(10.0, 10.0, 10.0)) - 10.0) * min3(abs(scale0_1))), (length(p) - 20.0), 0.5);
  }
  vec3 _r2; {
    vec3 p1 = (p / vec3(1.0, 1.0, (1.0 * (1.0 + (smoothstep(0.0, 20.0, p.x) * -0.75)))));
    _r2 = mix((0.5 * (1.0 + normal)), (0.5 * (1.0 + normal)), 0.5);
  }
  float a = _r1;
  vec3 color = _r2;
  float _r3; {
    vec3 p1 = (p - vec3(25.0, 0.0, 0.0));
    vec3 p2 = (p1 * mat3(0.707107, 0.707107, 0.0, -0.707107, 0.707107, 0.0, 0.0, 0.0, 1.0));
    _r3 = s3d_box(p2, vec3(45.0, 7.0, 63.0));
  }
  vec3 _r4; {
    vec3 p1 = (p - vec3(25.0, 0.0, 0.0));
    vec3 p2 = (p1 * mat3(0.707107, 0.707107, 0.0, -0.707107, 0.707107, 0.0, 0.0, 0.0, 1.0));
    _r4 = (0.5 * (1.0 + normal));
  }
  b = _r3;
  h = clamp(0.5 - 0.5 * (a + b) / r, 0.0, 1.0);
  a = mix(a, -b, h) + r * h * (1.0 - h);
  color = mix(color, _r4, h);
  return color;
}
vec3 subtract_color_4(vec3 p, vec3 normal, float r) {
  float b, h;
  r = max(r, 0.0000000001);
  float a = subtract_5(p, 5.0);
  vec3 color = subtract_color_5(p, normal, 5.0);
  float _r1; {
    vec3 p1 = (p - vec3(24.0, -1.1, 0.0));
    vec3 p2 = (p1 * mat3(0.880158, -0.474681, 0.0, 0.474681, 0.880158, 0.0, 0.0, 0.0, 1.0));
    _r1 = s3d_box(p2, vec3(10.6, 0.0, 63.0));
  }
  vec3 _r2; {
    vec3 p1 = (p - vec3(24.0, -1.1, 0.0));
    vec3 p2 = (p1 * mat3(0.880158, -0.474681, 0.0, 0.474681, 0.880158, 0.0, 0.0, 0.0, 1.0));
    _r2 = (0.5 * (1.0 + normal));
  }
  b = _r1;
  h = clamp(0.5 - 0.5 * (a + b) / r, 0.0, 1.0);
  a = mix(a, -b, h) + r * h * (1.0 - h);
  color = mix(color, _r2, h);
  return color;
}
vec3 subtract_color_3(vec3 p, vec3 normal, float r) {
  float b, h;
  r = max(r, 0.0000000001);
  float a = subtract_4(p, 1.0);
  vec3 color = subtract_color_4(p, normal, 1.0);
  float _r1; {
    vec3 p1 = abs_z_0(p);
    vec3 p2 = (p1 - vec3(8.0, 10.0, 10.0));
    _r1 = (length(p2) - 5.0);
  }
  vec3 _r2; {
    vec3 p1 = abs_z_0(p);
    vec3 p2 = (p1 - vec3(8.0, 10.0, 10.0));
    _r2 = (0.5 * (1.0 + normal));
  }
  b = _r1;
  h = clamp(0.5 - 0.5 * (a + b) / r, 0.0, 1.0);
  a = mix(a, -b, h) + r * h * (1.0 - h);
  color = mix(color, _r2, h);
  return color;
}
vec3 subtract_color_2(vec3 p, vec3 normal, float r) {
  float b, h;
  r = max(r, 0.0000000001);
  float a = subtract_3(p, 4.0);
  vec3 color = subtract_color_3(p, normal, 4.0);
  float _r1; {
    vec3 p1 = abs_z_1(p);
    vec3 p2 = (p1 - vec3(17.0, 8.3, 2.4));
    _r1 = (length(p2) - 1.0);
  }
  vec3 _r2; {
    vec3 p1 = abs_z_1(p);
    vec3 p2 = (p1 - vec3(17.0, 8.3, 2.4));
    _r2 = (0.5 * (1.0 + normal));
  }
  b = _r1;
  h = clamp(0.5 - 0.5 * (a + b) / r, 0.0, 1.0);
  a = mix(a, -b, h) + r * h * (1.0 - h);
  color = mix(color, _r2, h);
  return color;
}
vec3 union_color_4(vec3 p, vec3 normal) {
  float _r1; {
    vec3 p1 = (p - vec3(8.0, 10.0, 10.0));
    _r1 = (length(p1) - 5.0);
  }
  float d = _r1;
  float d2;
  int surface = 0;
  vec3 color;
  float _r2; {
    vec3 p1 = (p - vec3(8.0, 10.0, -10.0));
    _r2 = (length(p1) - 5.0);
  }
  d2 = _r2;
  if (d2 < d) {
    d = d2;
    surface = 1;
  }
  switch (surface) {
  case 0:
    vec3 _r3; {
      vec3 p1 = (p - vec3(8.0, 10.0, 10.0));
      vec3 color2_1 = (0.5 * (1.0 + normal));
      vec3 color1_1 = (color2_1 + 0.5);
      vec3 color0_1 = (color1_1 - (step(0.0, clamp((dot(normal, normalize(left_eye_target * mat3(0.309017, -0.059717, 0.94918, 0.0, 0.998027, 0.062791, -0.951057, -0.019403, 0.308407))) - 0.72), -1.0, 0.0)) * 1.0));
      _r3 = vec3(color0_1.b, color0_1.g, color0_1.r);
    }
    color = _r3;
    break;
  case 1:
    vec3 _r4; {
      vec3 p1 = (p - vec3(8.0, 10.0, -10.0));
      vec3 color2_1 = (0.5 * (1.0 + normal));
      vec3 color1_1 = (color2_1 + 0.5);
      vec3 color0_1 = (color1_1 - (step(0.0, clamp((dot(normal, normalize(right_eye_target * mat3(0.309017, -0.059717, 0.94918, 0.0, 0.998027, 0.062791, -0.951057, -0.019403, 0.308407))) - 0.72), -1.0, 0.0)) * 1.0));
      _r4 = vec3(color0_1.b, color0_1.g, color0_1.r);
    }
    color = _r4;
    break;
  }
  return color;
}
vec3 union_color_3(vec3 p, vec3 normal) {
  float d = subtract_2(p, 1.0);
  float d2;
  int surface = 0;
  vec3 color;
  d2 = union_4(p);
  if (d2 < d) {
    d = d2;
    surface = 1;
  }
  switch (surface) {
  case 0:
    vec3 _r1; {
      vec3 color0_1 = subtract_color_2(p, normal, 1.0);
      _r1 = (color0_1 + vec3(-0.4, 0.2, -0.3));
    }
    color = _r1;
    break;
  case 1:
    color = union_color_4(p, normal);
    break;
  }
  return color;
}
vec3 union_color_2(float t, vec3 p, vec3 normal, float r) {
  float b, h;
  r = max(r, 0.0000000001);
  float _r1; {
    vec3 p1 = (p - vec3(30.0, -10.0, 0.0));
    vec3 p2 = (p1 * (mat3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0) * rotate_y((1.0 * (0.0 + (smoothstep(0.0, 56.0, p1.x) * (((0.0 + (smoothstep(0.0, 1.0, (((0.5 * (sin((t / 1.7)) + 1.0)) * (0.5 * (sin(((t / 9.0) + 9.0)) + 1.0))) * (0.5 * (sin((t + 10.0)) + 1.0)))) * 0.3)) + 0.1) - 0.0)))))));
    vec3 p3 = bend_z_0(p2, -0.01);
    _r1 = (s3d_box(p3, vec3(44.0, 0.0, 5.0)) - 10.0);
  }
  vec3 _r2; {
    vec3 p1 = (p - vec3(30.0, -10.0, 0.0));
    vec3 p2 = (p1 * (mat3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0) * rotate_y((1.0 * (0.0 + (smoothstep(0.0, 56.0, p1.x) * (((0.0 + (smoothstep(0.0, 1.0, (((0.5 * (sin((t / 1.7)) + 1.0)) * (0.5 * (sin(((t / 9.0) + 9.0)) + 1.0))) * (0.5 * (sin((t + 10.0)) + 1.0)))) * 0.3)) + 0.1) - 0.0)))))));
    vec3 p3 = bend_z_0(p2, -0.01);
    vec3 color0_1 = (0.5 * (1.0 + normal));
    _r2 = (color0_1 + vec3(-0.4, 0.2, -0.3));
  }
  float a = _r1;
  vec3 color = _r2;
  float _r3; {
    vec3 pivot0_1 = vec3(30.0, 0.0, 0.0);
    vec3 p1 = (p - pivot0_1);
    vec3 p2 = (p1 * ((mat3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0) * rotate_y((1.0 * ((0.0 + (smoothstep(0.0, 1.0, (((0.5 * (sin((t / 1.7)) + 1.0)) * (0.5 * (sin(((t / 9.0) + 9.0)) + 1.0))) * (0.5 * (sin((t + 10.0)) + 1.0)))) * 0.3)) + 0.1)))) * rotate_z((1.0 * (sin(t) * 0.02)))));
    vec3 p3 = (p2 - (-pivot0_1));
    vec3 p4 = (p3 - vec3(77.0, 10.0, 0.0));
    float scale0_1 = 0.9;
    vec3 p5 = (p4 / scale0_1);
    _r3 = (union_3(p5) * scale0_1);
  }
  vec3 _r4; {
    vec3 pivot0_1 = vec3(30.0, 0.0, 0.0);
    vec3 p1 = (p - pivot0_1);
    vec3 p2 = (p1 * ((mat3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0) * rotate_y((1.0 * ((0.0 + (smoothstep(0.0, 1.0, (((0.5 * (sin((t / 1.7)) + 1.0)) * (0.5 * (sin(((t / 9.0) + 9.0)) + 1.0))) * (0.5 * (sin((t + 10.0)) + 1.0)))) * 0.3)) + 0.1)))) * rotate_z((1.0 * (sin(t) * 0.02)))));
    vec3 p3 = (p2 - (-pivot0_1));
    vec3 p4 = (p3 - vec3(77.0, 10.0, 0.0));
    vec3 p5 = (p4 / 0.9);
    _r4 = union_color_3(p5, normal);
  }
  b = _r3;
  h = clamp(0.5 + 0.5 * (b - a) / r, 0.0, 1.0);
  a = mix(b, a, h) - r * h * (1.0 - h);
  color = mix(_r4, color, h);
  return color;
}
vec3 union_color_6(float t, vec3 p, vec3 normal) {
  float _r1; {
    vec3 p1 = (p - vec3(42.0, -17.0, 18.0));
    vec3 pivot0_1 = vec3(-6.0, 0.0, -5.0);
    vec3 p2 = (p1 - pivot0_1);
    vec3 p3 = (p2 * (mat3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0) * rotate_y((1.0 * ((0.5 * (sin((t * 3.0)) + 1.0)) * -0.75)))));
    vec3 p4 = (p3 - (-pivot0_1));
    vec3 p5 = (p4 * mat3(-0.059169, -0.77571, 0.628309, -0.157469, -0.614279, -0.773217, 0.98575, -0.14469, -0.085804));
    vec3 p6 = bend_z_0(p5, 0.012);
    vec3 p7 = bend_y_0(p6, 0.052);
    vec3 p8 = twist_x_0(p7, 0.05);
    _r1 = (s3d_box(p8, vec3(12.0, 0.0, 0.0)) - 5.0);
  }
  float d = _r1;
  float d2;
  int surface = 0;
  vec3 color;
  float _r2; {
    vec3 p1 = neg_z_0(p);
    vec3 p2 = (p1 - vec3(42.0, -17.0, 18.0));
    vec3 pivot0_1 = vec3(-6.0, 0.0, -5.0);
    vec3 p3 = (p2 - pivot0_1);
    vec3 p4 = (p3 * (mat3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0) * rotate_y((1.0 * ((0.5 * (sin(((t * 3.0) + 1.570796)) + 1.0)) * -0.75)))));
    vec3 p5 = (p4 - (-pivot0_1));
    vec3 p6 = (p5 * mat3(-0.059169, -0.77571, 0.628309, -0.157469, -0.614279, -0.773217, 0.98575, -0.14469, -0.085804));
    vec3 p7 = bend_z_0(p6, 0.012);
    vec3 p8 = bend_y_0(p7, 0.052);
    vec3 p9 = twist_x_0(p8, 0.05);
    _r2 = (s3d_box(p9, vec3(12.0, 0.0, 0.0)) - 5.0);
  }
  d2 = _r2;
  if (d2 < d) {
    d = d2;
    surface = 1;
  }
  switch (surface) {
  case 0:
    vec3 _r3; {
      vec3 p1 = (p - vec3(42.0, -17.0, 18.0));
      vec3 pivot0_1 = vec3(-6.0, 0.0, -5.0);
      vec3 p2 = (p1 - pivot0_1);
      vec3 p3 = (p2 * (mat3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0) * rotate_y((1.0 * ((0.5 * (sin((t * 3.0)) + 1.0)) * -0.75)))));
      vec3 p4 = (p3 - (-pivot0_1));
      vec3 p5 = (p4 * mat3(-0.059169, -0.77571, 0.628309, -0.157469, -0.614279, -0.773217, 0.98575, -0.14469, -0.085804));
      vec3 p6 = bend_z_0(p5, 0.012);
      vec3 p7 = bend_y_0(p6, 0.052);
      vec3 p8 = twist_x_0(p7, 0.05);
      _r3 = (0.5 * (1.0 + normal));
    }
    color = _r3;
    break;
  case 1:
    vec3 _r4; {
      vec3 p1 = neg_z_0(p);
      vec3 p2 = (p1 - vec3(42.0, -17.0, 18.0));
      vec3 pivot0_1 = vec3(-6.0, 0.0, -5.0);
      vec3 p3 = (p2 - pivot0_1);
      vec3 p4 = (p3 * (mat3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0) * rotate_y((1.0 * ((0.5 * (sin(((t * 3.0) + 1.570796)) + 1.0)) * -0.75)))));
      vec3 p5 = (p4 - (-pivot0_1));
      vec3 p6 = (p5 * mat3(-0.059169, -0.77571, 0.628309, -0.157469, -0.614279, -0.773217, 0.98575, -0.14469, -0.085804));
      vec3 p7 = bend_z_0(p6, 0.012);
      vec3 p8 = bend_y_0(p7, 0.052);
      vec3 p9 = twist_x_0(p8, 0.05);
      _r4 = (0.5 * (1.0 + normal));
    }
    color = _r4;
    break;
  }
  return color;
}
vec3 union_color_5(float t, vec3 p, vec3 normal) {
  float d = union_6(p, t);
  float d2;
  int surface = 0;
  vec3 color;
  float _r1; {
    vec3 p1 = neg_z_1(p);
    vec3 p2 = (p1 - vec3(-57.0, 0.0, 0.0));
    _r1 = union_6(p2, t);
  }
  d2 = _r1;
  if (d2 < d) {
    d = d2;
    surface = 1;
  }
  switch (surface) {
  case 0:
    color = union_color_6(t, p, normal);
    break;
  case 1:
    vec3 _r2; {
      vec3 p1 = neg_z_1(p);
      vec3 p2 = (p1 - vec3(-57.0, 0.0, 0.0));
      _r2 = union_color_6(t, p2, normal);
    }
    color = _r2;
    break;
  }
  return color;
}
vec3 union_color_1(float t, vec3 p, vec3 normal, float r) {
  float b, h;
  r = max(r, 0.0000000001);
  float a = union_2(p, t, 10.0);
  vec3 color = union_color_2(t, p, normal, 10.0);
  vec3 _r1; {
    vec3 color0_1 = union_color_5(t, p, normal);
    _r1 = (color0_1 + vec3(-0.4, 0.2, -0.3));
  }
  b = union_5(p, t);
  h = clamp(0.5 + 0.5 * (b - a) / r, 0.0, 1.0);
  a = mix(b, a, h) - r * h * (1.0 - h);
  color = mix(_r1, color, h);
  return color;
}
vec3 union_color_0(float t, vec3 p, vec3 normal) {
  float _r1; {
    vec3 p1 = (p * (mat3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0) * rotate_x((1.0 * (sin((t * 2.0)) * 0.01)))));
    _r1 = subtract_0(p1, 5.0);
  }
  float d = _r1;
  float d2;
  int surface = 0;
  vec3 color;
  d2 = union_1(p, t, 10.0);
  if (d2 < d) {
    d = d2;
    surface = 1;
  }
  switch (surface) {
  case 0:
    vec3 _r2; {
      vec3 p1 = (p * (mat3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0) * rotate_x((1.0 * (sin((t * 2.0)) * 0.01)))));
      vec3 color1_1 = subtract_color_0(p1, normal, 5.0);
      vec3 color0_1 = pow(color1_1, vec3(2.0));
      _r2 = vec3(color0_1.b, color0_1.g, color0_1.r);
    }
    color = _r2;
    break;
  case 1:
    color = union_color_1(t, p, normal, 10.0);
    break;
  }
  return color;
}
float nearest_distance(vec3 p) {

  vec3 p1 = (p * mat3(0.309017, -0.059717, 0.94918, 0.0, 0.998027, 0.062791, -0.951057, -0.019403, 0.308407));
  return union_0(p1, t);
}

vec3 calculate_normal(vec3 p) {
  const vec3 step = vec3(NORMAL_OFFSET, 0.0, 0.0);

  return normalize(vec3(
    nearest_distance(p + step.xyy) - nearest_distance(p - step.xyy),
    nearest_distance(p + step.yxy) - nearest_distance(p - step.yxy),
    nearest_distance(p + step.yyx) - nearest_distance(p - step.yyx)
  ));
}

float calculate_occlusion(vec3 p, vec3 normal) {
  const int step_count = 10;
  const float max_distance = 10.0;
  const float step_size = max_distance / float(step_count);
  float baseline = nearest_distance(p);
  float occlusion = 0.0;
  // TODO: this does some good to reduce the problem where a "neck" will
  // have band of completely unoccluded space, but it introduces some
  // terrible banding artifacts on flat surfaces.
  // vec3 sine_noise = sin(p * 43758.5453);
  // vec3 rand = sign(sine_noise) * fract(sine_noise);
  // vec3 step = normalize(normal + rand) * step_size;
  vec3 step = normal * step_size;
  for (int i = 1; i <= step_count; i++) {
    float expected_distance = baseline + float(i) * step_size;
    float actual_distance = max(nearest_distance(p + float(i) * step), 0.0);
    occlusion += actual_distance / expected_distance;
  }
  occlusion /= float(step_count);
  return clamp(occlusion, 0.0, 1.0);
}

vec3 march(vec3 ray_origin, vec3 ray_direction, out int steps) {
  float distance = 0.0;

  for (steps = 0; steps < MAX_STEPS; steps++) {
    vec3 p = ray_origin + distance * ray_direction;

    float nearest = nearest_distance(p);

    // TODO: this attenuation only works when we're
    // using march to render from the camera's point
    // of view, so we can't use the march function
    // as-is to render reflections. I don't know if
    // it's worth having.
    // if (nearest < distance * MINIMUM_HIT_DISTANCE * 0.01) {
    if (nearest < MINIMUM_HIT_DISTANCE || distance > MAXIMUM_TRACE_DISTANCE) {
      return p + nearest * ray_direction;
    }

    distance += nearest;
  }
  return ray_origin + distance * ray_direction;
}

vec3 nearest_color(vec3 p) {
  vec3 normal = calculate_normal(p);
  vec3 P = p;
  vec3 p1 = (p * mat3(0.309017, -0.059717, 0.94918, 0.0, 0.998027, 0.062791, -0.951057, -0.019403, 0.308407));
  return union_color_0(t, p1, normal * mat3(0.309017, -0.059717, 0.94918, 0.0, 0.998027, 0.062791, -0.951057, -0.019403, 0.308407));
}

const float DEG_TO_RAD = PI / 180.0;
vec3 perspective(float fov, vec2 size, vec2 pos) {
  vec2 xy = pos - size * 0.5;

  float cot_half_fov = tan((90.0 - fov * 0.5) * DEG_TO_RAD);
  float z = min(size.x, size.y) * 0.5 * cot_half_fov;

  return normalize(vec3(xy, -z));
}

void main() {
  const float gamma = 2.2;

  vec2 local_coord = gl_FragCoord.xy - viewport.xy;
  vec2 resolution = viewport.zw;
  vec3 dir = camera_matrix * perspective(30.0, resolution, local_coord);

  int steps;
  vec3 hit = march(camera_origin, dir, steps);

  vec3 color;
  float depth = distance(camera_origin, hit);
  float alpha = 1.0;
  if (depth >= MAXIMUM_TRACE_DISTANCE) {
    const vec3 light = pow(vec3(69.0, 72.0, 79.0) / vec3(255.0), vec3(gamma));
    const vec3 dark = pow(vec3(40.0, 42.0, 46.0) / vec3(255.0), vec3(gamma));
    color = vec3(mix(dark, light, (local_coord.x + local_coord.y) / (resolution.x + resolution.y)));
  } else {
    color = nearest_color(hit);
  }

  if (depth >= MAXIMUM_TRACE_DISTANCE || (hit.x+hit.z < 10.0)) {
    float r = length(local_coord/resolution - vec2(0.5));
    if (r > 0.38) {
      color = vec3(0.6, 0.8, 0.6);
      alpha = 1.0;
    }

    if (r > 0.4) {
      alpha = 0.0;
    }
  }


  frag_color = vec4(pow(color, vec3(1.0 / gamma)), alpha);
}`;

export default shader;
