(toodle :speed 3 :color green :position [150 -80] :width 2
  (turn (* 0.024 (sin+ (/ age 50))))
  (every 6
    (clone :width 1
      (start (turn pi/2))
      (at 93 (die)))))
