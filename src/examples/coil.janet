(toodle {:color orange :width 3 :velocity [0 1]}
  (turn 0.01)
  (start
    (def parent self)
    (cloodle
      (def angle (/ age 8))
      (def orbit [(cos angle) (sin angle)])
      (def hue (+ 0.2 (* 0.3 (sin+ (/ age 120)))))
      {:position (+ parent.position (* orbit 20))
       :color (hsv hue 1 1)})))
