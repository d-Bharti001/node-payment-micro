import express from "express";
import { login } from "src/controllers/login";
import { getBalance } from "src/controllers/getBalance";
import { transact } from "src/controllers/transact";
import { authenticate } from "src/middleware/authenticate";

const router = express.Router();

router.post("/login", login);

router.use(authenticate);

router.get("/balance", getBalance);
router.post("/transact", transact);

export default router;
