(toodle :color red
  :width 3
  :velocity [0 1]
  (turn 0.01)
  (start
    (cloodle
      (def angle (/ age 8))
      (def orbit [(cos angle) (sin angle)])
      (+ position (* orbit 20)))))
