(each sign [1 -1]
  (toodle
    :color cyan
    :speed 5
    :direction [sign 0]
    :position [-50 -150]
    (turn (* sign 0.005))
    (turn (* sign 0.09 (math/sin (/ age 30 sign))))))
