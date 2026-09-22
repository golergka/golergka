import { hydrate } from "preact";
import { App } from "./app.jsx";
import { downloadCvPdf } from "./export.jsx";

const data = JSON.parse(document.getElementById("cv-data").textContent);
hydrate(
  <App data={data} createPdf={downloadCvPdf} />,
  document.querySelector("main"),
);
