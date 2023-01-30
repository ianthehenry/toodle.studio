(use ./globals)
(defn run [env]
  (def turtles (env *turtles*))

  (def new-turtles @[])
  (def lines @[])
  (each turtle turtles
    (def next-action (resume turtle))
    (match (fiber/status turtle)
      :pending
        (unless (nil? next-action)
          (array/push new-turtles turtle)
          (array/push lines next-action))
      :error (eprintf "turtle error %q" next-action)
      :dead ()
      _ (error "unexpected next-action")))

  # TODO: this is pretty inefficient...
  (array/clear turtles)
  (array/concat turtles new-turtles)

  lines)
