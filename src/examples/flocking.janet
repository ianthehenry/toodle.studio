(def particles @[])
(def particle-count 100)
(for i 0 particle-count
  (array/push particles
    @{:p (scale (marsaglia-sample) 128)
      :v (scale (marsaglia-sample) 3)
      :h (math/random)
      :w 1}))

(var centroid [0 0])
(defn calculate-centroid []
  (set centroid [0 0])
  (each particle particles
    (set centroid (translate centroid (particle :p))))
  (set centroid (scale centroid (/ (length particles)))))

(defn mix [w2 [x1 y1] [x2 y2]]
  (def w1 (- 1 w2))
  [(+ (* w1 x1) (* w2 x2)) (+ (* w1 y1) (* w2 y2))])

(defn sub [[x1 y1] [x2 y2]]
  [(- x1 x2) (- y1 y2)])

(turtle :width 5 :speed 2 :color white :position [150 -50]
  (turn-left 0.005)
  (turn-left (* 0.035 (math/sin (/ age 30))))

  (init (eachp [i particle] particles
    (array/push (dyn :doodles)
      (fiber/new (fn []
        (def speed (math/random))
        (forever
          (when (= i 0)
            (calculate-centroid))
          (def target position)
          (def start (particle :p))

          (def attraction (sub target start))
          (def repulsion (sub start centroid))

          (var desired-v (translate (scale (marsaglia-sample) 10) (scale attraction 0.05)))
          (set (particle :v) (mix 0.01 (particle :v) desired-v))

          (def amt (/ (math/pow (vec-length repulsion) 2)))

          (set (particle :v)
            (translate (particle :v)
              (scale repulsion (* speed (min amt 10)))))

          (def end (translate start (particle :v)))
          (yield [start end (hsv (+ (/ age 180) speed) 1 1) (particle :w)])
          (set (particle :p) end))
      ) :yei)))))

(fade 0.1)
