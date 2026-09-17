import { renderToString } from "preact-render-to-string";
import { App } from "./app.jsx";

export const prerender = (data) => renderToString(<App data={data} />);

