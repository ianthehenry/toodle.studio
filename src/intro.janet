(each sign [1 -1]
  (turtle :color cyan :speed 5 :direction [sign 0] :width 1 :position [-50 -150]
    (turn-left (* sign 0.005))
    (turn-left (* sign 0.09 (math/sin (/ age 30 sign))))))
