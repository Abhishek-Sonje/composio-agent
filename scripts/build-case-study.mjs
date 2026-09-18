import { copyFile, mkdir } from "node:fs/promises";
await mkdir("site/data",{recursive:true});
await Promise.all([
  copyFile("results/research-dataset.json","site/data/research-dataset.json"),
  copyFile("results/analysis.json","site/data/analysis.json"),
]);
console.log("Case-study data refreshed in site/data");
