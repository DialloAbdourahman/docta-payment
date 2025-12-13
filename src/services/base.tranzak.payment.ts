import {
  BadRequestError,
  EnumStatusCode,
  GetPaymentTokenResponseData,
  TranzakApiResponse,
  TranzakGetPaymentTokenRequestDto,
} from "docta-package";
import axios from "axios";
import { config } from "../config";

export abstract class BaseTranzakPaymentService {
  protected paymentToken: string | null = null;
  protected paymentTokenExpiry: number | null = null;

  protected getPaymentToken = async (): Promise<string> => {
    const now = Date.now();

    // Reuse token if still valid
    if (
      this.paymentToken &&
      this.paymentTokenExpiry &&
      now < this.paymentTokenExpiry
    ) {
      console.log("Reusing existing payment token...");
      return this.paymentToken;
    }

    console.log("Getting payment token...");

    const data: TranzakGetPaymentTokenRequestDto = {
      appId: config.tranzakApiKey,
      appKey: config.tranzakApiSecret,
    };

    const response = await axios.post<
      TranzakApiResponse<GetPaymentTokenResponseData>
    >(`${config.tranzakApiUrl}/auth/token`, data, { timeout: 10000 });

    if (!response.data.success) {
      console.log("Payment token error: ", response.data);
      throw new BadRequestError(EnumStatusCode.PAYMENT_ERROR, "Payment error");
    }

    console.log("Payment token: ", response.data);

    this.paymentToken = response.data.data.token;
    this.paymentTokenExpiry = now + response.data.data.expiresIn * 1000;

    return response.data.data.token;
  };
}
