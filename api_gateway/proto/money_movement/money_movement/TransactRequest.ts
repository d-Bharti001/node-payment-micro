// Original file: proto/money_movement.proto

import type { Long } from '@grpc/proto-loader';

export interface TransactRequest {
  'idempotencyKey'?: (string);
  'fromUserId'?: (string);
  'toUserId'?: (string);
  'amount'?: (number | string | Long);
}

export interface TransactRequest__Output {
  'idempotencyKey': (string);
  'fromUserId': (string);
  'toUserId': (string);
  'amount': (string);
}
