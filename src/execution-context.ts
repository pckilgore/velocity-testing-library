/**
 * Execution context is set of values and functions available to the velocity
 * compiler when it executes your template.
 *
 * As an implementation detail, it is passed the "mapping context" (aka the
 * $ctx or $context), but that type is modeled in ./mapping-context.ts (as it
 * depends on the specific step of the pipeline we are in) and in
 * ./request-context.ts (which is the same for entire pipeline)
 */
import * as AppSyncUtils from "amplify-appsync-simulator/lib/velocity/util";
import type { GraphQLResolveInfo } from "graphql";

import type { T as RequestContext } from "./request-context";
import type { T as MappingContext } from "./mapping-context";
import type { T as ResolverState } from "./state";

export type executionContext = {
  util: ReturnType<typeof AppSyncUtils.create>;
  utils: ReturnType<typeof AppSyncUtils.create>;
  context: RequestContext & MappingContext;
  ctx: RequestContext & MappingContext;
};

export const make = (
  state: ResolverState,
  info: GraphQLResolveInfo = {} as GraphQLResolveInfo
) => {
  const util = {
    ...AppSyncUtils.create([], new Date(Date.now()), info),
    error(message: string) {
      const err = new Error(message);
      this.errors.push(err);
      throw err;
    },
  };
  const context = { ...state.context, args: state.context.arguments };

  return {
    context,
    ctx: context,
    util,
    utils: util,
  };
};
