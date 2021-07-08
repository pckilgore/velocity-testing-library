/**
 * This module models Context for an entire pipeline of operations
 */

export enum AuthType {
  API_KEY = "API_KEY",
  AWS_IAM = "AWS_IAM",
  AWS_COGNITO = "AMAZON_COGNITO_USER_POOLS",
}

interface BaseContext {
  arguments: object;
  source: object;
  appsyncErrors: Array<Error>;
  request: {
    headers: Record<string, string>;
  };
}

interface Cognito {
  identity: {
    sub: string;
    issuer: string;
    username: string;
    claims: Record<string, string>;
    sourceIp: string[];
    defaultAuthStrategy: string;
  };
}

interface IAM {
  identity: {
    accountId: string;
    cognitoIdentityPoolId: string;
    cognitoIdentityId: string;
    sourceIp: string[];
    username: string;
    userArn: string;
    cognitoIdentityAuthType: string; // authenticated/unauthenticated based on the identity type
    cognitoIdentityAuthProvider: string; // the auth provider that was used to obtain the credentials
  };
}

export type T =
  | Readonly<{ authType: AuthType.API_KEY } & BaseContext>
  | Readonly<{ authType: AuthType.AWS_COGNITO } & BaseContext & Cognito>
  | Readonly<{ authType: AuthType.AWS_IAM } & BaseContext & IAM>;

export const defaultValue: T = {
  authType: AuthType.API_KEY,
  appsyncErrors: [],
  arguments: {},
  source: {},
  request: {
    headers: {},
  },
};
