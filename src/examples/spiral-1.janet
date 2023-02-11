(var hue (/ 2 6))
(toodle {:width 3 :speed 0}
  (set self.color (hsv hue 1 1))
  (+= hue 0.0002)
  (turn 0.08)
  (+= self.speed 0.01))
