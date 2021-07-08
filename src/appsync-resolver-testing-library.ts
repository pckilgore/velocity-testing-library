import { AST, Compile, parse } from "amplify-velocity-template";
import { map as toJavaType } from "amplify-appsync-simulator/lib/velocity/value-mapper/mapper";
import * as ExecutionContext from "./execution-context";
import * as State from "./state";

import { inspect as nodeInspect } from "util";

import { pipe } from "fp-ts/function";
export const chain = pipe;

/**
 * Helper for logging state updates to console in operation chain
 */
export function inspect(state: State.T) {
  console.log(nodeInspect(state, false, null));
  return state;
}

/**
 * Helper for logging state updates to console in operation chain
 */
export function history(state: State.T) {
  return nodeInspect(state.history, false, null);
}

class VTLRenderPipelineError extends Error {
  history;
  constructor({ state, msg }: { state: State.T; msg: string }) {
    super(`${msg}\n\nOperation History:\n${history(state)}`);
    this.name = "VTLRenderPipelineError";
    this.history = state.history;
  }
}

/**
 * Initialize a Pipeline with default state or the specified state
 */
export const init = (initializer?: State.T | ((arg0: State.T) => State.T)) => {
  if (typeof initializer === "function") {
    return State.make(initializer(State.defaultValue));
  }
  if (initializer) {
    return State.make(initializer);
  }
  return State.make();
};

const render = (ast: AST, state: State.T) =>
  new Compile(ast, {
    escape: false,
    valuemapper: toJavaType,
  }).render(ExecutionContext.make(state));

export const setArguments = (args: object) => (state: State.T): State.T => {
  const op = "SET_ARGUMENTS";
  if (state.state === State.ResolverState.PRE_EXECUTION) {
    return State.update(op, state, {
      ...state,
      context: {
        ...state.context,
        arguments: args,
      },
    });
  }

  throw new VTLRenderPipelineError({
    state,
    msg: `Cannot ${op} in state ${state.state}`,
  });
};

type mockReponse = (arg0: string) => string;

export const respond = (mockResponseFn: mockReponse) => (
  state: State.T
): State.T => {
  const op = "MOCK_RESPONSE";

  if (state.state === State.ResolverState.REQUEST_MAPPED) {
    const response = mockResponseFn(state?.render || "");

    return State.update(op, state, {
      ...state,
      state: State.ResolverState.REQUEST_MAPPED,
      context: {
        ...state.context,
        result: JSON.parse(response),
      },
    });
  }

  throw new VTLRenderPipelineError({
    state,
    msg: `Cannot ${op} in state ${state.state}`,
  });
};

export const mapRequest = (template: string) => (
  state: State.T
): State.requestMapped => {
  const op = "RENDER_REQUEST_MAPPING_TEMPLATE";
  if (state.state === State.ResolverState.PRE_EXECUTION) {
    try {
      const ast = parse(template);
      return State.update<State.requestMapped>(op, state, {
        ...state,
        state: State.ResolverState.REQUEST_MAPPED,
        template,
        render: render(ast, state),
      });
    } catch (err) {
      const details = err?.hash
        ? `${err.hash.line}:${
            err.hash.loc?.first_column ? err.hash.loc.first_column : ""
          }`
        : "UNKNOWN";

      throw new VTLRenderPipelineError({
        state: State.update(op, state, {
          ...state,
          state: State.ResolverState.REQUEST_MAPPED,
          template,
          render: "",
        }),
        msg: `Failed to compile@${details}: ${err.message}`,
      });
    }
  }

  throw new VTLRenderPipelineError({
    state,
    msg: `Cannot ${op} in state ${state.state}`,
  });
};

// export class ResolverTester {
// private authType: string;
//
// constructor(opts: options) {
// this.authType = opts.authType || "API_KEY";
// }
//
// private buildRenderContext(
// ctxValues: AppAppSyncVTLRenderContext,
// requestContext: AppSyncGraphQLExecutionContext,
// info: GraphQLResolveInfo
// ): any {
// const {
// source,
// arguments: argument,
// result,
// stash,
// prevResult,
// error,
// } = ctxValues;
// const { jwt } = requestContext;
// const { iss: issuer, sub, "cognito:username": cognitoUserName, username } =
// jwt || {};
//
// const util = createUtil([], new Date(Date.now()), info);
// const args = convertToJavaTypes(argument);
// // Identity is null for API Key
// let identity = null;
// if (
// requestContext.requestAuthorizationMode ===
// AmplifyAppSyncSimulatorAuthenticationType.OPENID_CONNECT
// ) {
// identity = convertToJavaTypes({
// sub,
// issuer,
// claims: requestContext.jwt,
// });
// } else if (
// requestContext.requestAuthorizationMode ===
// AmplifyAppSyncSimulatorAuthenticationType.AMAZON_COGNITO_USER_POOLS
// ) {
// identity = convertToJavaTypes({
// sub,
// issuer,
// "cognito:username": cognitoUserName,
// username: username || cognitoUserName,
// sourceIp: requestContext.sourceIp,
// claims: requestContext.jwt,
// ...(this.simulatorContext.appSyncConfig.defaultAuthenticationType
// .authenticationType ===
// AmplifyAppSyncSimulatorAuthenticationType.AMAZON_COGNITO_USER_POOLS
// ? { defaultAuthStrategy: "ALLOW" }
// : {}),
// });
// }
//
// const vtlContext = {
// arguments: args,
// args,
// info: convertToJavaTypes(createInfo(info)),
// request: { headers: requestContext.headers },
// identity,
// stash: convertToJavaTypes(stash || {}),
// source: convertToJavaTypes(source),
// result: convertToJavaTypes(result),
// // surfacing the errorType to ensure the type is included in $ctx.error
// // Mapping Template Errors: https://docs.aws.amazon.com/appsync/latest/devguide/troubleshooting-and-common-mistakes.html#mapping-template-errors
// error: error
// ? {
// ...error,
// type:
// error.type || error.extensions?.errorType || "UnknownErrorType",
// message: error.message || `Error: ${error}`,
// }
// : error,
// };
//
// if (typeof prevResult !== "undefined") {
// vtlContext["prev"] = convertToJavaTypes({
// result: prevResult,
// });
// }
//
// return {
// util,
// utils: util,
// context: vtlContext,
// ctx: vtlContext,
// };
// }
//
/**
 * Execute a request mapping template
 */
// public request = (
// template: string,
// ctxValues: AppSyncGraphQLExecutionContext,
// date = new Date(Date.now()),
// info = (DeepMock as unknown) as GraphQLResolveInfo
// ): string => {
// const ast = parse(template);
// const compiler = new Compile(ast, {
// escape: false,
// valueMapper: toJavaType,
// });
//
// const context = this.buildRenderContext();
//
// return compiler.render(context);
// };
// }
