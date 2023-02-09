(toodle :color red
  :width 3
  :velocity [0 1]
  (turn 0.01)
  (start
    (cloodle
      (def angle (/ age 8))
      (def orbit [(math/cos angle) (math/sin angle)])
      (translate position (scale orbit 20)))))
