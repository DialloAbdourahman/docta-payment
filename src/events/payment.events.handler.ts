import { InitiateRefundEvent } from "docta-package";

export class PaymentEventsHandler {
  public static initiateRefundHandler = async (data: InitiateRefundEvent) => {
    console.log("Initiate refund event received:", data);
  };
}
