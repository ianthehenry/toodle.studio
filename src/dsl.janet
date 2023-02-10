(use ./helpers)
(use ./globals)
(import ./gl/builtins :as generic)

(defn rotate [[x y] angle]
  (def c (math/cos angle))
  (def s (math/sin angle))

  [(- (* x c) (* y s))
   (+ (* x s) (* y c))])

(defmacro die []
  ~(yield nil))

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

(def- toodle-proto
  @{:velocity (fn [self] (generic/* (self :direction) (self :speed)))
    :set-velocity (fn [self v]
      (set (self :speed) (generic/mag v))
      (set (self :direction) (generic/normalize v)))
    })

(defn- default-put [t k v] (if (nil? (t k)) (put t k v)))

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

(defn ?? [x dflt] (if (nil? x) dflt x))
(defn- extract-position [state] (if (dictionary? state) (state :position) state))
(defn- extract-key [state key dflt] (if (dictionary? state) (?? (state key) dflt) dflt))
(defmacro cloodle [& instructions]
  (with-syms [$next-state]
    ~(doodle
      (defn ,$next-state [age] ,;instructions)
      (var age 0)
      (var previous-position (,extract-position (,$next-state age)))
      (forever
        (def next-state (,$next-state age))
        (def position (,extract-position next-state))
        (def color (,extract-key next-state :color [1 1 1 1]))
        (def width (,extract-key next-state :width 1))
        (yield [previous-position position color width])
        (++ age)
        (set previous-position position)))))

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

