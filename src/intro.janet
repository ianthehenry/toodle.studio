(turtle :color white :width 2
  (turn-left (/ 5 (+ (* 0.75 age) 1)))
  (every 120
    (clone
      (set speed (+ 0.5 (* 3 (math/random))))
      (life-cycle (math/round (+ 100 (* 75 (math/random))))
        (set width (- 2 (/ age 100)))
        (turn-right (/ (* age age) 100000))
      ))))
