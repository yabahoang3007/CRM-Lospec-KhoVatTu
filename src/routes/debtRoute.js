import express from "express";
import {
  getCustomerDebts,
  getCustomerDebtDetail,
  createCustomerPayment,
  deleteCustomerPayment,
  getSupplierDebts,
  getSupplierDebtDetail,
  createSupplierPayment,
  deleteSupplierPayment,
} from "../controllers/debtController.js";
import { authMiddleware } from "../middleware/auth.js";
import { checkRole } from "../middleware/role.js";

const debtRouter = express.Router();

debtRouter.use(authMiddleware);

// Công nợ khách hàng
debtRouter.get("/customers", getCustomerDebts);
debtRouter.get("/customers/:id", getCustomerDebtDetail);
debtRouter.post(
  "/customers/:id/payments",
  checkRole(["admin", "manager"]),
  createCustomerPayment
);
debtRouter.delete(
  "/customers/payments/:paymentId",
  checkRole(["admin", "manager"]),
  deleteCustomerPayment
);

// Công nợ nhà cung cấp
debtRouter.get("/suppliers", getSupplierDebts);
debtRouter.get("/suppliers/:id", getSupplierDebtDetail);
debtRouter.post(
  "/suppliers/:id/payments",
  checkRole(["admin", "manager"]),
  createSupplierPayment
);
debtRouter.delete(
  "/suppliers/payments/:paymentId",
  checkRole(["admin", "manager"]),
  deleteSupplierPayment
);

export default debtRouter;
