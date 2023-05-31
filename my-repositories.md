As any other developer, I have some small utilities and libraries that I developed, and a lot more unfinished projects and random repositories. Here's the full list with my comments — why I started them, why I abandoned them, and what I learned from them.

## [Standup generator](https://github.com/golergka/standup_generator) (2023)

**Python**, **LLMs**

I'm actually kind of proud of this one! It's a small but very useful utility to generate a standup message for your standup slack chat about your progress over the previous day. It parses all the latest commits in the repository, and generates a message with all the progress, grouped by branch (assuming that they map to tasks). Just don't forget to specify your `OPENAI_API_KEY` before you run it.

I haven't worked with git API for a long time, and it was fun trying to optimise GPT prompt to do what I wanted it to do.

(This project was mostly written by GPT-4 with my prompting and corrections, took about 2 hours to write and 2 hours to debug. I'm not sure if I should count it as my project, but it's definitely my idea.)

## [Python project generator](https://github.com/golergka/python_project_generator) (2023)

**Python**, **Poetry**

The project I generated my previous project with! Of course, there's probably a lot of Python project generators out there with all kinds of options and features, but I wanted to make my own, and I wanted it to be as simple as possible. It just copies over a template directory, and replaces all the placeholders in the files with the project name and other parameters.

After a big break with Python, figuring out modern package management and project structure was a bit of a challenge, but I'm glad I did it. And [Poetry](https://python-poetry.org) feels almost as good as cargo or npm!

(Also mostly written by GPT-4).

## [Solving Advent of Code 2022 with ChatGPT](https://github.com/golergka/advent-of-code-2022-with-chat-gpt) (2022)

**Python**, **ChatGPT**, **Advent of Code**

