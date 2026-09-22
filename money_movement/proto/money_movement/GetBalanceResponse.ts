// Original file: proto/money_movement.proto

import type { Long } from '@grpc/proto-loader';

export interface GetBalanceResponse {
  'balance'?: (number | string | Long);
}

export interface GetBalanceResponse__Output {
  'balance': (string);
}
