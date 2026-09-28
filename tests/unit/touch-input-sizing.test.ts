import { readFileSync } from "node:fs";
import { parse } from "postcss";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const nonTextInputs = new Set(["checkbox", "radio", "range", "color", "file", "hidden", "button", "submit", "reset"]);

describe("shopping form input sizing", () => {
  it("keeps the shared input style at 16px without disabling browser zoom", () => {
    const css = parse(readFileSync("src/app/globals.css", "utf8"));
    let inputUtilities: string[] = [];
    css.walkRules(".tr-input", (rule) => {
      rule.walkAtRules("apply", (apply) => { inputUtilities = apply.params.split(/\s+/); });
    });
    expect(inputUtilities).toContain("text-base");
    expect(inputUtilities.some((utility) => /(?:^|:)text-(?:xs|sm)$/.test(utility))).toBe(false);
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    expect(layout).not.toMatch(/userScalable\s*:\s*false|maximumScale\s*:/);
  });

  it.each([
    "src/components/checkout/embedded-checkout.tsx",
    "src/components/checkout/address-autocomplete.tsx",
    "src/components/product/product-setup-chooser.tsx"
  ])("keeps every editable control in %s large enough in portrait and landscape", (path) => {
    const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let checked = 0;
    function visit(node: ts.Node) {
      if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
        const tag = node.tagName.getText(source);
        if (["input", "select", "textarea"].includes(tag)) {
          const attribute = (name: string) => {
            const prop = node.attributes.properties.find((property) => ts.isJsxAttribute(property) && property.name.getText(source) === name);
            return prop && ts.isJsxAttribute(prop) && prop.initializer && ts.isStringLiteral(prop.initializer) ? prop.initializer.text : "";
          };
          if (tag !== "input" || !nonTextInputs.has(attribute("type"))) {
            const classes = attribute("className").split(/\s+/);
            expect(classes.some((name) => ["text-base", "tr-input", "tr-textarea"].includes(name)), `${path}: ${node.getText(source)}`).toBe(true);
            expect(classes.some((name) => /(?:^|:)text-(?:xs|sm)$/.test(name))).toBe(false);
            checked += 1;
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    expect(checked).toBeGreaterThan(0);
  });
});
