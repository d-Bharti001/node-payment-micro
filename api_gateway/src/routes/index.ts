import express from "express";
import { login } from "src/controllers/login";
import { transact } from "src/controllers/transact";
import { authenticate } from "src/middleware/authenticate";

const router = express.Router();

router.post("/login", login);

router.use(authenticate);

router.post("/transact", transact);

export default router;
