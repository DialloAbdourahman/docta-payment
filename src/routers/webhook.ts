import {
  EnumTranzakEventType,
  EnumTranzakPaymentStatus,
  TranzakWebhookPaymentResource,
  TranzakWebhookRefundResource,
  TranzakWebhookResponse,
} from "docta-package";
import { Request, Response } from "express";
import { WebhookService } from "../services/webhook";

const webhookHandler = async (req: Request, res: Response) => {
  console.log("✅ Webhook received:", req.body);

  const eventType = req.body.eventType as EnumTranzakEventType;

  const callSuccess = () => {
    res.sendStatus(200);
    return;
  };

  const callFailure = () => {
    res.sendStatus(400);
    return;
  };

  if (eventType === EnumTranzakEventType.REQUEST_COMPLETED) {
    const data =
      req.body as TranzakWebhookResponse<TranzakWebhookPaymentResource>;

    switch (data.resource.status) {
      case EnumTranzakPaymentStatus.SUCCESSFUL:
        await WebhookService.handleSuccessfulPayment({
          data,
          callSuccess,
          callFailure,
        });
        break;
      case EnumTranzakPaymentStatus.CANCELLED:
        await WebhookService.handleFailedPayment({
          data,
          callSuccess,
          callFailure,
        });
        break;
      case EnumTranzakPaymentStatus.CANCELLED_BY_PAYER:
        await WebhookService.handleFailedPayment({
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

  if (eventType === EnumTranzakEventType.REFUND_COMPLETED) {
    const data =
      req.body as TranzakWebhookResponse<TranzakWebhookRefundResource>;

    console.log("✅ Webhook received for refund:", data);

    switch (data.resource.status) {
      // case EnumTranzakRefundStatus.SUCCESSFUL:
      //   await WebhookService.handleSuccessfulRefund({
      //     data,
      //     callSuccess,
      //     callFailure,
      //   });
      //   break;
      // case EnumTranzakRefundStatus.CANCELLED:
      //   await WebhookService.handleCancelledRefund({
      //     data,
      //     callSuccess,
      //     callFailure,
      //   });
      //   break;
      // case EnumTranzakRefundStatus.FAILED:
      //   await WebhookService.handleFailedRefund({
      //     data,
      //     callSuccess,
      //     callFailure,
      //   });
      //   break;
      default:
        res.sendStatus(200);
        break;
    }
  }
};

export default webhookHandler;
