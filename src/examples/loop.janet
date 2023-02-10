(toodle :speed 3 :position [100 50]
  (turn 0.01)
  (turn (* 0.1 (sin (/ age 17))))
  (set width (+ 2 (sin (/ age 17))))
  (def hue (* 0.5 (+ 1 (sin (/ age 85)))))
  (set color (hsv hue 1 1)))
