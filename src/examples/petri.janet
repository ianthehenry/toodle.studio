(defn spawn [position velocity hue]
  (var split-chance 0.03)
  (def death-chance 0.005)
  (turtle
    :position position
    :velocity velocity
    :color (hsv hue 1 1)
    (when (> (vec-length position) 400)
      (*= speed -1)
      (set position (translate position (get-velocity))))
    (maybe death-chance
      (die))
    (turn (rand 0.25))
    (maybe split-chance
      (*= split-chance split-chance)
      (spawn
        position
        (normalize (translate (get-velocity) (marsaglia-sample)))
        (+ hue (rand 0.1))))))

(for i 0 10
  (spawn [0 0] (normalize (marsaglia-sample)) (/ i 6)))

(fade 0.02)
