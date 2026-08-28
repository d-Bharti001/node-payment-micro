// Original file: proto/auth.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { Credentials as _auth_Credentials, Credentials__Output as _auth_Credentials__Output } from '../auth/Credentials';
import type { Token as _auth_Token, Token__Output as _auth_Token__Output } from '../auth/Token';
import type { User as _auth_User, User__Output as _auth_User__Output } from '../auth/User';

export interface AuthServiceClient extends grpc.Client {
  LoginUser(argument: _auth_Credentials, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_Token__Output>): grpc.ClientUnaryCall;
  LoginUser(argument: _auth_Credentials, metadata: grpc.Metadata, callback: grpc.requestCallback<_auth_Token__Output>): grpc.ClientUnaryCall;
  LoginUser(argument: _auth_Credentials, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_Token__Output>): grpc.ClientUnaryCall;
  LoginUser(argument: _auth_Credentials, callback: grpc.requestCallback<_auth_Token__Output>): grpc.ClientUnaryCall;
  loginUser(argument: _auth_Credentials, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_Token__Output>): grpc.ClientUnaryCall;
  loginUser(argument: _auth_Credentials, metadata: grpc.Metadata, callback: grpc.requestCallback<_auth_Token__Output>): grpc.ClientUnaryCall;
  loginUser(argument: _auth_Credentials, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_Token__Output>): grpc.ClientUnaryCall;
  loginUser(argument: _auth_Credentials, callback: grpc.requestCallback<_auth_Token__Output>): grpc.ClientUnaryCall;
  
  ValidateToken(argument: _auth_Token, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_User__Output>): grpc.ClientUnaryCall;
  ValidateToken(argument: _auth_Token, metadata: grpc.Metadata, callback: grpc.requestCallback<_auth_User__Output>): grpc.ClientUnaryCall;
  ValidateToken(argument: _auth_Token, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_User__Output>): grpc.ClientUnaryCall;
  ValidateToken(argument: _auth_Token, callback: grpc.requestCallback<_auth_User__Output>): grpc.ClientUnaryCall;
  validateToken(argument: _auth_Token, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_User__Output>): grpc.ClientUnaryCall;
  validateToken(argument: _auth_Token, metadata: grpc.Metadata, callback: grpc.requestCallback<_auth_User__Output>): grpc.ClientUnaryCall;
  validateToken(argument: _auth_Token, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_User__Output>): grpc.ClientUnaryCall;
  validateToken(argument: _auth_Token, callback: grpc.requestCallback<_auth_User__Output>): grpc.ClientUnaryCall;
  
}

export interface AuthServiceHandlers extends grpc.UntypedServiceImplementation {
  LoginUser: grpc.handleUnaryCall<_auth_Credentials__Output, _auth_Token>;
  
  ValidateToken: grpc.handleUnaryCall<_auth_Token__Output, _auth_User>;
  
}

export interface AuthServiceDefinition extends grpc.ServiceDefinition {
  LoginUser: MethodDefinition<_auth_Credentials, _auth_Token, _auth_Credentials__Output, _auth_Token__Output>
  ValidateToken: MethodDefinition<_auth_Token, _auth_User, _auth_Token__Output, _auth_User__Output>
}
