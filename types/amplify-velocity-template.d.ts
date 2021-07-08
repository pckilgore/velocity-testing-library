declare module "amplify-velocity-template" {
  // Helper: Helper,
  declare interface AST {}
  declare type customBlocks = Record<string, unknown>;

  export function parse(
    template: string,
    customBlocks?: customBlocks,
    ignoreSpace?: boolean
  ): AST;

  declare type config = unknown;
  declare interface ContextT extends object {}

  export class Compile {
    constructor(ast: AST, config?: config);
    render<ContextT>(context: ContextT): string;
  }
}
