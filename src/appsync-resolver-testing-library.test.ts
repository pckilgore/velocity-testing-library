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
  const want = JSON.stringify({ id: "first value" });

  expect(state.render?.trim()).toBe(want);
});

test("utils.toJson nested array", () => {
  const template = `
     #set($myMap = {})
     #set($myOtherMap = { "a": [1,2,3,4] })
     $util.quiet($myMap.put("id", "first value"))
     $util.quiet($myOtherMap.put("subField", 1))
     $util.quiet($myMap.put("field", $myOtherMap))
     $util.toJson($myMap)
  `;
  const state = RTL.chain(RTL.init(), RTL.mapRequest(template));
  const got = JSON.parse(state.render?.trim());
  const want = {
    id: "first value",
    field: {
      a: [1, 2, 3, 4],
      subField: 1,
    },
  };
  expect(got).toMatchObject(want);
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
  const got = JSON.parse(state.render);
  const want = { id: "abc123" };

  expect(got).toMatchObject(want);
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

  const got = JSON.parse(state.render);

  expect(got).toMatchObject(post);
});

test("Error", () => {
  const template = `
    $utils.error("this is my error")
  `;
  const pipeline = RTL.init();
  expect(() => RTL.mapRequest(template)(pipeline)).toThrow();
});

test("Quiet Reference", () => {
  const template = `
    {
      #set($myValue = 5)
      "first": "$myValue",
      "second": "$somethingelse",
      "third": "$!{somethingelse}"
    }
  `;
  const state = RTL.chain(RTL.init(), RTL.mapRequest(template));

  expect(JSON.parse(state.render)).toEqual({
    first: "5",
    // literal because undefined
    second: "$somethingelse",
    // empty because quiet reference syntax above
    third: "",
  });
});

describe("AWS's own examples", () => {
  test("dynamodb GetItem", () => {
    const template = `
      {
        "version" : "2017-02-28",
        "operation" : "GetItem",
        "key" : {
            "foo" : $util.dynamodb.toDynamoDBJson($ctx.arguments.foo),
            "bar" : $util.dynamodb.toDynamoDBJson($ctx.arguments.bar)
        },
        "consistentRead" : true
      }
    `;

    const state = RTL.chain(
      RTL.init(),
      RTL.setArguments({
        foo: "FOO",
        bar: "BAR",
      }),
      RTL.mapRequest(template)
    );

    expect(JSON.parse(state.render)).toMatchObject({
      version: "2017-02-28",
      operation: "GetItem",
      key: {
        foo: { S: "FOO" },
        bar: { S: "BAR" },
      },
      consistentRead: true,
    });
  });

  test("DynamoDB Update Item", () => {
    const template = `
      {
        "version" : "2017-02-28",
        "operation" : "UpdateItem",
        "key" : {
          "id" : $util.dynamodb.toDynamoDBJson($ctx.args.id)
        },

        ## Set up some space to keep track of things we're updating **
        #set( $expNames  = {} )
        #set( $expValues = {} )
        #set( $expSet = {} )
        #set( $expAdd = {} )
        #set( $expRemove = [] )

        ## Increment "version" by 1 **
        $util.qr($expAdd.put("version", ":newVersion"))
        $util.qr($expValues.put(":newVersion", { "N" : 1 }))

        ## Iterate through each argument, skipping "id" and "expectedVersion" **
        #foreach( $entry in $context.arguments.entrySet() )
          #if( $entry.key != "id" && $entry.key != "expectedVersion" )
            #if( (!$entry.value) )
              ## If the argument is set to "null", then remove that attribute from the item in DynamoDB **
              $utils.qr($expRemove.add("#\${entry.key}") )
              $utils.qr($expNames.put("#\${entry.key}", "$entry.key"))
            #else
              ## Otherwise set (or update) the attribute on the item in DynamoDB **

              $utils.qr($expSet.put("#\${entry.key}", ":\${entry.key}"))
              $utils.qr($expNames.put("#\${entry.key}", "$entry.key"))

              #if( $entry.key == "ups" || $entry.key == "downs" )
                $utils.qr($expValues.put(":\${entry.key}", { "N" : $entry.value }))
              #else
                $utils.qr($expValues.put(":\${entry.key}", { "S" : "\${entry.value}" }))
              #end
            #end
          #end
        #end

        ## Start building the update expression, starting with attributes we're going to SET **
        #set( $expression = "" )
        #if( !\${expSet.isEmpty()} )
          #set( $expression = "SET" )
          #foreach( $entry in $expSet.entrySet() )
            #set( $expression = "\${expression} \${entry.key} = \${entry.value}" )
            #if ( $foreach.hasNext )
              #set( $expression = "\${expression}," )
            #end
          #end
        #end

        ## Continue building the update expression, adding attributes we're going to ADD **
        #if( !\${expAdd.isEmpty()} )
          #set( $expression = "\${expression} ADD" )
          #foreach( $entry in $expAdd.entrySet() )
            #set( $expression = "\${expression} \${entry.key} \${entry.value}" )
            #if ( $foreach.hasNext )
              #set( $expression = "\${expression}," )
            #end
          #end
        #end

        ## Continue building the update expression, adding attributes we're going to REMOVE **
        #if( !\${expRemove.isEmpty()} )
          #set( $expression = "\${expression} REMOVE" )

          #foreach( $entry in $expRemove )
            #set( $expression = "\${expression} \${entry}" )
            #if ( $foreach.hasNext )
              #set( $expression = "\${expression}," )
            #end
          #end
        #end

        ## Finally, write the update expression into the document, along with any expressionNames and expressionValues **
        "update" : {
          "expression" : "\${expression}"
          #if( !\${expNames.isEmpty()} )
            ,"expressionNames" : $utils.toJson($expNames)
          #end
          #if( !\${expValues.isEmpty()} )
            ,"expressionValues" : $utils.toJson($expValues)
          #end
        },

        "condition" : {
          "expression"       : "version = :expectedVersion",
          "expressionValues" : {
            ":expectedVersion" : $util.dynamodb.toDynamoDBJson($ctx.args.expectedVersion)
          }
        }
      }
    `;

    const state = RTL.chain(
      RTL.init(),
      RTL.setArguments({
        id: "abcdefgh-ijkl-mnop",
        title: "Test",
        author: null,
        expectedVersion: 1,
      }),
      RTL.mapRequest(template)
    );

    expect(JSON.parse(state.render)).toMatchObject({
      version: "2017-02-28",
      update: {
        expression:
          "SET #title = :title ADD version :newVersion REMOVE #author",
        expressionNames: {
          "#title": "title",
          "#author": "author",
        },
        expressionValues: {
          ":newVersion": {
            N: 1,
          },
          ":title": {
            S: "Test",
          },
        },
      },
      condition: {
        expression: "version = :expectedVersion",
        expressionValues: {
          ":expectedVersion": { N: "1" },
        },
      },
    });
  });
});
