(defn scale-pos [turtle scale]
  {:width turtle.width
   :color turtle.color
   :position (* scale turtle.position)})

(toodle {}
  (turn (/ tau 600))
  (turn (* 0.1
    (sin (/ self.age 31))
    (sin+ (+ 10 (/ self.age 51)))))
  (set self.color (hsv (sin (/ self.age 600)) 1 1))
  (start
    (cloodle (scale-pos self [1 -1]))
    (cloodle (scale-pos self [-1 1]))
    (cloodle (scale-pos self [-1 -1]))))
