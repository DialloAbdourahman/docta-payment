import { Request, Response } from "express";
import { PaymentService } from "../services/paymentService";
import { OrchestrationResult } from "docta-package";
import { EnumStatusCode } from "docta-package";

export class PaymentController {
  private adminService: PaymentService;

  constructor() {
    this.adminService = new PaymentService();
  }

  public createPaymentSession = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const sessionId = req.params.sessionId;
    const result = await this.adminService.createPaymentSession(
      sessionId,
      req.currentUser!
    );
    res.status(201).json(
      OrchestrationResult.item<{ url: string }>({
        code: EnumStatusCode.CREATED_SUCCESSFULLY,
        message: "Specialty created successfully.",
        data: result,
      })
    );
  };
}
