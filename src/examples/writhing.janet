(defn fork-turtle [position velocity hue]
  (var can-split true)
  (turtle
    :width 1
    :position position
    :velocity velocity
    :color (hsv hue 1 1)
    (after 1024 (die))
    (turn-left (* 0.5 (- (math/random) 0.5)))
    (when (and can-split (< (math/random) 0.1))
      # for exponential growth, comment out this line
      (set can-split false)
      (fork-turtle position (get-velocity) (+ hue (* 0.1 (- (math/random) 0.5)))))))

(for i 0 5
  (fork-turtle [0 0] [1 0] (/ i 6)))
