import {
  EnumTranzakCurrency,
  EnumTranzakEventType,
  EnumTranzakPaymentStatus,
  TranzakWebhookPaymentResource,
} from "docta-package";
import { WebhookService } from "./webhook";
import { TranzakWebhookResponse } from "docta-package";
import { config } from "../config";
import mongoose from "mongoose";

const paymentSuccessfulWebhook = {
  name: "Tranzak Payment Notification (TPN)",
  version: "1.0",
  eventType: "REQUEST.COMPLETED",
  merchantId: "tzr8lqbo5xmek8sn",
  appId: "ap3wvdpdxkwv3s",
  resourceId: "REQ2511111811CW34ELT",
  resource: {
    requestId: "REQ2511111811CW34ELT",
    amount: 12457,
    currencyCode: "XAF",
    description:
      'A session between doctor "The Good Doctor" and patient "Diallo souleyman"',
    mobileWalletNumber: null,
    status: "SUCCESSFUL",
    transactionStatus: "SUCCESSFUL",
    createdAt: "2025-11-11T18:11:54+00:00",
    mchTransactionRef: "69064a676968ed6cbbfa5726-1762884713801",
    appId: "ap3wvdpdxkwv3s",
    payerNote: "",
    serviceDiscountAmount: null,
    receivingEntityName: null,
    transactionTag: null,
    transactionId: "TX251111181291198HV8",
    transactionTime: "2025-11-11T18:12:33+00:00",
    partnerTransactionId: "MP7736667049",
    payer: {
      isGuest: true,
      userId: "237656760726",
      name: "Tranzak Random Name",
      paymentMethod: "Orange Money",
      currencyCode: "XAF",
      countryCode: "CM",
      accountId: "237656760726",
      accountName: "",
      email: null,
      amount: 12457,
      discount: 0,
      fee: 0,
      netAmountPaid: 12457,
    },
    merchant: {
      currencyCode: "XAF",
      amount: 12457,
      fee: 249,
      netAmountReceived: 12208,
      accountId: "PAXAFZPPBV2YHSPF40D9",
    },
    links: {
      returnUrl:
        "http://localhost:3000/payment/success?session=69064a676968ed6cbbfa5726",
      cancelUrl:
        "http://localhost:3000/payment/failure?session=69064a676968ed6cbbfa5726",
    },
  },
  creationDateTime: "2025-11-11 18:12:34",
  webhookId: "WHU59ZDWKIU41CVLGIS64I",
  authKey: "Testing",
};

const paymentCancelledWebhook = {
  name: "Tranzak Payment Notification (TPN)",
  version: "1.0",
  eventType: "REQUEST.COMPLETED",
  merchantId: "tzr8lqbo5xmek8sn",
  appId: "ap3wvdpdxkwv3s",
  resourceId: "REQ251111181742T5WHI",
  resource: {
    requestId: "REQ251111181742T5WHI",
    amount: 12457,
    currencyCode: "XAF",
    description:
      'A session between doctor "The Good Doctor" and patient "Diallo souleyman"',
    mobileWalletNumber: null,
    status: "FAILED",
    transactionStatus: "FAILED",
    createdAt: "2025-11-11T18:17:35+00:00",
    mchTransactionRef: "69064a676968ed6cbbfa5726-1762885054713",
    appId: "ap3wvdpdxkwv3s",
    payerNote: "",
    serviceDiscountAmount: null,
    receivingEntityName: null,
    transactionTag: null,
    links: {
      returnUrl:
        "http://localhost:3000/payment/success?session=69064a676968ed6cbbfa5726",
      cancelUrl:
        "http://localhost:3000/payment/failure?session=69064a676968ed6cbbfa5726",
    },
    errorCode: 3008,
    errorMessage: "TXN_CANCELLED",
  },
  creationDateTime: "2025-11-11 18:17:59",
  webhookId: "WHU59ZDWKIU41CVLGIS64I",
  authKey: "Testing",
};

const callSuccess = () => {
  console.log("✅ Success callback called");
};

const callFailure = () => {
  console.log("❌ Failure callback called");
};

const run = async () => {
  await mongoose.connect(config.mongoUri);
  WebhookService.handleSuccessfulPayment({
    data: paymentSuccessfulWebhook as TranzakWebhookResponse<TranzakWebhookPaymentResource>,
    callSuccess,
    callFailure,
  });
  // await WebhookService.handleCancelledPayment({
  //   data: paymentCancelledWebhook as TranzakWebhookResponse,
  //   callSuccess,
  //   callFailure,
  // });
  // await WebhookService.handleFailedPayment({
  //   data: paymentCancelledWebhook as TranzakWebhookResponse,
  //   callSuccess,
  //   callFailure,
  // });
};

run();
