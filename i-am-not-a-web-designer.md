# I'm a web app developer — not a web page designer

It's 2023, and one thing that seems to [easily get you to the front page of HN](https://heather-buchel.com/blog/2023/10/why-your-web-design-sucks/) is complaining about modern web stack. You can just say things like "it's just a fucking website" or "do I really need all of that to style a button", or you could just list the names of all the dependencies in the `create-react-app` — and get a cheering crowd.

> Well, since this is the internet, let me tell you that you're all wrong and I'm here to explain you why.

Except that quite often you're actually not. What exactly are you working on? If you're developing a static web page like, a beautiful landing site, a blog, or even a media — yes, you absolutely do not need to load 1mb of javascript before the first render. You don't need to do 20 requests to show your visitor a recipe. And you should not have to spend hours configuring webpack if
