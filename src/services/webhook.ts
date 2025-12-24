import {
  IPeriodDocument,
  ISessionDocument,
  PeriodModel,
  PeriodStatus,
  SessionModel,
  EnumSessionStatus,
  TranzakWebhookPaymentResource,
  TranzakWebhookResponse,
} from "docta-package";
import mongoose from "mongoose";

export class WebhookService {
  public static handleSuccessfulPayment = async ({
    data,
    callSuccess,
    callFailure,
  }: {
    data: TranzakWebhookResponse<TranzakWebhookPaymentResource>;
    callSuccess: () => void;
    callFailure: () => void;
  }): Promise<void> => {
    console.log("\n========================================");
    console.log("🔔 WEBHOOK: Successful Payment Received");
    console.log("========================================");
    console.log("📦 Webhook Data:", JSON.stringify(data, null, 2));

    try {
      const sessionId = JSON.parse(data.resource.mchTransactionRef).sessionId;
      console.log("🔍 Extracted Session ID:", sessionId);
      console.log("📋 Transaction ID:", data.resource.transactionId);
      console.log(
        "💰 Amount:",
        data.resource.amount,
        data.resource.currencyCode
      );

      console.log("🔎 Searching for session in database...");
      const session: ISessionDocument | null = await SessionModel.findOne({
        _id: sessionId,
      });

      if (!session) {
        console.log("❌ ERROR: Session not found with ID:", sessionId);
        callFailure();
        return;
      }
      console.log("✅ Session found:", session._id);
      console.log("📊 Current session status:", session.status);

      console.log("🔎 Searching for period in database...");
      const period: IPeriodDocument | null = await PeriodModel.findOne({
        _id: session?.period,
      });

      if (!period) {
        console.log("❌ ERROR: Period not found with ID:", session.period);
        callFailure();
        return;
      }
      console.log("✅ Period found:", period._id);
      console.log("📊 Current period status:", period.status);

      if (session.status === EnumSessionStatus.PAID) {
        console.log("⚠️  Session already marked as PAID - skipping processing");
        callSuccess();
        return;
      }

      console.log("🔄 Updating session and period status...");
      period.status = PeriodStatus.Occupied;
      console.log("  ➜ Period status updated to:", PeriodStatus.Occupied);

      session.status = EnumSessionStatus.PAID;
      console.log("  ➜ Session status updated to:", EnumSessionStatus.PAID);

      session.payment = {
        transactionId: data.resource.transactionId,
        transactionTime: data.resource.transactionTime,
        webhookStatus: data.resource.status,
        webhookId: data.webhookId,
        amount: data.resource.amount,
        currency: data.resource.currencyCode,
      };
      console.log("  ➜ Payment data attached to session");

      session.paidAt = Date.now();
      console.log("  ➜ Paid at updated to:", session.paidAt);

      // Save data with transaction
      console.log("💾 Starting database transaction...");
      const sessionTransaction = await mongoose.startSession();
      sessionTransaction.startTransaction();

      try {
        console.log("  ➜ Saving session...");
        await session.save({ session: sessionTransaction });
        console.log("  ➜ Saving period...");
        await period.save({ session: sessionTransaction });
        console.log("  ➜ Committing transaction...");
        await sessionTransaction.commitTransaction();
        sessionTransaction.endSession();
        console.log("✅ Transaction committed successfully");
      } catch (error) {
        console.log("❌ Transaction failed - rolling back...");
        await sessionTransaction.abortTransaction();
        sessionTransaction.endSession();
        console.log("🔙 Transaction rolled back");
        throw error;
      }

      console.log("✅ Payment processed successfully");
      console.log("========================================\n");
      callSuccess();
    } catch (error) {
      console.log("❌ CRITICAL ERROR processing successful payment:");
      console.error(error);
      console.log("========================================\n");
      callFailure();
    }
  };

