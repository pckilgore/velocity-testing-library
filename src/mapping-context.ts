/**
 * This module models the context that is pipeline-stage dependent
 */

export interface RequestContext {}

export interface ResponseContext {
  result: object;
}

export interface PipelineRequestContext {
  stash: object;
  prev: {
    result: object;
  };
}

export interface PipelineResponseContext {
  result: object;
  stash: object;
  prev: {
    result: object;
  };
}

export type T =
  | RequestContext
  | ResponseContext
  | PipelineRequestContext
  | PipelineResponseContext;

export const defaultValue: T = {};
