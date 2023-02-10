(toodle :width 0.5 :speed 0
  (set color (hsv (* (/ 1 6) (cos+ (/ age 400))) 1 1))
  (turn 0.08)
  (+= speed 0.01)
  (every 3
    (clone
      (start (turn-right pi/2))
      (set width (- 1 (/ age 12)))
      (after 10 (die)))))
