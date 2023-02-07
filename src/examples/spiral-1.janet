(var hue (/ 2 6))
(turtle :width 3 :speed 0
  (set color (hsv hue 1 1))
  (+= hue 0.0002)
  (turn-left 0.08)
  (+= speed 0.01))
