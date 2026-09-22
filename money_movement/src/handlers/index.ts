import type { MoneyMovementServiceHandlers } from "proto/money_movement/MoneyMovementService";
import { getBalance } from "src/handlers/balance/getBalance";
import { transact } from "src/handlers/transaction/transact";

export const MoneyMovementServiceHandler: MoneyMovementServiceHandlers = {
    GetBalance: getBalance,
    Transact: transact,
};
