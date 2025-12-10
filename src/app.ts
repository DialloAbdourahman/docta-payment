import express from "express";
import swaggerUi from "swagger-ui-express";
import { errorHandler } from "docta-package";
import paymentRouter from "./routers/paymentRouter";

import { swaggerSpec } from "./swagger";
import webhookHandler from "./routers/webhook";

const app = express();

app.use(express.json());

// Swagger documentation route
app.use("/api/payment/v1/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes
app.use("/api/payment/v1/payment", paymentRouter);

app.post("/tranzak/webhook", webhookHandler);

app.use(errorHandler);

export default app;
