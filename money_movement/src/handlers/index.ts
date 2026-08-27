import type { MoneyMovementServiceHandlers } from "proto/money_movement/MoneyMovementService";
import { transact } from "src/handlers/transaction/transact";

export const MoneyMovementServiceHandler: MoneyMovementServiceHandlers = {
    Transact: transact,
};
