import { hydrate } from "preact";
import { App } from "./app.jsx";

const data = JSON.parse(document.getElementById("cv-data").textContent);
hydrate(<App data={data} />, document.querySelector("main"));