  public static handleFailedPayment = async ({
    data,
    callSuccess,
    callFailure,
  }: {
    data: TranzakWebhookResponse<TranzakWebhookPaymentResource>;
    callSuccess: () => void;
    callFailure: () => void;
  }): Promise<void> => {
    console.log("\n========================================");
    console.log("🔔 WEBHOOK: Failed Payment Received");
    console.log("========================================");
    console.log("📦 Webhook Data:", JSON.stringify(data, null, 2));

    try {
      const sessionId = JSON.parse(data.resource.mchTransactionRef).sessionId;
      console.log("🔍 Extracted Session ID:", sessionId);
      console.log("📋 Transaction ID:", data.resource.transactionId);
      console.log(
        "💰 Amount:",
        data.resource.amount,
        data.resource.currencyCode
      );

      console.log("🔎 Searching for session in database...");
      const session: ISessionDocument | null = await SessionModel.findOne({
        _id: sessionId,
      });

      if (!session) {
        console.log("❌ ERROR: Session not found with ID:", sessionId);
        callFailure();
        return;
      }
      console.log("✅ Session found:", session._id);
      console.log("📊 Current session status:", session.status);

      console.log("🔎 Searching for period in database...");
      const period: IPeriodDocument | null = await PeriodModel.findOne({
        _id: session?.period,
      });

      if (!period) {
        console.log("❌ ERROR: Period not found with ID:", session.period);
        callFailure();
        return;
      }
      console.log("✅ Period found:", period._id);
      console.log("📊 Current period status:", period.status);

      if (
        session.status === EnumSessionStatus.PAID ||
        session.status === EnumSessionStatus.PAYMENT_FAILED
      ) {
        console.log(
          "⚠️  Session already marked as PAID or FAILED - skipping processing"
        );
        callSuccess();
        return;
      }

      console.log("🔄 Updating session and period status...");
      period.status = PeriodStatus.Available;
      console.log("  ➜ Period status updated to:", PeriodStatus.Available);

      session.status = EnumSessionStatus.PAYMENT_FAILED;
      session.tranzakErrorDetails = {
        errorCode: data.resource.errorCode as number,
        errorMessage: data.resource.errorMessage as string,
      };
      console.log(
        "  ➜ Session status updated to:",
        EnumSessionStatus.PAYMENT_FAILED
      );

      session.payment = {
        transactionId: data.resource.transactionId,
        transactionTime: data.resource.transactionTime,
        webhookStatus: data.resource.status,
        webhookId: data.webhookId,
        amount: data.resource.amount,
        currency: data.resource.currencyCode,
      };
      console.log("  ➜ Payment data attached to session");

      // Save data with transaction
      console.log("💾 Starting database transaction...");
      const sessionTransaction = await mongoose.startSession();
      sessionTransaction.startTransaction();

      try {
        console.log("  ➜ Saving session...");
        await session.save({ session: sessionTransaction });
        console.log("  ➜ Saving period...");
        await period.save({ session: sessionTransaction });
        console.log("  ➜ Committing transaction...");
        await sessionTransaction.commitTransaction();
        sessionTransaction.endSession();
        console.log("✅ Transaction committed successfully");
      } catch (error) {
        console.log("❌ Transaction failed - rolling back...");
        await sessionTransaction.abortTransaction();
        sessionTransaction.endSession();
        console.log("🔙 Transaction rolled back");
        throw error;
      }

      console.log("✅ Failed payment processed successfully");
      console.log("========================================\n");
      callSuccess();
    } catch (error) {
      console.log("❌ CRITICAL ERROR processing failed payment:");
      console.error(error);
      console.log("========================================\n");
      callFailure();
    }
  };

  // public static handleFailedPayment = async ({
  //   data,
  //   callSuccess,
  //   callFailure,
  // }: {
  //   data: TranzakWebhookResponse<TranzakWebhookPaymentResource>;
  //   callSuccess: () => void;
  //   callFailure: () => void;
  // }): Promise<void> => {};
}
