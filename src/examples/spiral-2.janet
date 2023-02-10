(toodle {:width 0.5 :speed 0}
  (set self.color (hsv (* (/ 1 6) (cos+ (/ self.age 400))) 1 1))
  (turn 0.08)
  (+= self.speed 0.01)
  (every 3
    (clone {}
      (start (turn-right pi/2))
      (set self.width (- 1 (/ self.age 12)))
      (after 10 (die)))))
