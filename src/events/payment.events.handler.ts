import {
  CreateRefundResponseData,
  EnumTranzakReasonCode,
  InitiateRefundEvent,
  ISessionDocument,
  SessionModel,
  TranzakApiResponse,
  TranzakCreateRefundRequestDto,
} from "docta-package";
import { BaseTranzakPaymentService } from "../services/base.tranzak.payment";
import axios from "axios";
import { config } from "../config";

export class PaymentEventsHandler extends BaseTranzakPaymentService {
  public initiateRefundHandler = async (data: InitiateRefundEvent) => {
    console.log("Initiate refund event received:", data);

    const session: ISessionDocument | null = await SessionModel.findOne({
      _id: data.sessionId,
    })
      .populate("period")
      .populate("doctor");

    // Manage idempotency and errors well
    if (!session || !session.payment?.transactionId) {
      console.log("Session with id " + data.sessionId + " not found");
      return;
    }

    if (session.refund?.status === EnumRefundStatus.PROCESSING) {
      console.log("Refund is already processing, skipping");
      return;
    }

    if (session.refund?.status === EnumRefundStatus.COMPLETED) {
      console.log("Refund is already completed, skipping");
      return;
    }

    const paymentToken = await this.getPaymentToken();

    const tranzakData: TranzakCreateRefundRequestDto = {
      reasonCode:
        EnumTranzakReasonCode.MUTUAL_AGREEMENT_BETWEEN_BUYER_AND_SELLER,
      refundedTransactionId: session?.payment?.transactionId,
      merchantRefundNumber: JSON.stringify({
        sessionId: session.id,
      }),
      note: `Refund initiated by ${data.refundDirection}`,
    };

    try {
      const response = await axios.post<
        TranzakApiResponse<CreateRefundResponseData>
      >(`${config.tranzakApiUrl}/xp021/v1/refund/create`, tranzakData, {
        headers: {
          Authorization: `Bearer ${paymentToken}`,
        },
        timeout: 10000,
      });

      console.log("Refund response:", response.data.data.status);

      if (response.data.success) {
        console.log("Refund initiated successfully");
        session.refund = {
          refundStartedAt: Date.now(),
          status: EnumRefundStatus.PROCESSING,
          direction: data.refundDirection,
        };
      } else {
        console.log("Refund failed to initiate");
        session.refund = {
          refundFailedAt: Date.now(),
          status: EnumRefundStatus.FAILED_AT_INITIATING,
          direction: data.refundDirection,
        };
      }
      await session.save();
    } catch (error) {
      session.refund = {
        refundFailedAt: Date.now(),
        status: EnumRefundStatus.FAILED_AT_INITIATING,
        direction: data.refundDirection,
      };
      await session.save();
      console.log("Error initiating refund:", error);
    }
  };
}
