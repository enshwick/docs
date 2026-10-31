import ts from 'typescript';

/**
 * The code style rules a linter here cannot hold: a native `enum` over `const enum`, behaviour on
 * classes rather than loose exported functions, no re-exports in the application, a reason above
 * every suppression, and tests in `__tests__`. Use it on every tracked TypeScript and Astro file.
 */
export class CodeRules {
  private static readonly suppression =
    /(?:oxlint|eslint)-disable|@ts-(?:expect-error|ignore|nocheck)/u;
  private static readonly comment = /^\s*(?:\/\/|\/\*|\*)/u;
  private static readonly testFile = /\.test\.ts$/u;
  private static readonly testFolder = '/__tests__/';
  private static readonly typeScript = /\.m?ts$/u;
  private static readonly pages = 'src/pages/';
  /** What Astro reads from a route file by name: its handlers and its static paths. */
  private static readonly routeExports = /^(?:GET|POST|PUT|PATCH|DELETE|ALL|getStaticPaths)$/u;

  /** The problems of one file, each as `<path>:<line>: <what to change>`. */
  public static problems(path: string, text: string): string[] {
    const problems = CodeRules.suppressions(path, text);

    if (CodeRules.testFile.test(path) && !`/${path}`.includes(CodeRules.testFolder)) {
      problems.push(`${path}:1: a test lives in a __tests__ folder beside the code it tests`);
    }

    if (CodeRules.typeScript.test(path)) {
      problems.push(...CodeRules.syntax(path, text));
    }

    return problems;
  }

  /** A suppression comment needs a comment line right above it that says why. */
  private static suppressions(path: string, text: string): string[] {
    const lines = text.split('\n');

    return lines.flatMap((line, index) => {
      if (!CodeRules.suppression.test(line) || !CodeRules.comment.test(line)) {
        return [];
      }

      const above = lines[index - 1] ?? '';
      const reasoned = CodeRules.comment.test(above) && !CodeRules.suppression.test(above);

      return reasoned
        ? []
        : [`${path}:${index + 1}: give the suppression its reason on the line above`];
    });
  }

  private static syntax(path: string, text: string): string[] {
    const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
    const at = (node: ts.Node): string =>
      `${path}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`;
    const problems: string[] = [];

    const visit = (node: ts.Node): void => {
      if (ts.isEnumDeclaration(node) && CodeRules.has(node, ts.SyntaxKind.ConstKeyword)) {
        problems.push(`${at(node)}: use a native enum, not a const enum`);
      }

      ts.forEachChild(node, visit);
    };

    visit(source);

    for (const statement of source.statements) {
      if (ts.isExportDeclaration(statement) && statement.moduleSpecifier !== undefined) {
        problems.push(
          `${at(statement)}: import the file that declares it instead of re-exporting it`,
        );
      }

      if (CodeRules.looseFunctions(statement).some((name) => !CodeRules.isRoute(path, name))) {
        problems.push(
          `${at(statement)}: put an exported function on its type or as a static method`,
        );
      }
    }

    return problems;
  }

  /** The names of the functions a top-level statement exports outside a class. */
  private static looseFunctions(statement: ts.Statement): string[] {
    if (!CodeRules.has(statement, ts.SyntaxKind.ExportKeyword)) {
      return [];
    }

    if (ts.isFunctionDeclaration(statement)) {
      return [statement.name?.text ?? 'default'];
    }

    if (!ts.isVariableStatement(statement)) {
      return [];
    }

    return statement.declarationList.declarations
      .filter(
        ({ initializer }) =>
          initializer !== undefined &&
          (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)),
      )
      .map(({ name }) => (ts.isIdentifier(name) ? name.text : ''));
  }

  private static isRoute(path: string, name: string): boolean {
    return path.startsWith(CodeRules.pages) && CodeRules.routeExports.test(name);
  }

  private static has(node: ts.Node, kind: ts.SyntaxKind): boolean {
    return (
      ts.canHaveModifiers(node) &&
      (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === kind)
    );
  }
}
