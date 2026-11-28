import { houseReport, simulateHouse } from "./house.ts";
import { report, simulateAll } from "./simulate.ts";

console.log(report(simulateAll()));
console.log("");
console.log(houseReport(simulateHouse()));
