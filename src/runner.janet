(use ./globals)

(defn- zip-all [t predicates]
  (var result true)
  (for i 0 (length t)
    (unless ((predicates i) (t i))
      (set result false)
      (break)))
  result)

(defn- tuple-of? [t predicates]
  (and
    (tuple? t)
    (= (length t) (length predicates))
    (zip-all t predicates)))

(defn- point? [x]
  (tuple-of? x [number? number?]))

(defn- color? [x]
  (tuple-of? x [number? number? number? number?]))

(defn- line? [x]
  (tuple-of? x [point? point? color? number?]))

(defn run [env]
  (def doodles (env *doodles*))

  (def new-doodles @[])
  (def lines @[])
  (each doodle doodles
    (def next-action (resume doodle))
    (match (fiber/status doodle)
      :pending
        (cond
          (nil? next-action) ()
          (line? next-action) (do
            (array/push new-doodles doodle)
            (array/push lines next-action))
          (eprintf "illegal yield %q" next-action))
      :error (eprintf "doodle error %q" next-action)
      :dead ()
      _ (error "unexpected next-action")))

  # TODO: this is pretty inefficient...
  (array/clear doodles)
  (array/concat doodles new-doodles)

  lines)

(defn get-bg [env]
  (def bg (in env *background*))
  (cond
    (nil? bg) default-background
    (color? bg) bg
    (do
      (eprintf "invalid background %q" bg)
      default-background)))
