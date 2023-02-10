(import ./util)
(use ./builtin-macros)
(use ./glsl-ports)

(make-generic-1 sin :f math/sin)
(make-generic-1 cos :f math/cos)
(make-generic-1 abs :f math/abs)
(make-generic-1 round :f math/round)
(make-generic-1 floor :f math/floor)
(make-generic-1 ceil :f math/ceil)
(make-generic-1 sqrt :f math/sqrt)
(make-generic-1 fract)
(make-generic-1 sign)

(make-generic-1 atan :f math/atan)
(make-generic-2 atan2 :f math/atan2 :glf atan2)
(make-generic-2 max)
(make-generic-2 min)
(make-generic-2 mod)

(def- min- min)
(defn min [a &opt b]
  (if (nil? b)
    (vec-min a)
    (min- a b)))

(def- max- max)
(defn max [a &opt b]
  (if (nil? b)
    (vec-max a)
    (max- a b)))

(make-generic-2 step)

(make-generic-2 pow :f math/pow)

(make-generic-1 neg :f |(- $))
(make-generic-1 recip :f |(/ $))

(make-variadic + identity)
(make-variadic - neg)
(make-variadic * identity)
(make-variadic / recip)

(make-generic-3 smoothstep)
(make-generic-3 clamp)
(make-generic-3 mix)

(defn ss [x &opt from-lo from-hi to-lo to-hi]
  (cond
    (nil? from-lo) (smoothstep 0 1 x)
    (nil? from-hi) (smoothstep 0 from-lo x)
    (nil? to-lo) (smoothstep from-lo from-hi x)
    (nil? to-hi) (* (smoothstep from-lo from-hi x) to-lo)
    (+ to-lo (* (smoothstep from-lo from-hi x) (- to-hi to-lo)))))

(defn remap+ [x]
  (* 0.5 (+ x 1)))

(make-generic-1 rotate-x-matrix)
(make-generic-1 rotate-y-matrix)
(make-generic-1 rotate-z-matrix)

# Helpers

(defn rgb [r g b] [(/ r 255) (/ g 255) (/ b 255)])

(defn hsv-deg [h s v] (hsv (/ h 360) s v))

(defn hsl-deg [h s l] (hsl (/ h 360) s l))

(defn sin+ [x]
  (remap+ (sin x)))

(defn sin- [x]
  (- 1 (sin+ x)))

(defn cos+ [x]
  (remap+ (cos x)))

(defn cos- [x]
  (- 1 (cos+ x)))

(defmacro += [expr value]
  ~(set ,expr (+ ,expr ,value)))
(defmacro *= [expr value]
  ~(set ,expr (* ,expr ,value)))
(defmacro /= [expr value]
  ~(set ,expr (/ ,expr ,value)))
(defmacro -= [expr value]
  ~(set ,expr (- ,expr ,value)))

# direct exports

(def hsv hsv)
(def hsl hsl)
(def normalize normalize)
(def mag mag)
(def vec-min vec-min)
(def vec-max vec-max)
(def distance distance)
(def dot dot)
