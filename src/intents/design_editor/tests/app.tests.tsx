/* eslint-disable formatjs/no-literal-string-in-jsx */
/**
 * Tests for the PageMint App root component.
 *
 * The scaffold's hello_world tests (DOCS_URL button, addElementAtPoint click)
 * have been replaced with PageMint-specific rendering tests.
 * The original scaffold test code is preserved in git history.
 */
import { TestAppI18nProvider } from "@canva/app-i18n-kit";
import { TestAppUiProvider } from "@canva/app-ui-kit";
import { render } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import type { ReactNode } from "react";
import { App } from "../app";

// Mock the importer modules that would require Canva SDK at runtime
jest.mock("../../../importer/token");
jest.mock("../../../importer/emit-elements", () => ({
  useAddElement: jest.fn(() => jest.fn()),
}));

import { readToken } from "../../../importer/token";

const mockReadToken = readToken as jest.MockedFunction<typeof readToken>;

function renderInTestProvider(node: ReactNode): RenderResult {
  return render(
    <TestAppI18nProvider>
      <TestAppUiProvider>{node}</TestAppUiProvider>
    </TestAppI18nProvider>,
  );
}

describe("PageMint App", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("renders NoTokenNotice when readToken returns null", () => {
    mockReadToken.mockReturnValue(null);
    const result = renderInTestProvider(<App />);
    expect(result.getByText(/start from pagemint/i)).toBeTruthy();
  });

  it("renders ImportPanel when readToken returns a token", () => {
    mockReadToken.mockReturnValue("test-token-abc");
    // ImportPanel will try to auto-start; we just verify it renders
    // (the import flow itself is tested in unit tests for emitElements etc.)
    const result = renderInTestProvider(<App />);
    // ImportPanel renders with "PageMint" title
    expect(result.getByText("PageMint")).toBeTruthy();
  });
});
