import {
  BadRequestError,
  CreatePaymentSessionResponseData,
  EnumStatusCode,
  EnumTranzakCurrency,
  GetPaymentTokenResponseData,
  IPatientDocument,
  ISessionDocument,
  NotFoundError,
  PatientModel,
  SessionModel,
  SessionStatus,
  TranzakApiResponse,
  TranzakCreatePaymentSessionRequestDto,
  TranzakGetPaymentTokenRequestDto,
} from "docta-package";
import axios from "axios";
import { LoggedInUserTokenData } from "docta-package";
import { SpecialtyOutputDto } from "docta-package";
import { config } from "../config";

export class PaymentService {
  private paymentToken: string | null = null;
  private paymentTokenExpiry: number | null = null;

  public createPaymentSession = async (
    sessionId: string,
    user: LoggedInUserTokenData
  ): Promise<{ url: string }> => {
    const patient: IPatientDocument | null = await PatientModel.findOne({
      user: user.id,
    }).populate("user");

    const session: ISessionDocument | null = await SessionModel.findOne({
      _id: sessionId,
      patient,
    })
      .populate("period")
      .populate("doctor");

    if (!session) {
      throw new NotFoundError(EnumStatusCode.NOT_FOUND, "Session not found");
    }

    if (session.status === SessionStatus.PAID) {
      throw new BadRequestError(
        EnumStatusCode.SESSION_PAID_ALREADY,
        "Session is paid already"
      );
    }

    if (
      session.status !== SessionStatus.CREATED &&
      session.status !== SessionStatus.AWAITING_PAYMENT_CONFIRMATION
    ) {
      throw new BadRequestError(
        EnumStatusCode.CAN_ONLY_PAY_FOR_CREATED_OR_AWAITING_PAYMENT_CONFIRMATION_SESSION,
        "Session is too late to pay"
      );
    }

    if (Date.now() > session.period.startTime) {
      throw new BadRequestError(
        EnumStatusCode.PERIOD_PASSED,
        "Session is too late to pay"
      );
    }

    if (
      Date.now() + session.doctor.dontBookMeBeforeInMins * 60 * 1000 >
      session.period.startTime
    ) {
      throw new BadRequestError(
        EnumStatusCode.PERIOD_TOO_CLOSE_TO_START,
        "Cannot pay for this session because it's too close to the start time"
      );
    }

    const paymentToken = await this.getPaymentToken();

    const tranzakData: TranzakCreatePaymentSessionRequestDto = {
      amount: session.pricing.totalPrice,
      currencyCode: EnumTranzakCurrency.XAF,
      description: `A session between doctor "${session.doctor.title}" and patient "${patient?.user.name}"`,
      mchTransactionRef: `${session.id}-${Date.now()}`,
      returnUrl: `${config.frontEndUrl}/payment/success?session=${session.id}`,
      cancelUrl: `${config.frontEndUrl}/payment/failure?session=${session.id}`,
    };

    const response = await axios.post<
      TranzakApiResponse<CreatePaymentSessionResponseData>
    >(`${config.tranzakApiUrl}/xp021/v1/request/create`, tranzakData, {
      headers: {
        Authorization: `Bearer ${paymentToken}`,
      },
      timeout: 10000,
    });

    session.status = SessionStatus.AWAITING_PAYMENT_CONFIRMATION;
    await session.save();
    return { url: response.data.data.links.paymentAuthUrl };
  };

  private getPaymentToken = async () => {
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
