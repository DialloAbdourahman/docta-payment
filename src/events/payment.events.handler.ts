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
      throw new Error("Session not found");
    }

    const paymentToken = await this.getPaymentToken();

    const tranzakData: TranzakCreateRefundRequestDto = {
      reasonCode:
        EnumTranzakReasonCode.MUTUAL_AGREEMENT_BETWEEN_BUYER_AND_SELLER,
      refundedTransactionId: session?.payment?.transactionId,
      merchantRefundNumber: `${session.id}-${Date.now()}`,
      note: `Refund initiated by ${data.refundDirection}`,
    };

    const response = await axios.post<
      TranzakApiResponse<CreateRefundResponseData>
    >(`${config.tranzakApiUrl}/xp021/v1/refund/create`, tranzakData, {
      headers: {
        Authorization: `Bearer ${paymentToken}`,
      },
      timeout: 10000,
    });

    if (response.data.success) {
      // Maybe store some data here e.g refund_started_at
      console.log("It was a success");
      console.log(response.data);
    }
  };
}