I decided to run a scientific experiment and solve [Advent of Code circa 2022](https://adventofcode.com/2022) with ChatGPT which was just released a few days prior. Unfortunately, the experiment ended in a complete failure — we never got past day 2. When ChatGPT encountered an error, he would suggest a fix which would trigger another error, and to fix that, he would circle back to the first solution. I could have guided it through, but I decided to keep it as pure as possible, and it didn't work out.

I learned a lot about ChatGPT, and I'm still a big fan of it. I also learned that it's not a good idea to use it for anything that requires a lot of backtracking. But as I'm writing this in May 2023, I'm 95% sure that GPT-4 would easily solve the whole thing.

## [Worlde solver](https://github.com/golergka/worlde-solver) (2022)

**Typescript**, **React**, **Vercel**

A simple web app to solve worlde puzzle, [deployed here](https://worlde-solver.vercel.app). It was nice to try out vercel and complete a small project. I've used a few patterns that I like to use in React development there:

- I prefer to create [a single hoook](https://github.com/golergka/worlde-solver/blob/d5af6a7917f6db669bddebfa076d4e59e0b824dc/src/hooks/useGuesses.ts#L7-L12) to provide all the properties that are consumed by [relevant](https://github.com/golergka/worlde-solver/blob/d5af6a7917f6db669bddebfa076d4e59e0b824dc/src/components/Guesses.tsx#L6-L10) [components](https://github.com/golergka/worlde-solver/blob/d5af6a7917f6db669bddebfa076d4e59e0b824dc/src/components/AddGuessForm.tsx#L3-L6), so that [the parent that ties them together](https://github.com/golergka/worlde-solver/blob/d5af6a7917f6db669bddebfa076d4e59e0b824dc/src/components/Playing.tsx#L15) wouldn't have to care about implementation detals.

- Create [a sum type](https://github.com/golergka/worlde-solver/blob/d5af6a7917f6db669bddebfa076d4e59e0b824dc/src/components/App.tsx#L8-L15) to represent different variations of current state, and then [choose one of the components](https://github.com/golergka/worlde-solver/blob/d5af6a7917f6db669bddebfa076d4e59e0b824dc/src/components/App.tsx#L35-L42) that map to these states.

## [rs-lox](https://github.com/golergka/touchbar-vscode) (2022)

**Rust**, **Virtual machines**, **Parsing**, **Programming languages**

After implementing the first part of the wonderful book [Crafting Interpreters](http://craftinginterpreters.com) in Typescript, I decided to try and follow the second part of the book, originally intended to be implemented in C, in Rust instead.

Unfortunately, I didn't finish this project. Managing memory with Rust is hard, and when you have to do low-level stuff with `unsafe`, it gets even more tedious. I stopped working on it when I felt that I'm spending more time fighting borrow checker than learning about programming languages. Still glad I did it — I learned a lot, and it was nice getting back to basic CS and implementing things like [this basic hashtable](https://github.com/golergka/rs-lox/blob/1869487814ace2f6d4f2add164c1c37c3fc7f35b/src/table.rs#L47-L83).

## [thrw](https://github.com/golergka/thrw) (2021)

**Typescript**

A small ergonomic helper with Typescript. Out of the box, the language has a throw statement (`throw 'something'`), but doesn't have throw expression which you would be able to use, for example, in a conditional. There's a [proposal](https://github.com/tc39/proposal-throw-expressions), but until it's implemented, you can use this library. The whole implementation is just (three lines of code)[https://github.com/tc39/proposal-throw-expressions], but despite the whole 'leftpad' situation, I still think it's better to import a library than to copy-paste code.

## [url shortener](https://github.com/golergka/url-shortener) (2021)

**Typescript**, **Postgresql**, **Redis**

Originally this project was a test assignment for an interview, but I liked working on it and developed into a full-fledged project. It was nice to do something simple, but with all the right practices: linting, migrations, detailed documentation and even [optional redis-based caching](https://github.com/golergka/url-shortener/blob/bd3faa5ecca86867d2de16289ce22cd8518aa4ba/src/providers/url.ts#L66-L71) and commit hooks.

Frontend is very simple and can even run without JS enabled, so I decided to go with [server-rendered templates](https://github.com/golergka/url-shortener/blob/master/views/index.pug) with [pug template engine](https://pugjs.org/) and [bulma css framework](https://bulma.io) instead of a full-blown SPA. (TBH, I didn't particularly like developer experience and would rather go with server-rendered React, but it was a nice experiment). I've also developed extensive [test coverage](https://github.com/golergka/url-shortener/blob/master/src/routes/api/shorten.test.ts) for the API, and using [raw SQL](https://github.com/golergka/url-shortener/blob/master/src/providers/url.sql) (with [types generated](https://github.com/golergka/url-shortener/blob/master/src/providers/url.queries.ts) with [pgtyped](http://pgtyped.dev)) instead of an ORM was the right choice for such a small project.

I have also tried to implement [user management](https://github.com/golergka/url-shortener/compare/master...users), but learned that using passport for node is painful as hell. I should have probably just implemented this myself.

## [ts-lox](https://github.com/golergka/ts-lox) (2020)

**Typescript**, **Interpreters**, **Programming languages**

The first part of [Crafting Interpreters](http://craftinginterpreters.com) (book that teaches you how to build a programming language from scratch). I've implemented it in Typescript instead of Java in order to learn the language better and prevent myself from being able to blindly retype the code from the book. I've learned a lot of new things, and I think it's been the first time I've actually [generated code](https://github.com/golergka/ts-lox). I'm also quite proud of extensive [test coverage](https://github.com/golergka/ts-lox/blob/master/src/interpret.test.ts#L67-L1095) — it was the first project I've used copilot on, and turns out, it's great at generating texts.

## [pg-tx](https://github.com/golergka/pg-tx) (2020)

**Typescript**, **Postgres**, **Transactions**, **Node**

Wrapper for transactions on top of [node-postgres](https://node-postgres.com) package. I developed it for my job after I found out that [the top answer](https://stackoverflow.com/questions/38500924/nodejs-pg-transactions-without-nesting/65588782#65588782) on Stack Overflow about implementing transactions on top of this library had a fatal flaw. It's a rare occasion where I can publicly show my work on debugging a tricky bug in production, as it's something usually strictly under NDA. I should have probably used JS proxy instead of just [re-implementing the whole class myself](https://github.com/golergka/pg-tx/blob/eeeba257b49350f27a3d3c525aa6850ec74c8c5f/src/proxy_client.ts#L19-L204), but the solution works, and it's the most important thing.

Also, how do you get you promote a package? I truly believe that it's very useful and could prevent a lot of bugs for a lot of people, but it only gets [a few hundred downloads on npm per week](https://www.npmjs.com/package/pg-tx).

## [simple name generator](https://github.com/golergka/simple-name-generator) (2020)

**Typescript**, **Procedural generation**, **Randomness**

A small tool for a game I was writing at the time — given a list of names (for example, for given fantasy world), generate a new one. I learned that even [very simple algorithms](https://github.com/golergka/simple-name-generator/blob/89e481acc7ada8d55a245bda7662b371d98efb0b/src/index.ts#L42-L113) can do a pretty good job for procedural generation, and on the main thing is for them to be simple to use — and what can be simple than just coming up with a list of names and putting them in a text file?

## [HN comment bot](https://github.com/golergka/hn-comment-bot) (2020)

**Node**, **Postgresql**, **Telegram**, **SQL**

I spend a lot of time on HN, and I was annoyed that there's no mechanism of notifications — you have to manually go to "threads" and check if you got any replies. So I build a bot that would keep track of the comments, find new ones, and send you messages. It's a bit hacky and after I've used it for a couple months, Heroku shut down the server and I never brought it back again — turns out, manually checking your past conversations is it's own dopamine hook.

Building graph-like data structures in a relational database was fun, although I'm not 100% happy with the result. I also was a fan of [pgtyped](https://pgtyped.dev) library at the time, so most of my work with the database was in raw SQL queries [like this one](https://github.com/golergka/hn-comment-bot/blob/c01c93dd7ba0b0b45be8addac37db128c5b11b03/src/notificationSendLoop.ts#L13-L22).

## [Advent of Code 2020](https://github.com/golergka/advent-of-code-2020) (2020)

**Typescript**, **Algorithms**, **Programming puzzles**

Abandoned at day 6, so nothing to be proud of.

## [Postgresql deadlock test](https://github.com/golergka/pg-deadlock-test) (2020)

**Postgresql**, **Transactions**, **Node**

A small project I used to test a deadlock bug in production. I've learned a lot about Postgresql transactions and isolation levels, and also about how to debug a bug in production.
G

## [Node project template](https://github.com/golergka/node-project-template) (2020)

**Typescript**, **Node**

My standard template for Node projects. I haven't updated it in a while, though, and would probably do a few things differently now. For one, I'd rather to use Vitest than Jest.

## [go tcp server](https://github.com/golergka/go-tcp-echo) (2020)

**Go**, **TCP**, **Docker**, **Heroku**

This was less about code and more about deployent — I wanted to learn more about deployments, Docker and [godeps](https://github.com/golergka/go-tcp-echo/tree/master/Godeps), and to document the whole process. I haven't really finished this one, but it was a good learning experience.

## [Google cloud functions Typescript template](https://github.com/golergka/gcf-typescript-template) (2019)

**Google cloud functions**, **Typescript**, **Serverless**

I wanted to use GCF for a project I was CTO at, but couldn't find a tutorial or a template for it, so I made my own. I actually ended up opting out for a traditional Node/Postgresql server instead, but this project got whooping 29 stars on Github, thanks to the fact that it was the only template for GCF in Typescript at the time and [me sharing it on StackOverflow](https://stackoverflow.com/questions/57076892/google-cloud-function-deploy-error-provided-function-is-not-a-loadable-module/57077038#57077038).

Learned a bit about serverless and some google cloud functions quirks, but mostly about setting up projects with Typescript.

## [cis194 homework assignments](https://github.com/golergka/cis194) (2019)

**Haskell**, **Functional programming**

My homework as I've been completing the [cis194 course of Haskell](https://www.seas.upenn.edu/~cis1940/spring13/). I've always loved functional programming, but Haskell has been very intimidating with all it's advanced math terminilogy, so this course has been a big help. I've learned a lot about Haskell, including not only the language itself, but setting [setting up projects with Cabal](https://github.com/golergka/cis194/blob/master/Homework12/cis194.cabal).

## [TG space game (rust)](https://github.com/golergka/tg-space-game-rust) (2018)

**Rust**, **Telegram**, **Game development**, **ORM**

I was a fan of RIIR and decided to rewrite a game I haven't even completed yet. I've enjoyed learning [Diesel ORM](https://diesel.rs), but compared to implementation in Typescript, writing business logic in Rust turned out to be a bit of a pain.

## [TG space game](https://github.com/golergka/tg-space-game) (2018)

**Typescript**, **Node**, **Telegram**, **Game development**

A game about exploration of infinite space, playable as a Telegram bot. I'm particularly proud of [procedural generation](https://github.com/golergka/tg-space-game/blob/bdefbb3957ad9d24def90b4e508125ee996826a2/src/models/starSegment.ts#L78) of star systems and the fact that there were, theoretically, billions and trillions of stars in the game, which would materialize only when you actually visit them.

## [etoya](https://github.com/golergka/etoya) (2018)

**Python**, **Django**

A blog developed for a journalist friend. I've worked with Django before, but here I really had an opportunity to create a greenfield project, and I quite liked it. It's a shame it's based on Python though.

## [anon-chat](https://github.com/golergka/anon-chat) (2017)

**Javascript**, **Node**, **Redis**, **Telegram**

A simple Chatroulette clone for Telegram — you're paired with a anonymous user and your messages get forwarded to one another. I've used pure JS on this one, and since it was a very simple, straightforward project, I decided to experiment with [using Redis as the main source of truth](https://github.com/golergka/anon-chat/blob/master/db.js) instead of just a cache. It worked out pretty well, and I've learned a bit about Redis in the process. I've also experimented with [prototype-based](https://github.com/golergka/anon-chat/blob/master/db.js) and [class-based](https://github.com/golergka/anon-chat/blob/4341929af587a6a922616d7d03ed7b1b99350521/commands/new.js#L5-L89) OOP in Javascript, learned a bit about the language and once again came to the conclusiong that I prefer functional programming.

## [TileDefense](https://github.com/golergka/TileDefense) (2017)

**C#**, **Unity**, **Game development**

A tower defense game.

## [Word chain bot](https://github.com/golergka/word-chain-bot) (2016)

**Go**, **Telegram**

A small toy project that I developed to learn Telegram API. I've worked with Go before, so it was not something very new to me.

## [Unity long text](https://github.com/golergka/unity-long-text) (2016)

**Unity**, **Game development**, **UI**

A utility to display a very, very large texts in Unity UI that breaks them down to chunks that don't kill the renderer. There are actually a few approaches imlpemented in this repo for the sake of benchmarking.

## [Mix](https://github.com/golergka/mix) (2016)

**Go**, **Virtual machines**

An emulator of Mix, a computer designed by Donald Knuth for his book "The Art of Computer Programming". I have already implemented it as a school project in 2004 in Delphi, and it was interesting to go back to it. Only implemented a few basic opcodes.

## [bugsnag release report](https://github.com/golergka/bugsnag-release-report) (2016)

**Python**

A wrapper around [Bugsnag](https://www.bugsnag.com)'s API to get reports over bugs in the last releases.

## [C roguelike](https://github.com/golergka/c-roguelike) (2015)

**C**, **Threads**, **Memory management**

Small experiment with C about splitting work into [separate threads working with the same chunk of memory](https://github.com/golergka/c-roguelike/blob/7d5b8537830514327dc9f8123971f5d828a307fd/src/main.c#L33-L51) and [making all application's memory static](https://github.com/golergka/c-roguelike/blob/7d5b8537830514327dc9f8123971f5d828a307fd/src/main.c#L8-L9). As far as game mechanics go, it's very minimal — player can move around a level and damage enemies.

## [brainfuck](https://github.com/golergka/brainfuck) (2015)

**C**, **Brainfuck**, **Interpreters**, **Programming languages**, **bash**

Interpreter of [Brainfuck](https://en.wikipedia.org/wiki/Brainfuck) that fits into 157 lines of code. I refreshed my knowledge on interpreters and virtual machines, and writing [data-based tests](https://github.com/golergka/brainfuck/blob/master/record_tests.sh) was a pretty neat idea that I've occasionally used later. However, programming in bash certainly wasn't an experiment that I want to repeat — I'd rather use tcl next time I want to go oldschool.

## [.vimrc](https://github.com/golergka/vimrc/blob/master/.vimrc) (2015)

**Vim**

I haven't used Vim in quite a while now. I still think that mode-based text editors are a genious idea, and use Vim emulation plugin in any text editor I use, but I don't want to constantly maintain my text editor.

## [Simlpe slot game](https://github.com/golergka/simpleSlotGame) (2014)

**Unity**, **C#**, **Game development**

Test assignment back from when I was primarily a Unity developer. I've learned that [using `ScriptableObject`](https://github.com/golergka/simpleSlotGame/blob/814b6eaf2a44c546c571c3965d46037f70fd94ce/Assets/Scripts/Machine/Machine.cs#L5-L22) is one of the best ways to manage game designer editable data not related to any particular scene or game object.

## [Jelly button test assignment](https://github.com/golergka/JellyButtonTest) (2014)

**Unity**, **C#**, **Game development**

Another test assignemnt, an action game about shooting asteroids. One trick I've used there is to just [change texture offsets on the floor model](https://github.com/golergka/JellyButtonTest/blob/7ec189faf86e98289744a166d912e52ef7fd2397/Assets/Scripts/Entities/Floor.cs#L22-L31) to emulate player's movement instead of actually moving all objects in 3d space. One thing I certainly wouldn't do now is to use singletons for all game systems — although I have to admit, at small scale it's a very convenient way to manage dependencies.

## [pong](https://github.com/golergka/pong) (2014)

**Unity**, **C#**, **Game development**

A small pong game in my Unity small project showcase.

## [Real estate tax calculator](https://github.com/golergka/tax-calculator) (2014)

**Bower**, **Front-end**, **Angular**

Just a single form to interactively calculate real estate tax. I don't particularly like Angular, to be honest.

## [iron file server](https://github.com/golergka/iron-file-server) (2014)

**Rust**, **Iron**

As I was learning Rust, I decided to develop a simple file server based on [iron framework](https://github.com/iron/iron) that would serve files from current folder.

## judgement ([client](https://github.com/golergka/judgement-client-ios) and [server](https://github.com/golergka/judgement-server)) (2014)

**iOS**, **Objective-C**, **Node**, **Javascript**, **Postgresql**

I wanted to develop a social network and marketplace around predictions. Didn't get very far, but I've learned a lot about iOS development and Objective-C.

## [Commando](https://github.com/golergka/commando) (2014)

**Unity**, **C#**, **Game development**

A platformer game.

## [Algorithms course on Coursera](https://github.com/golergka/algorithmsCoursera) (2014)

**Java**, **Algorithms**

Decided to take a refresher course on algorithms and data structures. I've also learned that I don't particularly like Java.

## [Orbit](https://github.com/golergka/Orbit)

**Unity**, **C#**, **Game development**

A 2d game using orbital mechanics, developed with a friend. Developed the core mechanics, but couldn't get it to actually be fun.

## [LoFiShooter](https://github.com/golergka/LoFiShooter)

**Unity**, **C#**, **Game development**

A top-down shooter indie game, also unfinished.

## [EnigmaJumper](https://github.com/golergka/EnigmaJumper) (2013)

**Unity**, **C#**, **Game development**

A platformer game developed for a client.

## [Wargame](https://github.com/golergka/Wargame) (2013)

**Unity**, **C#**, **Game development**

Prototype of a tactical RPG game.

## [FileHash](https://github.com/golergka/FileHash) (2012)

**Objective-C**

A toy project to learn Objective-C — calculates hash sums of files.

## [Vision](https://github.com/golergka/Vision) (2012)

**Unity**, **C#**, **Game development**

Vision system for other games. Once I learned how bad package management works for Unity, I stopped attempts to develop small reusable libraries for it.

## [King of Castles](https://github.com/golergka/KingOfCastles) (2012)

**Unity**, **C#**, **Game development**, **Networking**, **Multip-player**

A real-time strategy game prototype. It used [lock-step networking model](https://github.com/golergka/KingOfCastles/blob/93fad46c6aa22ac716428d2772e3d8629fa4fe65/Assets/Scripts/Logic/Deterministic/DTRM.cs#L145-L166), and it was nice to learn more about networking.

## [Genetic Ants](https://github.com/golergka/genetic-ants) (2012)

**C#**, **Genetic programming**

I was interested in genetic programming, and decided to try it out on a simple problem of finding a path for ants to food. I've learned that genetic programming is a very slow process, and that it's very hard to get it to work.
