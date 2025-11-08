import { Router } from "express";
import { PaymentController } from "../controllers/paymentController";
import { requireAuth } from "docta-package";
import { EnumUserRole } from "docta-package";
import { verifyRoles } from "docta-package";

class PaymentRouter {
  public router: Router;
  private controller: PaymentController;

  constructor() {
    this.router = Router();
    this.controller = new PaymentController();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(
      "/get-payment-url/session/:sessionId",
      requireAuth,
      verifyRoles([EnumUserRole.PATIENT]),
      this.controller.createPaymentSession
    );
  }
}

export default new PaymentRouter().router;
