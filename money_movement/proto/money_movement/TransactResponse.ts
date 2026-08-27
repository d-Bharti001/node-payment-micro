// Original file: proto/money_movement.proto

import type { Long } from '@grpc/proto-loader';

export interface TransactResponse {
  'transactionId'?: (number | string | Long);
}

export interface TransactResponse__Output {
  'transactionId': (string);
}
