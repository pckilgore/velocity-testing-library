type t = { [property: string]: t };

type options = {
  failOnUse: boolean;
};

const makeMsg = (field: Symbol | string): string => `
ERR: You must provide a custom GraphQLResolveInfo object to access it in tests.
INFO: You tried to access the field info.${String(field)}.
INFO: To mock, set the MockInfo option.
`;

/**
 * Creates a deep mock of the GraphQLResolveInfo object using JS object proxy.
 */
export const make: (arg0: options) => t = (options) =>
  new Proxy(
    {},
    {
      get(target, prop, receive) {
        const err = makeMsg(prop);
        if (options.failOnUse) {
          throw new Error(err);
        }
        console.error(err);
        return make(options);
      },
    }
  );
