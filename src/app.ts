import express from "express";
import swaggerUi from "swagger-ui-express";
import {
  EnumTranzakEventType,
  EnumTranzakPaymentStatus,
  errorHandler,
  TranzakWebhookResponse,
} from "docta-package";
import paymentRouter from "./routers/paymentRouter";

import { swaggerSpec } from "./swagger";
import { WebhookService } from "./services/webhook";

const app = express();

app.use(express.json());

// Swagger documentation route
app.use("/api/payment/v1/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes
app.use("/api/payment/v1/payment", paymentRouter);

app.post("/webhook", async (req, res) => {
  console.log("✅ Webhook received:", req.body);

  const data = req.body as TranzakWebhookResponse;

  const callSuccess = () => {
    res.sendStatus(200);
    return;
  };

  const callFailure = () => {
    res.sendStatus(400);
    return;
  };

  if (data.eventType === EnumTranzakEventType.REQUEST_COMPLETED) {
    switch (data.resource.status) {
      case EnumTranzakPaymentStatus.SUCCESSFUL:
        await WebhookService.handleSuccessfulPayment({
          data,
          callSuccess,
          callFailure,
        });
        break;
      case EnumTranzakPaymentStatus.CANCELLED:
        await WebhookService.handleCancelledPayment({
          data,
          callSuccess,
          callFailure,
        });
        break;
      case EnumTranzakPaymentStatus.CANCELLED_BY_PAYER:
        await WebhookService.handleCancelledPayment({
          data,
          callSuccess,
          callFailure,
        });
        break;
      case EnumTranzakPaymentStatus.FAILED:
        await WebhookService.handleFailedPayment({
          data,
          callSuccess,
          callFailure,
        });
        break;
      default:
        res.sendStatus(200);
        break;
    }
  }
});

app.use(errorHandler);

export default app;
