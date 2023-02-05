(turtle :color green :width 2
  (turn-left (/ 5 (+ (* 0.75 age) 1)))
  (every 120
    (def max-age (math/round (+ 100 (* 75 (math/random)))))
    (clone :speed (+ 0.5 (* 3 (math/random)))
      (after max-age (die))
      (set width (- 2 (/ age 100)))
      (turn-right (/ (* age age) (* 10 100 100))))))
