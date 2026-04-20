import { walkDom } from "../importer/dom-walk";
import type { ElementDesc, TextElementDesc, ImageElementDesc, ShapeElementDesc } from "../importer/dom-walk";

describe("walkDom", () => {
  it("returns empty array for empty body", () => {
    const result = walkDom("<html><body></body></html>");
    expect(result).toEqual([]);
  });

  it("extracts a heading as a text element", () => {
    const html = `<html><body>
      <section>
        <h1 style="font-size: 48px; color: #ff0000; font-family: 'Inter', sans-serif;">Hello World</h1>
      </section>
    </body></html>`;

    const result = walkDom(html);
    expect(result).toHaveLength(1);
    const el = result[0] as TextElementDesc;
    expect(el.type).toBe("text");
    expect(el.text).toBe("Hello World");
    expect(el.fontSizePx).toBe(48);
    expect(el.colorHex).toBe("#ff0000");
    expect(el.fontFamily).toBe("Inter");
    expect(el.fontWeight).toBe("normal");
  });

  it("detects bold font weight from numeric value", () => {
    const html = `<html><body>
      <section>
        <h2 style="font-weight: 700; font-size: 24px;">Bold Title</h2>
      </section>
    </body></html>`;

    const result = walkDom(html);
    expect(result).toHaveLength(1);
    const el = result[0] as TextElementDesc;
    expect(el.fontWeight).toBe("bold");
  });

  it("extracts an img element as an image descriptor", () => {
    const html = `<html><body>
      <section>
        <img src="https://page.mint.surf/assets/hero.png" width="640" height="360" alt="Hero image" />
      </section>
    </body></html>`;

    const result = walkDom(html);
    expect(result).toHaveLength(1);
    const el = result[0] as ImageElementDesc;
    expect(el.type).toBe("image");
    expect(el.url).toBe("https://page.mint.surf/assets/hero.png");
    expect(el.widthPx).toBe(640);
    expect(el.heightPx).toBe(360);
    expect(el.altText).toBe("Hero image");
  });

  it("resolves relative img src against page.mint.surf", () => {
    const html = `<html><body>
      <section>
        <img src="/static/photo.jpg" width="400" height="300" />
      </section>
    </body></html>`;

    const result = walkDom(html);
    const el = result[0] as ImageElementDesc;
    expect(el.url).toBe("https://page.mint.surf/static/photo.jpg");
  });

  it("extracts a div with background-color as a shape element", () => {
    const html = `<html><body>
      <section>
        <div style="background-color: #3366ff; width: 800px; height: 120px;"></div>
      </section>
    </body></html>`;

    const result = walkDom(html);
    // At least one shape in the output
    const shapes = result.filter((el) => el.type === "shape") as ShapeElementDesc[];
    expect(shapes.length).toBeGreaterThan(0);
    expect(shapes[0].fillHex).toBe("#3366ff");
    expect(shapes[0].widthPx).toBe(800);
    expect(shapes[0].heightPx).toBe(120);
  });

  it("accumulates top positions across elements", () => {
    const html = `<html><body>
      <section>
        <h1 style="font-size: 32px;">Title</h1>
        <p style="font-size: 16px;">Paragraph</p>
      </section>
    </body></html>`;

    const result = walkDom(html);
    expect(result).toHaveLength(2);
    const [h1, p] = result as TextElementDesc[];
    expect(h1.top).toBe(0);
    // p.top should be after h1's height (32+4) plus 8px gap
    expect(p.top).toBe(32 + 4 + 8);
  });

  it("handles multiple sections with gap between them", () => {
    const html = `<html><body>
      <section>
        <h1 style="font-size: 20px;">Section 1</h1>
      </section>
      <section>
        <h2 style="font-size: 18px;">Section 2</h2>
      </section>
    </body></html>`;

    const result = walkDom(html);
    expect(result).toHaveLength(2);
    const [s1, s2] = result as TextElementDesc[];
    // s1.top = 0, height = 24
    // s2.top should be 24 + 16 (section gap) = 40
    expect(s1.top).toBe(0);
    expect(s2.top).toBe(24 + 16);
  });

  it("converts rgb() color to hex", () => {
    const html = `<html><body>
      <section>
        <p style="color: rgb(0, 128, 255);">Colorful</p>
      </section>
    </body></html>`;

    const result = walkDom(html);
    const el = result[0] as TextElementDesc;
    expect(el.colorHex).toBe("#0080ff");
  });

  it("maps text-align: right to 'end'", () => {
    const html = `<html><body>
      <section>
        <p style="text-align: right;">Right-aligned</p>
      </section>
    </body></html>`;

    const result = walkDom(html);
    const el = result[0] as TextElementDesc;
    expect(el.alignment).toBe("end");
  });

  it("skips elements with empty text content", () => {
    const html = `<html><body>
      <section>
        <p></p>
        <h1 style="font-size: 24px;">Real Title</h1>
      </section>
    </body></html>`;

    const result = walkDom(html);
    expect(result).toHaveLength(1);
    expect((result[0] as TextElementDesc).text).toBe("Real Title");
  });

  it("uses default image size when no dimensions specified", () => {
    const html = `<html><body>
      <section>
        <img src="https://example.com/img.png" />
      </section>
    </body></html>`;

    const result = walkDom(html);
    const el = result[0] as ImageElementDesc;
    expect(el.widthPx).toBe(512);
    expect(el.heightPx).toBe(512);
  });

  it("ignores gradient backgrounds (does not emit shape)", () => {
    const html = `<html><body>
      <section>
        <div style="background: linear-gradient(to right, #ff0000, #0000ff); width: 800px; height: 200px;"></div>
      </section>
    </body></html>`;

    const result = walkDom(html);
    const shapes = result.filter((el) => el.type === "shape");
    expect(shapes).toHaveLength(0);
  });
});
