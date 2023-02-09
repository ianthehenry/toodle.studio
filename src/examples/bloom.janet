(toodle :color green :width 2
  (turn-left (/ 5 (+ (* 0.75 age) 1)))
  (every 120
    (def max-age (rand 100 175))
    (clone :speed (rand 1 3.5)
      (after max-age (die))
      (-= width 0.01)
      (-= speed 0.01)
      (turn-right (/ (* age age) (* 10 100 100))))))
