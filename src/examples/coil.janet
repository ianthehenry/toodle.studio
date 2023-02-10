(toodle {:color orange :width 3 :velocity [0 1]}
  (turn 0.01)
  (start
    (def parent self)
    (cloodle
      (def angle (/ self.age 8))
      (def orbit [(cos angle) (sin angle)])
      (+ parent.position (* orbit 20)))))
