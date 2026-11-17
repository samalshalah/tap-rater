import { beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0 }));
vi.mock("react", async original => ({
  ...await original<object>(),
  useEffect: vi.fn(), useId: () => "setup", useRef: (current: unknown) => ({ current }),
  useMemo: (create: () => unknown) => create(),
  useState: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.values)) state.values[index] = typeof initial === "function" ? initial() : initial;
    return [state.values[index], (value: unknown) => {
      state.values[index] = typeof value === "function" ? value(state.values[index]) : value;
    }];
  }
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/cart/cart-provider", () => ({ useCart: () => ({ items: [] }) }));
vi.mock("@/components/product/use-product-google-search", () => ({ useProductGoogleSearch: () => ({}) }));
import { useProductSetupState } from "@/components/product/use-product-setup-state";
import { migratedProducts } from "@/data/migrated-products";

function render() {
  state.cursor = 0;
  return useProductSetupState({ product: migratedProducts.find(product => product.slug === "google-review-stand")! });
}
beforeEach(() => { state.values = []; state.cursor = 0; });

it("defaults business-name printing on but leaves a blank name optional", () => {
  let setup = render();
  expect(setup.printBusinessName).toBe(true);
  expect(setup.proofSetup.businessName).toBeUndefined();
  expect(setup.proofSetup.showBusinessNameOnProof).toBe(false);
  setup.setBusinessName("  My business  ");
  setup = render();
  expect(setup.proofSetup.businessName).toBe("My business");
  expect(setup.proofSetup.showBusinessNameOnProof).toBe(true);
});

it("retains explicit opt-out through name edits and step changes in proof state", () => {
  let setup = render();
  setup.setBusinessName("Original business");
  setup.setShowBusinessNameOnProof(false);
  setup = render();
  setup.setBusinessName("Updated business");
  setup.setStep("review");
  setup = render();
  expect(setup.printBusinessName).toBe(false);
  expect(setup.proofSetup.showBusinessNameOnProof).toBe(false);
  expect(setup.proofSetup.businessName).toBeUndefined();
  expect(setup.businessName).toBe("Updated business");
});
