(use ./helpers)
(use ./globals)

(defn rotate [[x y] angle]
  (def c (math/cos angle))
  (def s (math/sin angle))

  [(- (* x c) (* y s))
   (+ (* x s) (* y c))])

(defn scale [[x y] s]
  [(* s x) (* s y)])

(defn translate [[x1 y1] [x2 y2]]
  [(+ x1 x2) (+ y1 y2)])

(defn coin-flip []
  (< (math/random) 0.5))

(defmacro die []
  ~(yield nil))

(defmacro get-velocity []
  ~(,scale direction speed))

(defmacro set-velocity [v]
  (with-syms [$v]
    ~(let [,$v ,v]
      (set direction (,normalize ,$v))
      (set speed (,vec-length ,$v)))))

(defmacro turn-around []
  ~(set direction (,scale direction -1)))

(defmacro turn-left [angle]
  ~(set direction (,rotate direction ,angle)))

(defmacro turn-right [angle]
  ~(set direction (,rotate direction (- ,angle))))

(defmacro every [ticks & body]
  ~(when (and (> age 0) (= (% age ,ticks) 0))
    ,;body))

(defmacro after [ticks & body]
  ~(when (> age ,ticks)
    ,;body))

(defmacro at [ticks & body]
  ~(when (= age ,ticks)
    ,;body))

(defmacro init [& body]
  ~(when (= age 0)
    ,;body))

(defmacro advance []
  ~(do
    (def start position)
    (set position (translate position (get-velocity)))
    (++ age)
    (yield [start position color width])))

(defmacro life-cycle [max-age & instructions]
  (with-syms [$max-age]
    ~(let [,$max-age ,max-age]
      (while (< age ,$max-age)
        ,;instructions
        (advance))
      (die))))

(defn- assert-vec2 [s x]
  (unless (and (tuple? x) (= (length x) 2) (all number? x))
    (errorf "%s should be a tuple [x y] of numbers, got %q" s x))
  x)

(defn- assert-vec4 [s x]
  (unless (and (tuple? x) (= (length x) 4) (all number? x))
    (errorf "%s should be a tuple [r g b a] of numbers, got %q" s x))
  x)

(defn- assert-number [s x]
  (unless (number? x)
    (errorf "%s should be a number, got %q" s x))
  x)

(defmacro turtle [& args]
  # TODO: I appear to have discovered a crazy Janet bug.
  # If I use quote instead of quasiquote, initial-color will
  # resolve to a tuple that is not bracketed. All the others are still bracketed.
  # It also seems to be sensitive to the value itself: if I change it to a different
  # initial color, it works correctly.
  # I can't reproduce this outside of this file, though. It might be some kind of hash collision?
  # I don't understand how they could be different in any way.
  # Repros on 1.24.0-34496ec, will have to test a newer version.
  (var initial-position ~[0 0])
  (var initial-width ~1)
  (var initial-speed ~1)
  (var initial-direction ~[1 0])
  (var initial-velocity nil)
  (var initial-color ~[0 0 0 1])

  (var index 0)
  (defn next-arg [&opt reason]
    (if (= index (length args))
      (errorf "no arguments for %q" reason))
    (def result (in args index))
    (++ index)
    result)

  (while (< index (length args))
    (def flag (next-arg))
    (if (keyword? flag)
      (case flag
        :velocity (set initial-velocity (next-arg :velocity))
        :width (set initial-width (next-arg :width))
        :position (set initial-position (next-arg :position))
        :direction (set initial-direction (next-arg :direction))
        :speed (set initial-speed (next-arg :speed))
        :color (set initial-color (next-arg :color))
        (errorf "unknown argument name %q" flag))
      (do
        (-- index)
        (break))))

  (def instructions (tuple/slice args index))

  (with-syms [$vel]
    ~(let [,$vel ,(if initial-velocity ~(,assert-vec2 "velocity" ,initial-velocity) nil)]
      (array/push (dyn ,*doodles*)
        (fiber/new (fn []
          (var position (,assert-vec2 "position" ,initial-position))
          (var direction (if ,$vel (,normalize ,$vel) (,assert-vec2 "direction" ,initial-direction)))
          (var speed (if ,$vel (,vec-length ,$vel) (,assert-number "speed" ,initial-speed)))
          (var width (,assert-number "width" ,initial-width))
          (var color (,assert-vec4 "color" ,initial-color))
          (var age 0)
          (forever
            ,;instructions
            (advance))
          ) :yei)
        ))))

(defmacro clone [& instructions]
  ~(turtle
    :position position
    :direction direction
    :speed speed
    :width width
    :color color
    ,;instructions))
