(toodle {:speed 3 :position [100 50]}
  (turn 0.01)
  (turn (* 0.1 (sin (/ self.age 17))))
  (set self.width (+ 2 (sin (/ self.age 17))))
  (def hue (* 0.5 (+ 1 (sin (/ self.age 85)))))
  (set self.color (hsv hue 1 1)))
