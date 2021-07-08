import * as RTL from "./appsync-resolver-testing-library";

test("Initializes to something sane", () => {
  const got = RTL.init();
  expect(got).toMatchObject({
    state: "PRE_EXECUTION",
    context: {
      authType: "API_KEY",
    },
  });
});

test("rendering plain string", () => {
  const template = "My template";
  const state = RTL.chain(RTL.init(), RTL.mapRequest(template));
  expect(state.render).toMatch(template);
});

test("vanilla template", () => {
  const template = `My template#foreach( $name in $names) $name #end`;
  const state = RTL.chain(RTL.init(), RTL.mapRequest(template));
  expect(state.render).toBe("My template");
});

test("utils.qr", () => {
  const template = `
   #set($myMap = {})
   $util.qr($myMap.put("id", "first value"))
  `;
  const state = RTL.chain(RTL.init(), RTL.mapRequest(template));
  expect(state.render?.trim()).toBe("");
});

test("utils.toJson", () => {
  const template = `
   #set($myMap = {})
   $util.quiet($myMap.put("id", "first value"))
   $util.toJson($myMap)
  `;
  const state = RTL.chain(RTL.init(), RTL.mapRequest(template));
  expect(state.render?.trim()).toBe(JSON.stringify({ id: "first value" }));
});

test("utils.toJson", () => {
  const template = `
     #set($myMap = {})
     $util.quiet($myMap.put("id", "first value"))
     $util.toJson($myMap)
  `;
  const state = RTL.chain(RTL.init(), RTL.mapRequest(template));
  expect(state.render?.trim()).toBe(JSON.stringify({ id: "first value" }));
});

test("read arguments", () => {
  const template = `
     #set($myMap = {})
     $util.quiet($myMap.put("id", $ctx.arguments.id))
     $util.toJson($myMap)
  `;
  const state = RTL.chain(
    RTL.init(),
    RTL.setArguments({ id: "abc123" }),
    RTL.mapRequest(template)
  );
  expect(state.render?.trim()).toBe(JSON.stringify({ id: "abc123" }));
});

test("shortcut setter", () => {
  const template = `
    #set($result = null)
    #foreach($post in $ctx.source.posts)
      #if($post.id == $context.arguments.id)
        #set($result = $post)
      #end
    #end
    #if($result)
      $utils.toJson($result)
    #end
  `;
  const post = {
    id: "abc123",
    body: "Some Pig",
  };
  const state = RTL.chain(
    RTL.init((state) => ({
      ...state,
      context: {
        ...state.context,
        source: {
          __typename: "User",
          id: 123,
          posts: [{ id: "b", body: "not right" }, post],
        },
      },
    })),
    RTL.setArguments({ id: "abc123" }),
    RTL.mapRequest(template)
  );
  expect(state.render?.trim()).toBe(JSON.stringify(post));
});

test("Error", () => {
  const template = `
    $utils.error("this is my error")
  `;
  const pipeline = RTL.init();
  expect(() => RTL.mapRequest(template)(pipeline)).toThrow();
});
