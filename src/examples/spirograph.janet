(defmacro hz [x]
  ~(* ,x (/ age 60)))

(defn spiro [pivot point angle]
  (+ pivot (rotate point angle)))

(for i 0 10
  (def r (+ 100 (* i 20)))
  (def h (+ 0.5 (* 0.2 (/ i 10))))

  (cloodle
    {:color (hsv h 1 1)
     :position
      (spiro
        (spiro
          [0 0]
          [r 0]
          (hz 2))
        (spiro [0 20] [20 0] (hz 20))
        (hz 2.1))}))
