(toodle :speed 3 :position [100 50]
  (turn-left (* 0.1 (math/sin (/ age 17))))
  (turn-left 0.01)
  (set width (+ 2 (math/sin (/ age 17))))
  (def hue (* 0.5 (+ 1 (math/sin (/ age 85)))))
  (set color (hsv hue 1 1)))
