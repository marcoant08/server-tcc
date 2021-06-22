const express = require("express");
const routes = require("./routes");

const app = express();

app.use(express.json());
app.use(routes);

const porta = 3333;

app.listen(porta);
console.log(`Rodando na porta: ${porta}...`);
