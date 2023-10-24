# Practical functional programming

Not a fan of long intros. The thesis of this article is that practical FP is great and you should adopt it. Here's how it looks like:

```Typescript
server.route({
  method: 'GET',
  path: '/stories/{id}',
  handler: (request, h) =>
    pipe(
      request.params.id,
      parseNumberParam('id'),
      TE.fromEither,
      TE.flatMap(fetchStory),
      TE.mapLeft(internalError(h)),
      TE.chainEitherK(someOr404(h)),
      TE.map(h.response),
      TE.getOrElse(T.of)
    )()
})
```

This is not an artifical example. This is a completely real code that I'm using in completely real project that I'm doing for a completely real client. It's concise, it's statically typed checked, and it's made of atomic reusable functions.

I'll try to briefly explain how this works, but the primary context of this article is not to teach you FP, but to make a case why is it a better fit for real-world projects, and show it's advantages. If you don't understand what a monad or functor are, don't worry, I don't either. **I'm not a functional programmer, I'm a practical one.**

## Pipe

Let's start with `pipe`. This example should make it obvious. Obviously, it is a synthetic one, but it very closely mimics how a lot of real production code works.

```Typescript
pipe(
  'This is a test sentence',
  splitIntoWords,
  countWords,
  (result) => `The word count is: ${result}`,
  console.log // You are not supposed to do side-effects in FP. I don't care.
)
```

Pipe directs ouptut of the previous function to the next one. Just to clarify, here are all the helper functions:

```Typescript
const splitIntoWords = (sentence: string): string[] => sentence.split(' ')
const countWords = (words: string[]): number => words.length
```

For comparison, here's how it could look in traditional Typescript:

```Typescript
console.log(
  `The word count is: ${countWords(
    splitIntoWords('This is a test sentence')
  )}`
)
```

In my humble opinion, this looks like a mess. It's hard to read and parse with youre enes. Let's forget about it and write it in a saner way:

```Typescript
const input = 'This is a test sentence'
const words = splitIntoWords(input)
const wordCount = countWords(words)
const result = `The word count is: ${wordCount}`
console.log(result)
```

This is almost as good as the `pipe` example, but it introduces a lot of variables. When I see a variable, I immediately have to look through the whole function after it so that I keep a track record in my head — **what does it affect**? It could be used anywhere in the following code. With `pipe`, I know that the output of a function will be used only as an input of the next function. Limitations make code easier to understand and reason about.

Now, let's modify the code sample above.

```patch
+const filterShortWords = (words: string[]): string[] =>
+  words.filter((word) => word.length > 3)

 const input = 'This is a test sentence'
 const words = splitIntoWords(input)
+const shortWords = filterShortWords(words)
 const wordCount = countWords(words)
 const result = `The word count is: ${wordCount}`
 console.log(result)
 ```

Do you see the bug? I guess you do, it's pretty obvious. It would also be caught by a linter, but type system accepts it just fine, and we always want to **make invalid code not compilable**. But remember — this is a synthetic example which I specifically created to make things clear. This is not caught by the language, and we often don't pay attention to linter's warnings when we're deep into some fundamental code change — well, at least I do.

Here's the `pipe` version with the same change:

```patch
 pipe(
   'This is a test sentence',
   splitIntoWords,
+  filterShortWords,
   countWords,
   (result) => `The short word count is: ${result}`,
   console.log
 )
```

It doesn't have that bug. It's impossible to make it in the first place.

## Flow

`pipe`'s brother without an argument. Let's turn the example above into a function:

```Typescript
const doStuff = (sentence: string) =>
  pipe(
    sentence,
    splitIntoWords,
    countWords,
    (result) => `The word count is: ${result}`,
    console.log
  )
```

And here's exactly the same function implemented with `flow`:

```Typescript
const doStuff = flow(
  splitIntoWords,
  countWords,
  (result) => `The word count is: ${result}`,
  console.log
)
```

Notice something different? Instead of actually running the functions on the very first argument like `pipe`, `flow` just returns the function that combines all argument functions in sequence. The whole point of functional programming is to operate on functions, combining them into more complex ones, so `flow` comes in very handy.

## Currying

