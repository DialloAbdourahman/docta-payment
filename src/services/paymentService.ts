import {
  BadRequestError,
  CreatePaymentSessionResponseData,
  EnumStatusCode,
  EnumTranzakCurrency,
  IPatientDocument,
  ISessionDocument,
  NotFoundError,
  PatientModel,
  SessionModel,
  EnumSessionStatus,
  TranzakApiResponse,
  TranzakCreatePaymentSessionRequestDto,
} from "docta-package";
import axios from "axios";
import { LoggedInUserTokenData } from "docta-package";
import { config } from "../config";
import { BaseTranzakPaymentService } from "./base.tranzak.payment";

export class PaymentService extends BaseTranzakPaymentService {
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

    if (session.status === EnumSessionStatus.PAID) {
      throw new BadRequestError(
        EnumStatusCode.SESSION_PAID_ALREADY,
        "Session is paid already"
      );
    }

    if (
      session.status !== EnumSessionStatus.CREATED &&
      session.status !== EnumSessionStatus.AWAITING_PAYMENT_CONFIRMATION
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
      mchTransactionRef: JSON.stringify({
        sessionId: session.id,
      }),
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

    session.status = EnumSessionStatus.AWAITING_PAYMENT_CONFIRMATION;
    await session.save();
    return { url: response.data.data.links.paymentAuthUrl };
  };
}
