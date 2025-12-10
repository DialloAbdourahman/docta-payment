import {
  EnumTranzakEventType,
  EnumTranzakPaymentStatus,
  TranzakWebhookResponse,
} from "docta-package";
import { Request, Response } from "express";
import { WebhookService } from "../services/webhook";

const webhookHandler = async (req: Request, res: Response) => {
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
};

export default webhookHandler;