This piece of code also uses a pipe — but now we don't just reference the functions, we're actually calling them:

```Typescript
const finalOrderPrice = pipe(
  order,
  calculateTotalPrice,
  applyDiscount(discount),
  applyTax(tax),
  roundToTwoDecimalPlaces
)
```

What's going on? Isn't the `pipe` supposed to pass the argument down into `applyDiscount`? Well, it is, but `applyDiscount` is a curried function. Let's see how it's implemented:

```Typescript
const applyDiscount = (discount: number) => (price: number) =>
  price - price * discount
```

It looks very similar to a function that takes two arguments, but it's not. It's a function that takes one argument and returns another function that takes one argument. The result of `applyDiscount(discount)` call isn't the final value, but a function `(price: number) => price - price * discount`, and only when `pipe` passes the price into it, we get the final result. If we didn't use currying, we would have to write it like this:

```Typescript
const finalOrderPrice = pipe(
  order,
  calculateTotalPrice,
  (price) => applyDiscount(discount, price),
  (priceWithDiscount) => applyTax(tax, priceWithDiscount),
  roundToTwoDecimalPlaces
)
```

This may look like unncessarry complication, and honestly — often, it is. If you find yourself constantly using your function `likeThis(arg1)(arg2)`, then it probably shouldn't have been curried in the first place. But when you know for a fact that, for example, you will often know the discount much earlier than you would know the price, then it makes sense to curry the function.

Personally, I think of currying as something very similar to **dependency injection**. In a very OOP codebase, the same logic could look like this:

```Typescript
class DiscountApplier {
  private discountRate: number;

  constructor(discountRate: number) {
    this.discountRate = discountRate;
  }

  applyDiscount(price: number): number {
    return price * (1 - this.discountRate);
  }
}
```

May be it doesn't really make sense for a simple function with two arguments, but you should remember that in real world code it could have been much more complex logic with a lot of heavy dependencies like database connections, network requests, etc.

## Either

In this example, we want to read a file from disk and parse it as JSON. But as it often is, the detail is how to handle failures. Let's introduce an error handling requirement: we must **output certain known errors to the user** and **let unknown errors throw**.

Now, let's build the same functionality in functional and traditional way. In functional case, we use functions which returns `Either` and thus have `E` suffix, and in traditional case, we use functions that throw exceptions and use `Ex` suffix.

```Typescript
function processFile(filename: string) {
  try {
    const fileData = readFileEx(filename)
    const jsonData = parseJsonEx(fileData)
    console.log(jsonData)
  } catch (error) {
    if (error instanceof FileNotFoundError) {
      console.error('Error: File Not Found')
    } else if (error instanceof JSONParseError) {
      console.error('Error: Invalid JSON')
    } else {
      throw error
    }
  }
}
```

Here, we assume that functions with `Ex` suffix throw their own subclasses of exceptions. But this assumption can't be type-checked! We could easily change `readFileEx` to also throw `InvalidFilenameError` error and never get any compile-time error about this assumption being broken.

The seond downside, for me, is that the code which performs the operation and code that handles the failure condition are split apart into different parts of the function. This might not seem like a great deal in this artificially small example, but you have to remember that in real world these things seem to get much longer and rarely fit into a single screen.

And finally, you can easily forget to handle the unknown error case! You could've easily written this code without `else { throw error }` at the end, and it also most likely would not be caught by reviews and tests.

Here's how I would write this function with `fp-ts`:

```Typescript
const processFile = flow(
  readFileE,
  E.mapLeft(() => 'Error: File Not Found'),
  E.chain(
    flow(
      parseJsonE,
      E.mapLeft(() => 'Error: Invalid JSON')
    )
  ),
  E.fold(console.error, console.log)
)
```

<details>

<summary>What is Either?</summary>

In this example, we use functions with `E` suffix that return `Either`. It is a helper type which essentially looks like this:

```Typescript
type Result<TError, TSuccess> =
  | { _tag: 'Error'; error: TError }
  | { _tag: 'Success'; success: TSuccess }
```

Except that it's `Either` instead of `Result` and `Error` is `Left` and `Right` is `Success`:

