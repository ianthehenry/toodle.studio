(import ./gl/builtins :prefix "" :export true)

(defn id [x] x)

(def pi math/pi)
(def -pi (- pi))
(def tau/2 pi)
(def -tau/2 -pi)
(def tau (* 2 tau/2))
(def -tau (* 2 -tau/2))
(def tau/360 (/ pi 180))
(def -tau/360 (/ pi -180))

(defn- make-ratio [x y]
  ~(upscope
    (def ,(symbol (string x "/" y)) (/ ,x ,y))
    (def ,(symbol (string "-" x "/" y)) (/ ,x (- ,y)))))

(eval ~(upscope ,;(map |(make-ratio 'pi $) (range 2 13))))
(eval ~(upscope ,;(map |(make-ratio 'tau $) (range 3 13))))

(defn deg [x] (* tau/360 x))
(defn tau* [x] (* tau x))
(defn tau/ [x] (/ tau x))
(defn pi* [x] (* pi x))
(defn pi/ [x] (/ pi x))

(defn hex-rgb [hex]
  (let [r (-> hex (band 0xff0000) (brshift 16))
        g (-> hex (band 0x00ff00) (brshift 8))
        b (-> hex (band 0x0000ff))]
    [(/ r 0xff) (/ g 0xff) (/ b 0xff)]))

(def- sat 1)

(def red (hsv (/ 0 6) sat 1))
(def orange (hsv (/ 0.25 6) sat 1))
(def yellow (hsv (/ 1 6) sat 1))
(def green (hsv (/ 2 6) sat 1))
(def cyan (hsv (/ 3 6) sat 1))
(def sky (hsv (/ 3.5 6) sat 1))
(def blue (hsv (/ 4 6) sat 1))
(def purple (hsv (/ 4.5 6) sat 1))
(def magenta (hsv (/ 5 6) sat 1))
(def hot-pink (hsv (/ 5.5 6) sat 1))
(def white [1 1 1 1])
(def light-gray [0.75 0.75 0.75 1])
(def gray [0.5 0.5 0.5 1])
(def dark-gray [0.25 0.25 0.25 1])
(def black [0 0 0 1])

(defn rand [lo &opt hi]
  (if (nil? hi)
    (rand (- lo) lo)
    (let [spread (- hi lo)]
      (+ lo (* spread (math/random))))))

# returns a tuple of two normally distributed numbers around 0-1
(defn marsaglia []
   (var x 0)
   (var y 0)
   (var r2 0)
   (while (or (= r2 0) (> r2 1))
    (set x (rand 1))
    (set y (rand 1))
    (set r2 (+ (* x x) (* y y))))

   (def mag (math/sqrt (/ (* -2 (math/log r2)) r2)))
   [(* x mag) (* y mag)])
