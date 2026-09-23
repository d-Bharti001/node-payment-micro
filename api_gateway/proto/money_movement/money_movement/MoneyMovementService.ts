// Original file: proto/money_movement.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { GetBalanceRequest as _money_movement_GetBalanceRequest, GetBalanceRequest__Output as _money_movement_GetBalanceRequest__Output } from '../money_movement/GetBalanceRequest';
import type { GetBalanceResponse as _money_movement_GetBalanceResponse, GetBalanceResponse__Output as _money_movement_GetBalanceResponse__Output } from '../money_movement/GetBalanceResponse';
import type { TransactRequest as _money_movement_TransactRequest, TransactRequest__Output as _money_movement_TransactRequest__Output } from '../money_movement/TransactRequest';
import type { TransactResponse as _money_movement_TransactResponse, TransactResponse__Output as _money_movement_TransactResponse__Output } from '../money_movement/TransactResponse';

export interface MoneyMovementServiceClient extends grpc.Client {
  GetBalance(argument: _money_movement_GetBalanceRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_money_movement_GetBalanceResponse__Output>): grpc.ClientUnaryCall;
  GetBalance(argument: _money_movement_GetBalanceRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_money_movement_GetBalanceResponse__Output>): grpc.ClientUnaryCall;
  GetBalance(argument: _money_movement_GetBalanceRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_money_movement_GetBalanceResponse__Output>): grpc.ClientUnaryCall;
  GetBalance(argument: _money_movement_GetBalanceRequest, callback: grpc.requestCallback<_money_movement_GetBalanceResponse__Output>): grpc.ClientUnaryCall;
  getBalance(argument: _money_movement_GetBalanceRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_money_movement_GetBalanceResponse__Output>): grpc.ClientUnaryCall;
  getBalance(argument: _money_movement_GetBalanceRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_money_movement_GetBalanceResponse__Output>): grpc.ClientUnaryCall;
  getBalance(argument: _money_movement_GetBalanceRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_money_movement_GetBalanceResponse__Output>): grpc.ClientUnaryCall;
  getBalance(argument: _money_movement_GetBalanceRequest, callback: grpc.requestCallback<_money_movement_GetBalanceResponse__Output>): grpc.ClientUnaryCall;
  
  Transact(argument: _money_movement_TransactRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_money_movement_TransactResponse__Output>): grpc.ClientUnaryCall;
  Transact(argument: _money_movement_TransactRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_money_movement_TransactResponse__Output>): grpc.ClientUnaryCall;
  Transact(argument: _money_movement_TransactRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_money_movement_TransactResponse__Output>): grpc.ClientUnaryCall;
  Transact(argument: _money_movement_TransactRequest, callback: grpc.requestCallback<_money_movement_TransactResponse__Output>): grpc.ClientUnaryCall;
  transact(argument: _money_movement_TransactRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_money_movement_TransactResponse__Output>): grpc.ClientUnaryCall;
  transact(argument: _money_movement_TransactRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_money_movement_TransactResponse__Output>): grpc.ClientUnaryCall;
  transact(argument: _money_movement_TransactRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_money_movement_TransactResponse__Output>): grpc.ClientUnaryCall;
  transact(argument: _money_movement_TransactRequest, callback: grpc.requestCallback<_money_movement_TransactResponse__Output>): grpc.ClientUnaryCall;
  
}

export interface MoneyMovementServiceHandlers extends grpc.UntypedServiceImplementation {
  GetBalance: grpc.handleUnaryCall<_money_movement_GetBalanceRequest__Output, _money_movement_GetBalanceResponse>;
  
  Transact: grpc.handleUnaryCall<_money_movement_TransactRequest__Output, _money_movement_TransactResponse>;
  
}

export interface MoneyMovementServiceDefinition extends grpc.ServiceDefinition {
  GetBalance: MethodDefinition<_money_movement_GetBalanceRequest, _money_movement_GetBalanceResponse, _money_movement_GetBalanceRequest__Output, _money_movement_GetBalanceResponse__Output>
  Transact: MethodDefinition<_money_movement_TransactRequest, _money_movement_TransactResponse, _money_movement_TransactRequest__Output, _money_movement_TransactResponse__Output>
}