```Typescript
type Either<Left, Right> =
  | { _tag: 'Left'; left: Left }
  | { _tag: 'Right'; right: Right }
```

I think that `Result` would make much more sense for 95% of cases where it is used, but by this point I'm already used to it.

</details>

Code above may be a bit hard to parse at first. Here's how I visualize it in my head, going from top to bottom:

```ascii
                    * readFileE
                   /|
     File not found |
    /               * parseJsonE
   |               /|
   |  Invalid JSON  |
   |/               |
   * console.error  * console.log

```

The important thing to understand is that functions like `E.chain` and `E.map` operate on the _right_ value. If `Either` is already _left_, it's value is passed to the next function intact. Conversely, `E.mapLeft` changes the _left_ value, mapping any kind of error to a constant function. But if the `Either` passed into it is _right_, it does nothing.

<details>

<summary>What's E?</summary>

There's a convention to import different modules from `fp-ts` like this:

```Typescript
import * as O from 'fp-ts/Option'
import * as E from 'fp-ts/Either'
```

It's neccessary because both `Option` and `Either` have `map` function, but `E.map` operates on `Either` whereas `O.map` operates on `Option`, and you're likely to use both.

If I was smarter, I would use this as an opportunity to explain what type classes are.
</details>

It takes some time to learn to read this code, but I think it's much easier to follow and concise — you handle the operation and it's error condition at one place and then go on to the next one. You also don't have to use custom exception types to tell apart errors from different sources.

But more importantly, it prevents bugs. Let's play the game with the diff again:

```patch
 try {
   const fileData = readFileEx('file.json')
   const jsonData = parseJsonEx(fileData)
-  console.log(jsonData)
+  const manipulatedData = manipulateDataEx(jsonData)
+  console.log(manipulatedData)
 } catch (error) {
   if (error instanceof FileNotFoundError) {
     console.error('Error: File Not Found')
```

This code compiles without any problems. Can you spot the bug? This code **breaks the requierement of showing knowng errors to the user**! Turns out, that in `manipulateDataEx` function we actually throw `InvalidDataError`, but neither compiler or linter know anyhting about this — so when user submits invalid data, instead of a nice message in the UX the whole application will crash.

Now, let's make the same change in the functional version. As before, we'll use `manipulateDataE` function which would return `E.Either<InvalidDataError, Data>`:

```patch
 const processFile = flow(
   readFileE,
   E.mapLeft(() => 'Error: File Not Found'),
   E.chain(
     flow(
       parseJsonE,
       E.mapLeft(() => 'Error: Invalid JSON')
     )
   ),
+  manipulateDataE,
   E.fold(console.error, console.log)
 )
```

However, this time we immediately get Typescript error (I removed irrelevant parts):

> Type 'Either<InvalidDataError, Data>' is not assignable to type 'Data'.

The cause is evident: we're using the function that accepts `Data`, but we need to use a function that accepts `Either<InvalidDataError, Data>`. **Type checker forces us to explicitly handle the error case!** The only way to appease type system is to add handling for the error:

```patch
 const processFile = flow(
   readFileE,
   E.mapLeft(() => 'Error: File Not Found'),
   E.chain(
     flow(
       parseJsonE,
       E.mapLeft(() => 'Error: Invalid JSON')
     )
   ),
+  E.chain(
+    flow(
+      manipulateDataE,
+      E.mapLeft(() => 'Error: Data Manipulation Error')
+    )
+  ),
   E.fold(console.error, console.log)
 )
```

<details>

<summary>But console.error accepts any!</summary>

If you noticed my error in the snippet above, you get bonus points! Yes, this would actually work:

```patch
 const processFile = flow(
   readFileE,
   E.mapLeft(() => 'Error: File Not Found'),
   E.chain(
     flow(
       parseJsonE,
       E.mapLeft(() => 'Error: Invalid JSON')
     )
   ),
+  E.chain(manipulateDataE),
   E.fold(console.error, console.log)
 )
```

Because `console.error` accepts `any`, which would include `InvalidDataError`. However, this is a synthetic example and I only use `console` for readability. In real world code that I'm building this on the handler function only accepts `string`, so you would have to convert `InvalidDataError` to `string`.

</details>


## TaskEither

