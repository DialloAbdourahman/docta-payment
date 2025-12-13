import { InitiateRefundEvent } from "docta-package";
import { BaseTranzakPaymentService } from "../services/base.tranzak.payment";

export class PaymentEventsHandler extends BaseTranzakPaymentService {
  public initiateRefundHandler = async (data: InitiateRefundEvent) => {
    console.log("Initiate refund event received:", data);
    const paymentToken = await this.getPaymentToken();
  };
}
