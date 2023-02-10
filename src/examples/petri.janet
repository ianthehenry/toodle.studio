(defn spawn [args hue]
  (var split-chance 0.04)
  (def death-chance (* split-chance 0.15))
  (toodle (override args {:color (hsv hue 1 1)})
    (when (> (mag self.position) 400) (die))
    (maybe death-chance (die))
    (turn (rand 0.25))
    (maybe split-chance
      (*= split-chance split-chance)
      (spawn (override self
        {:velocity (normalize (+ (:velocity self) (marsaglia)))})
        (+ hue (rand 0.1))))))

(for i 0 10
  (spawn {:velocity (normalize (marsaglia))}
    (/ i 6)))

(fade 0.02)
