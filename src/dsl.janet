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

(defmacro turtle [start-pos start-vel & instructions]
  (with-syms [$vel] ~(do
    (let [,$vel ,start-vel]
      (array/push (dyn ,*turtles*)
        (fiber/new (fn []
          (var position ,start-pos)
          (var direction (normalize ,$vel))
          (var speed (vec-length ,$vel))
          (var width 1)
          (var color [0 0 0 1])
          (var age 0)
          (forever
            ,;instructions
            (advance))
          ) :yei)
        )))))

(defmacro clone [& instructions]
  (with-syms [$pos $v]
    ~(let [,$pos position ,$v (get-velocity)]
      (turtle ,$pos ,$v ,;instructions))))
