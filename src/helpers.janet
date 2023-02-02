(defn id [x] x)

(def pi math/pi)
(def tau/2 pi)
(def tau (* 2 tau/2))
(def tau/360 (/ pi 180))

(defn- make-ratio [x y]
  ~(def ,(symbol (string x "/" y)) (/ ,x ,y)))

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

(defn sign [x]
  (cond
    (< x 0) -1
    (> x 0) 1
    0))

(defn clamp [x lo hi]
  (cond
    (< x lo) lo
    (> x hi) hi
    x))

(defn step [edge x]
  (if (< x edge) 0 1))

(defn smoothstep [lo hi x]
  (def t (clamp (/ (- x lo) (- hi lo)) 0 1))
  (* t t (- 3 (* t 2))))

(defn distance [p1 p2]
  (var sum 0)
  (for i 0 (length p1)
    (def x (- (p2 i) (p1 i)))
    (+= sum (* x x)))
  (math/sqrt sum))

(defn dot [a b]
  (var sum 0)
  (for i 0 (length a)
    (+= sum (* (a i) (b i))))
  sum)

(defn mix [x y a]
  (+ (* x a) (* y (- 1 a))))

(defn vec-min [v] (apply min v))
(defn vec-max [v] (apply max v))

(defn fract [x] (mod x 1))

(defn vec-length [v]
  (var sum 0)
  (each x v (+= sum (* x x)))
  (math/sqrt sum))

(defn normalize [v]
  (def len (vec-length v))
  (map |(/ $ len) v))

(defn hsv [h s v &opt a]
  (default a 1)
  (def h (fract h))
  (def s (clamp s 0 1))
  (def v (clamp v 0 1))

  (def m (* v (- 1 s)))
  (def z (* (- v m) (- 1 (math/abs (- (mod (* h 6) 2) 1)))))
  (def h- (* h 6))
  (cond
    (< h- 1) [v (+ z m) m a]
    (< h- 2) [(+ z m) v m a]
    (< h- 3) [m v (+ z m) a]
    (< h- 4) [m (+ z m) v a]
    (< h- 5) [(+ z m) m v a]
             [v m (+ z m) a]))

(defn hsl [h s l &opt a]
  (default a 1)
  (def h (fract h))
  (def s (clamp s 0 1))
  (def l (clamp l 0 1))

  (def c (* s (- 1 (math/abs (- (* 2 l) 1)))))
  (def h- (* 6 h))
  (def x (* c (- 1 (math/abs (- (mod h- 2) 1)))))

  (def [r g b]
    (cond
      (< h- 1) [c x 0]
      (< h- 2) [x c 0]
      (< h- 3) [0 c x]
      (< h- 4) [0 x c]
      (< h- 5) [x 0 c]
               [c 0 x]))

  (def m (- l (* 0.5 c)))
  [(+ r m) (+ g m) (+ b m) a])

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

(def sin math/sin)
(def cos math/cos)
(defn sin+ [x] (* 0.5 (+ 1 (math/sin x))))
(defn cos+ [x] (* 0.5 (+ 1 (math/cos x))))

(defn smoothstep [lo hi x]
  (def t (clamp (/ (- x lo) (- hi lo)) 0 1))
  (* t t (- 3 (* t 2))))

(defn ss [x &opt from-lo from-hi to-lo to-hi]
  (cond
    (nil? from-lo) (smoothstep 0 1 x)
    (nil? from-hi) (smoothstep (min 0 from-lo) (max 0 from-lo) x)
    (nil? to-lo) (smoothstep (min from-lo from-hi) (max from-lo from-hi) x)
    (nil? to-hi) (* (smoothstep (min from-lo from-hi) (max from-lo from-hi) x) to-lo)
    (+ to-lo (* (smoothstep (min from-lo from-hi) (max from-lo from-hi) x) (- to-hi to-lo)))))

(defn symmetric-random [x]
  (- (* 2 x (math/random)) x))

# TODO: could probably use a better name...
(defn marsaglia-sample []
   (var x 0)
   (var y 0)
   (var r2 0)
   (while (or (= r2 0) (> r2 1))
    (set x (symmetric-random 1))
    (set y (symmetric-random 1))
    (set r2 (+ (* x x) (* y y))))

   (def mag (math/sqrt (/ (* -2 (math/log r2)) r2)))
   [(* x mag) (* y mag)])
