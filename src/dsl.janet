(use ./helpers)
(use ./globals)
(import ./gl/builtins :as generic)

(defn rotate [[x y] angle]
  (def c (math/cos angle))
  (def s (math/sin angle))

  [(- (* x c) (* y s))
   (+ (* x s) (* y c))])

(defn coin-flip []
  (< (math/random) 0.5))

(defmacro die []
  ~(yield nil))

(defmacro set-velocity [v]
  (with-syms [$v]
    ~(let [,$v ,v]
      (set direction (,normalize ,$v))
      (set speed (,mag ,$v)))))

(defmacro turn-around []
  ~(set direction (* direction -1)))

(defmacro turn [angle]
  ~(set (self :direction) (,rotate (self :direction) ,angle)))

(defmacro turn-left [angle]
  ~(turn ,angle))

(defmacro turn-right [angle]
  ~(turn-left (- ,angle)))

(defmacro every [ticks & body]
  ~(when (and (> (self :age) 0) (= (% (self :age) ,ticks) 0))
    ,;body))

(defmacro after [ticks & body]
  ~(when (> (self :age) ,ticks)
    ,;body))

(defmacro at [ticks & body]
  ~(when (= (self :age) ,ticks)
    ,;body))

(defmacro start [& body]
  ~(at 0 ,;body))

(defn- assert-vec2 [s x]
  (unless (and (indexed? x) (= (length x) 2) (all number? x))
    (errorf "%s should be a tuple [x y] of numbers, got %q" s x))
  x)

(defn- assert-vec4 [s x]
  (unless (and (indexed? x) (= (length x) 4) (all number? x))
    (errorf "%s should be a tuple [r g b a] of numbers, got %q" s x))
  x)

(defn- assert-number [s x]
  (unless (number? x)
    (errorf "%s should be a number, got %q" s x))
  x)

(defmacro doodle [& instructions]
  ~(array/push (dyn ,*doodles*)
    (fiber/new (fn [] ,;instructions) :yei)))

(def toodle-proto
  @{:velocity (fn [self] (generic/* (self :direction) (self :speed)))
    :set-velocity (fn [self v]
      (set (self :speed) (generic/mag v))
      (set (self :direction) (generic/normalize v)))
    })

(defn default-put [t k v] (if (nil? (t k)) (put t k v)))

(defn- new-toodle [arg]
  (def result (case (type arg)
    :table (table/clone arg)
    :struct (struct/to-table arg)
    (error "the first argument to (toodle) should be a struct or table")))
  (table/setproto result toodle-proto)
  (put result :age 0)
  (default-put result :position [0 0])
  (default-put result :speed 1)
  (default-put result :direction [1 0])
  (default-put result :color [1 1 1 1])
  (default-put result :width 1)
  (def v (table/rawget result :velocity))
  (unless (nil? v)
    ((toodle-proto :set-velocity) result v)
    (put result :velocity nil))
  result)

(defmacro toodle [args & instructions]
  (with-syms [$start]
    ~(let [self (,new-toodle ,args)]
      (doodle
        (forever
          (def ,$start (self :position))
          ,;instructions
          (set (self :position) (+ (self :position) (:velocity self)))
          (++ (self :age))
          (yield [,$start (self :position) (self :color) (self :width)])
          )))))

(defmacro cloodle [& args]
  (var initial-width ~1)
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
        :width (set initial-width (next-arg :width))
        :color (set initial-color (next-arg :color))
        (errorf "unknown argument name %q" flag))
      (do
        (-- index)
        (break))))

  (def instructions (tuple/slice args index))

  (with-syms [$get-position]
    ~(doodle
      (defn ,$get-position [age] ,;instructions)
      (var age 0)
      (var past-position (,$get-position age))
      (forever
        (++ age)
        (def next-position (,$get-position age))
        (yield [past-position next-position white 1])
        (set past-position next-position)))))

(defn override [original overrides]
  (def clone
    (case (type original)
      :struct (struct/to-table original)
      :table (table/clone original)
      (errorf "expected struct or table, got %q" original)))
  (eachp [k v] overrides
    (put clone k v))
  clone)

(defmacro clone [args & instructions]
  ~(toodle (,override self ,args) ,;instructions))

(def- smallest-css-alpha (/ 1 255))

(defn fade [a]
  (def [r g b _] (or (dyn *background*) default-background))
  (setdyn *background* [r g b (if (> a 0) (max a smallest-css-alpha) a)]))

(defmacro maybe [p & body]
  ~(when (< (,math/random) ,p)
    ,;body))

