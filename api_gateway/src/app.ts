import express from "express";
import swaggerUi from "swagger-ui-express";
import { corsHandler } from "src/middleware/corsHandler";
import { routeNotFoundHandler } from "src/middleware/routeNotFound";
import { errorHandler } from "src/middleware/errorHandler";
import router from "src/routes";
import { swaggerSpec } from "src/config/swagger";

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(corsHandler);

// Swagger docs
app.get("/docs/swagger.json", (_req, res) => res.json(swaggerSpec));
app.use("/docs/swagger", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(router);

app.use(routeNotFoundHandler);

app.use(errorHandler);

export default app;
