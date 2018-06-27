module.exports = function (babel) {
  const { types: t } = babel;
  
  return {
    visitor: {
      CallExpression(path) {
        if (path.BABEL_PLUGIN_ADD_MODULE_REQUIRE || path.node.BABEL_PLUGIN_ADD_MODULE_REQUIRE || path.node.callee.name !== 'require' || /^[\w@]/.test(path.node.arguments[0].value)) {
          return;
        }
        const requireExpression = t.callExpression(
          t.identifier('require'),
          path.node.arguments
        );
        const requireDefaultExpression = t.logicalExpression(
          '||',
          t.memberExpression(
            requireExpression,
            t.identifier('default'),
            false
          ),
          requireExpression,
        );
        requireExpression.BABEL_PLUGIN_ADD_MODULE_REQUIRE = true;
        path.replaceWith(
          t.callExpression(
            t.functionExpression(
              null,
              [],
              t.blockStatement(
                [
                  t.variableDeclaration(
                    'const',
                    [
                      t.variableDeclarator(
                        t.identifier('obj'),
                        requireDefaultExpression
                      )
                    ]
                  ),
                  t.ifStatement(
                    t.identifier('obj'),
                    t.expressionStatement(t.assignmentExpression(
                      '=',
                      t.memberExpression(
                        t.identifier('obj'),
                        t.stringLiteral('default'),
                        true
                      ),
                      t.identifier('obj')
                    )),
                  ),
                  t.returnStatement(
                    t.identifier('obj')
                  )
                ]
              )
            ),
            []
          )
        );
        path.BABEL_PLUGIN_ADD_MODULE_REQUIRE = true;
      },
      ImportDeclaration(path) {
        if (path.BABEL_PLUGIN_ADD_MODULE_REQUIRE || /^[\w@]/.test(path.node.source.value)) {
          return;
        }
        const requireExpression = t.callExpression(t.identifier('require'), [path.node.source]);
        const requireDefaultExpression = t.logicalExpression(
          '||',
          t.memberExpression(
            requireExpression,
            t.identifier('default'),
            false
          ),
          t.objectExpression([]),
        );
        requireExpression.BABEL_PLUGIN_ADD_MODULE_REQUIRE = true;
        const array = [];
        const specifiers = path.node.specifiers.filter(item => {
          if (item.type === 'ImportSpecifier') {
            array.push(
              t.variableDeclarator(
                item.local,
                t.conditionalExpression(
                  t.binaryExpression(
                    'in',
                    t.stringLiteral(item.imported.name),
                    requireExpression
                  ),
                  t.memberExpression(
                    requireExpression,
                    item.imported,
                    false
                  ),
                  t.memberExpression(
                    requireDefaultExpression,
                    item.imported,
                    false
                  ),
                )
              )
            );
            return false;
          }
          return true;
        });
        if (specifiers.length > 0) {
          path.replaceWith(
            t.importDeclaration(specifiers, path.node.source)
          );
          if (array.length > 0) {
            path.insertAfter(
              t.variableDeclaration(
                'const',
                array
              )
            );
          }
        } else {
          if (array.length > 0) {
            path.replaceWith(
              t.variableDeclaration(
                'const',
                array
              )
            );
          }
        }
        path.BABEL_PLUGIN_ADD_MODULE_REQUIRE = true;
      }
    }
  };
}
