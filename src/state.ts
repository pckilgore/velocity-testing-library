/**
 * This module defines operation state and monadic operations on that state.
 */
import { inspect } from "util";
import * as MappingContext from "./mapping-context";
import * as RequestContext from "./request-context";

export enum ResolverState {
  PRE_EXECUTION = "PRE_EXECUTION",
  REQUEST_MAPPED = "REQUEST_MAPPED",
  PIPELINE_REQUEST_MAPPED = "PIPELINE_REQUEST_MAPPED",
  PIPELINE_RESPONSE_MAPPED = "PIPELINE_RESPONSE_MAPPED",
  RESPONSE_MAPPED = "RESPONSE_MAPPED",
  ERROR = "ERROR",
}

interface PipelineState {
  state: ResolverState;
  debug: boolean;
  errors: Array<Error>;
  history: ReadonlyArray<
    Readonly<Omit<PipelineState, "history"> & { action: string }>
  >;
}

export type preExecution = PipelineState & {
  state: ResolverState.PRE_EXECUTION;
  context: RequestContext.T & MappingContext.RequestContext;
};

export type requestMapped = PipelineState & {
  state: ResolverState.REQUEST_MAPPED;
  context: RequestContext.T & MappingContext.RequestContext;
  template: string;
  render: string;
};

export type responseMapped = PipelineState & {
  state: ResolverState.RESPONSE_MAPPED;
  context: RequestContext.T & MappingContext.ResponseContext;
  template: string;
  render: string;
};

export type pipelineRequestMapped = PipelineState & {
  state: ResolverState.PIPELINE_REQUEST_MAPPED;
  context: RequestContext.T & MappingContext.PipelineRequestContext;
  template: string;
  render: string;
};

export type pipelineResponseMapped = PipelineState & {
  state: ResolverState.PIPELINE_RESPONSE_MAPPED;
  context: RequestContext.T & MappingContext.PipelineResponseContext;
  template: string;
  render: string;
};

type error = PipelineState & {
  state: ResolverState.ERROR;
  context?: any;
  template?: any;
  render?: any;
};

type state =
  | preExecution
  | requestMapped
  | responseMapped
  | pipelineRequestMapped
  | pipelineResponseMapped
  | error;

export type T = Readonly<state>;

export type update = (arg0: T) => T;

export const defaultValue: Readonly<T> = {
  state: ResolverState.PRE_EXECUTION,
  debug: false,
  context: {
    ...MappingContext.defaultValue,
    ...RequestContext.defaultValue,
  },
  history: [],
  errors: [],
};

// Initialize with a specific state, wiping history
export function make(state: T = defaultValue): T {
  const { history: _, ...initialState } = state;
  const nextState = { ...defaultValue, ...initialState };

  return {
    ...nextState,
    history: [{ action: "NEW_STATE", ...nextState }],
  };
}

// Update operation state
export function update<Update extends T>(
  action: string,
  { history, ...prevState }: T,
  update: Update
): Update {
  if (prevState.debug) {
    console.group("Velocity Renderer State Update");
    console.log({
      action,
      prev: prevState,
      update: update,
      history: inspect(history, false, null),
    });
    console.groupEnd();
  }

  return {
    ...update,
    history: [...history, { action, ...update }],
  };
}
