(use ./globals)
(defn run [env]
  (def doodles (env *doodles*))

  (def new-doodles @[])
  (def lines @[])
  (each turtle doodles
    (def next-action (resume turtle))
    (match (fiber/status turtle)
      :pending
        (unless (nil? next-action)
          (array/push new-doodles turtle)
          (array/push lines next-action))
      :error (eprintf "turtle error %q" next-action)
      :dead ()
      _ (error "unexpected next-action")))

  # TODO: this is pretty inefficient...
  (array/clear doodles)
  (array/concat doodles new-doodles)

  lines)
