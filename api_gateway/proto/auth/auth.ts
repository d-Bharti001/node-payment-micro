import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { AuthServiceClient as _auth_AuthServiceClient, AuthServiceDefinition as _auth_AuthServiceDefinition } from './auth/AuthService';
import type { Credentials as _auth_Credentials, Credentials__Output as _auth_Credentials__Output } from './auth/Credentials';
import type { Token as _auth_Token, Token__Output as _auth_Token__Output } from './auth/Token';
import type { User as _auth_User, User__Output as _auth_User__Output } from './auth/User';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  auth: {
    AuthService: SubtypeConstructor<typeof grpc.Client, _auth_AuthServiceClient> & { service: _auth_AuthServiceDefinition }
    Credentials: MessageTypeDefinition<_auth_Credentials, _auth_Credentials__Output>
    Token: MessageTypeDefinition<_auth_Token, _auth_Token__Output>
    User: MessageTypeDefinition<_auth_User, _auth_User__Output>
  }
}

