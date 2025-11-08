import {
  BadRequestError,
  CreatePaymentSessionResponseData,
  EnumStatusCode,
  EnumTranzakCurrency,
  GetPaymentTokenResponseData,
  IPatientDocument,
  ISessionDocument,
  ISpecialtyDocument,
  NotFoundError,
  PatientModel,
  SessionModel,
  SessionStatus,
  SpecialtyModel,
  TranzakApiResponse,
  TranzakCreatePaymentSessionRequestDto,
  TranzakGetPaymentTokenRequestDto,
} from "docta-package";
import axios from "axios";
import { LoggedInUserTokenData } from "docta-package";
import { SpecialtyOutputDto } from "docta-package";
import { config } from "../config";

export class PaymentService {
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

    if (session.status === SessionStatus.Paid) {
      throw new BadRequestError(
        EnumStatusCode.SESSION_PAID_ALREADY,
        "Session is paid already"
      );
    }

    if (session.status !== SessionStatus.Created) {
      throw new BadRequestError(
        EnumStatusCode.CAN_ONLY_PAY_FOR_CREATED_SESSION,
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
    >(`${config.tranzakApiUrl}/payment/create`, tranzakData, {
      headers: {
        Authorization: `Bearer ${paymentToken}`,
      },
    });

    console.log("Payment session: ", response.data);
    return { url: response.data.data.links.paymentAuthUrl };
  };

  private getPaymentToken = async () => {
    console.log("Getting payment token...");

    const data: TranzakGetPaymentTokenRequestDto = {
      appId: config.tranzakApiKey,
      appKey: config.tranzakApiSecret,
    };

    const response = await axios.post<
      TranzakApiResponse<GetPaymentTokenResponseData>
    >(`${config.tranzakApiUrl}/auth/token`, data);

    if (!response.data.success) {
      console.log("Payment token error: ", response.data);
      throw new BadRequestError(EnumStatusCode.PAYMENT_ERROR, "Payment error");
    }

    console.log("Payment token: ", response.data);
    return response.data.data.token;
  };
}