And the final piece of the puzzle — `TaskEither`. I should have probably explained `Task` first, but I think that this version of code from the previous section makes the big picture pretty self-evident:

```Typescript
  const processFile = flow(
    readFileE,
    TE.mapLeft(() => 'Error: File Not Found'),
    TE.chain(
      flow(
        parseJsonE,
        TE.mapLeft(() => 'Error: Invalid JSON')
      )
    ),
    TE.chain(
      flow(
        manipulateDataE,
        TE.mapLeft(() => 'Error: Data Manipulation Error')
      )
    ),
    TE.fold(flow(console.error, T.of), flow(console.log, T.of))
  )
```

That's basically the same code, but all the operations are async now. The last line looks a bit ugly, but that's just a bit of ceremony to convert both branches of `TaskEither` to a single `Task`. They're based on promises, so you can use `await` to get the result:

```Typescript
const result = await processFile(fileName)()
```

The result here is actually void because we don't return anything from `console.log`. Also, the neccessity to call the function twice is a bit annoying, but I think it's a fair tradeoff for the ability to handle errors in a single place.

## Real world example

And now, back to the code from the beginning. It's okay if you don't understand this code snippet completely yet, but I think the overall structure should be pretty clear:

```Typescript
server.route({
  method: 'GET',
  path: '/stories/{id}',
  handler: (request, h) =>
    pipe(
      request.params.id,
      parseNumberParam('id'),
      TE.fromEither,
      TE.flatMap(fetchStory),
      TE.mapLeft(internalError(h)),
      TE.chainEitherK(someOr404(h)),
      TE.map(h.response),
      TE.getOrElse(T.of)
    )()
})

const fetchStory = (id: number) =>
  wrapFind(() => prisma.story.findUnique({ where: { id } }))
```

That's the whole handler function for a single endpoint using `hapi`. And here are the helpers that this and other handlers use:

```Typescript
const wrapFind = <TResult>(find: () => Promise<TResult | null>) =>
  pipe(TE.tryCatch(find, String), TE.map(O.fromNullable))

const internalError = (h: hapi.ResponseToolkit) => (error: string) =>
  h.response({ error }).code(500)

const someOr404 = <T>(
  h: hapi.ResponseToolkit
): ((input: O.Option<T>) => E.Either<hapi.ResponseObject, T>) =>
  O.fold(() => E.left(h.response({}).code(404)), E.right)

const parseNumberParam = (name: string) => (param: string) =>
  pipe(
    param,
    parseInt,
    E.fromPredicate(Number.isFinite, () => `invalid param: ${name}`)
  )
```

And this is the traditional code:

```Typescript
  server.route({
    method: 'GET',
    path: '/stories/{id}',
    handler: async (request, h): Promise<hapi.ResponseObject> => {
      const { id: rawId } = request.params

      const id = parseInt(rawId)
      if (!Number.isFinite(id)) {
        return h.response({ error: 'invalid id' }).code(500)
      }

      let story
      try {
        story = await prisma.story.findUnique({
          where: { id: Number(id) }
        })
      } catch (error) {
        return h.response({ error }).code(500)
      }
      if (story === null) {
        return h.response({}).code(404)
      }
      return h.response(story)
    }
  })
```

Notice that here, I don't use as much helper functions — so, comparison might seem unfair. But that's kind of the point: with imperative paradigm, **I can't delegate a decision to do an early return to a helper function**. Consider this code:

```Typescript
const id = parseInt(rawId)
if (!Number.isFinite(id)) {
  return h.response({ error: 'invalid id' }).code(500)
}
```

I can create a helper function `tryParseNumber(value: unknown): number|undefined` that would try to parse the id. I can create another helper `error(h: hapi.ResponseToolkit, error: string): hapi.ResponseObject` that would create a response object with an error. But I can't create a helper that would combine these two functions and return a response object if the id is invalid. I can't do that because I need to return from the handler function, and I can't do that from a helper function. But the code would still look like this:

```Typescript
const id = tryParseNumber(rawId)
if (id === undefined) {
  return error(h, 'invalid id')
}
```

The logic of "if the id is invalid, return an error" is not encapsulated in helper functions — I still have the exact same structure of code and number of lines.
