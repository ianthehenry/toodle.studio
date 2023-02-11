# Oh hi! This is a little sandbox for
# playing with turtle graphics. Or
# something close to turtle graphics,
# anyway. Toodle graphics.

# Your program will be compiled as you
# type, but it will not start running
# until you press cmd-enter or
# ctrl-enter, depending on how much
# your computer cost.

# The programs are written in a language
# called Janet, which you can learn
# more about here:
# https://janet-lang.org/

# The example programs on the left are
# hopefully enough for you to get
# started, but let's talk about what
# we're looking at first.

# The Toodle.Studio runtime state is
# basically just a list of generators.
# Each of those generators might have
# their own internal state, but the
# runtime doesn't know anything about
# that. You can add a new generator to
# the set of generators using the
# (doodle) macro.

# Toodle.Studio will resume every
# generator on every frame (roughly 60
# times per second), and each generator
# has a chance to do one of four
# things:

# 1. Yield a line, which is a tuple of
# [start end color width].

# 2. Yield nil, which will cause this
# generator to be removed from the set
# of active generators -- it will not
# be called on any subsequent frame.

# 3. Complete, which is the same as
# yielding nil.

# 4. Raise an error, which is the same
# as yielding nil but will cause a
# message to be printed.

# You probably won't create doodles
# directly (although you *can* -- see
# the "flocking" example). You'll
# probably use the higher-level
# (toodle) macro.

# The (toodle) macro creates a
# turtle-like doodle. In the body of
# the macro, you have access to a value
# called self, which is a Janet table
# of properties: :position, :direction,
# :speed, :color, :width, and :age. The
# body of the macro will be executed
# repeatedly until the turtle dies
# (yields nil), and the turtle will
# then advance by its current velocity
# and yield a new line.

# You can alter the values in the self
# table directly, or you can use macros
# like turn to alter self with a
# slightly more traditional API:

# (defmacro turn [angle]
#   ~(set (self :direction) (,rotate (self :direction) ,angle)))

# There are also some macros to do
# things periodically. Honestly looking
# at their implementations is probably
# the easiest way to explain them:

# (defmacro every [ticks & body]
#   ~(when (and (> (self :age) 0) (= (% (self :age) ,ticks) 0))
#     ,;body))
#
# (defmacro after [ticks & body]
#   ~(when (> (self :age) ,ticks)
#     ,;body))
#
# (defmacro at [ticks & body]
#   ~(when (= (self :age) ,ticks)
#     ,;body))
#
# (defmacro start [& body]
#   ~(at 0 ,;body))

# It's fun to write toodles that behave
# randomly as well. There's a helper
# macro just for doing something with
# a certain probability:

# (defmacro maybe [p & body]
#   ~(when (< (,math/random) ,p)
#     ,;body))

# You also have the helper function
# (rand lo hi) which will produce a
# uniformly-distributed random value in
# the given range, or you can call it
# with one argument to get a value in
# the range (rand -x x). There's also
# (marsaglia) which will return a pair
# of normally-distributed random
# values.

# There's one other high-level macro:
# cloodle. A cloodle is a "closed form"
# doodle. A cloodle is stateless: on
# every frame it will be called with an
# age parameter, and it should return a
# struct with keys {:width :color
# :position}. It will draw a line from
# its previous position to the new
# position. See the "coil" or "symmetry"
# examples for... examples.

# That's... that's all I'm gonna write
# for now. I realize this isn't real
# documentation, but this isn't really
# a real website and I'm tired.

# If you like this, you should check out
# my actual art playground at
# https://bauble.studio. Toodle.Studio
# is a vastly simplified version of
# Bauble.Studio that I made as a
# demonstration of how to embed Janet
# into larger programs, but that turned
# out to be pretty fun by itself!

# Also check out my web log:

# https://ianthehenry.com/

# Love,
#  Ian
