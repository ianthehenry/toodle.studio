(use ./util)

(defn- map-vec-l [f vec x]
  (def len (length vec))
  (def result (array/new len))
  (for i 0 len
    (set (result i) (f (vec i) x)))
  (tuple/slice result))

(defn- map-vec-r [f x vec]
  (def len (length vec))
  (def result (array/new len))
  (for i 0 len
    (set (result i) (f x (vec i))))
  (tuple/slice result))

(defn- find-vec-len [args]
  (var result nil)
  (each arg args
    (unless (number? arg)
      (def len (length arg))
      (if (nil? result)
        (set result len)
        (assert (= result len) "vector length mismatch"))))
  result)

(defn- num-to-array [x len]
  (if (number? x)
    (array/new-filled len x)
    x))

# TODO: so much copy and pasted code here...

(defmacro make-generic-1 [name &named f]
  (assert (symbol? name))
  (assert (not= name 'a))
  (def $prim-f (gensym))
  (default f name)
  ~(upscope
    (def- ,$prim-f ,f)
    (defn ,name [a]
      (cond
        (number? a) (,$prim-f a)
        (,vec? a) (map ,name a)
        (error "expected number or vector")))))

(defmacro make-generic-2 [name &named f]
  (assert (symbol? name))
  (assert (not= name 'a))
  (assert (not= name 'b))
  (def $prim-f (gensym))
  (default f name)
  ~(upscope
    (def- ,$prim-f ,f)
    (defn ,name [a b]
      (cond
        (and (number? a) (number? b)) (,$prim-f a b)
        (and (,vec? a) (number? b)) (,map-vec-l ,name a b)
        (and (number? a) (,vec? b)) (,map-vec-r ,name a b)
        (and (,vec? a) (,vec? b))
          (if (,same-length? a b)
            (,zip-with2 ,name a b)
            (error "vector length mismatch"))
        (error "need numbers or vectors")))))

(defmacro make-generic-3 [name &named f]
  (assert (symbol? name))
  (assert (not- in? name ['a 'b 'c 'args]))
  (def $prim-f (gensym))
  (default f name)
  ~(upscope
    (def- ,$prim-f ,f)
    (defn ,name [a b c]
      (def args [a b c])
      (if (all number? args)
        (,$prim-f a b c)
        (if (all |(or (number? $) (,vec? $)) args)
          (let [len (,find-vec-len args)]
            (,zip-with3 ,name
              (,num-to-array a len)
              (,num-to-array b len)
              (,num-to-array c len)))
          (error "missing args"))))))

(defn- variadic [f one]
  (fn [& args]
    (cond
      (= (length args) 1) (one (args 0))
      (= (length args) 2) (f (args 0) (args 1))
      (reduce2 f args))))

(defmacro make-variadic [name one]
  ~(upscope
    (make-generic-2 ,name)
    (def ,name (,variadic ,name ,one))))
