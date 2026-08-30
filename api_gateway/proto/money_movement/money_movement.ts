import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { MoneyMovementServiceClient as _money_movement_MoneyMovementServiceClient, MoneyMovementServiceDefinition as _money_movement_MoneyMovementServiceDefinition } from './money_movement/MoneyMovementService';
import type { TransactRequest as _money_movement_TransactRequest, TransactRequest__Output as _money_movement_TransactRequest__Output } from './money_movement/TransactRequest';
import type { TransactResponse as _money_movement_TransactResponse, TransactResponse__Output as _money_movement_TransactResponse__Output } from './money_movement/TransactResponse';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  money_movement: {
    MoneyMovementService: SubtypeConstructor<typeof grpc.Client, _money_movement_MoneyMovementServiceClient> & { service: _money_movement_MoneyMovementServiceDefinition }
    TransactRequest: MessageTypeDefinition<_money_movement_TransactRequest, _money_movement_TransactRequest__Output>
    TransactResponse: MessageTypeDefinition<_money_movement_TransactResponse, _money_movement_TransactResponse__Output>
  }
}

