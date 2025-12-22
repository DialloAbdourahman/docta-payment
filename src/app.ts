import express from "express";
import swaggerUi from "swagger-ui-express";
import { errorHandler, logger } from "docta-package";
import paymentRouter from "./routers/paymentRouter";

import { swaggerSpec } from "./swagger";
import webhookHandler from "./routers/webhook";

const app = express();

app.use(express.json());

// Request logger
app.use((req, res, next) => {
  logger.info(`Request: ${req.method} ${req.url}`, {
    method: req.method,
    route: req.path,
    baseUrl: req.baseUrl,
    originalUrl: req.originalUrl,
    params: req.params,
    query: req.query,
    body: req.body,
    headers: req.headers,
    ip: req.ip,
  });
  next();
});

// Swagger documentation route
app.use("/api/payment/v1/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes
app.use("/api/payment/v1/payment", paymentRouter);

app.post("/tranzak/webhook", webhookHandler);

app.use(errorHandler);

export default app;
