import express from "express";
import { corsHandler } from "src/middleware/corsHandler";
import { routeNotFoundHandler } from "src/middleware/routeNotFound";
import { errorHandler } from "src/middleware/errorHandler";
import router from "src/routes";

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(corsHandler);

app.use(router);

app.use(routeNotFoundHandler);

app.use(errorHandler);

export default app;
