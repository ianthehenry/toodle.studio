(var hue (/ 2 6))
(turtle :width 0.5 :speed 0
  (set color (hsv hue 1 1))
  (+= hue 0.0002)
  (turn-left 0.08)
  (+= speed 0.01)
  (every 3
    (clone :width 1
      (init (turn-right pi/2))
      (after 10 (die)))))
