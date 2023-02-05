(each sign [1 -1]
  (turtle :color cyan :speed 5 :direction [sign 0] :width 3
    (set width (+ 0.01 (ss (* (sin (+ (if (= sign 1) pi/6 0) 0 (/ age 30 sign))) ) 0 1 0 1)))
    (turn-left (* sign 0.01))
    (turn-left (* sign 0.1 (math/sin (/ age 30 sign))))))
