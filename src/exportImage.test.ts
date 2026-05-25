import { describe, expect, it } from 'vitest';
import { EXPORT_DESKTOP_CLASS, buildExportImageOptions, createCenteredExportNode } from './exportImage';

describe('buildExportImageOptions', () => {
  it('captures the provided export canvas without moving or repadding it', () => {
    const node = {
      scrollWidth: 1464,
      scrollHeight: 900,
      ownerDocument: {
        defaultView: {
          getComputedStyle: () => ({
            paddingTop: '40px',
            paddingRight: '24px',
            paddingBottom: '40px',
            paddingLeft: '24px',
          }),
        },
      },
    } as unknown as HTMLElement;

    const options = buildExportImageOptions(node);

    expect(options.width).toBe(1464);
    expect(options.height).toBe(900);
    expect(options.style).toMatchObject({
      boxSizing: 'border-box',
      maxWidth: 'none',
      overflow: 'visible',
      width: '1464px',
    });
    expect(options.style).not.toHaveProperty('paddingLeft');
    expect(options.style).not.toHaveProperty('paddingRight');
    expect(options.style).not.toHaveProperty('transform');
  });

  it('creates a wider temporary canvas with the unchanged desktop report centered inside', () => {
    const body = createFakeElement();
    const document = {
      body,
      createElement: () => createFakeElement(),
    };
    const source = createFakeElement(document);
    source.scrollWidth = 1400;
    source.scrollHeight = 900;

    const capture = createCenteredExportNode(source as unknown as HTMLElement);
    const wrapper = capture.node as unknown as FakeElement;
    const container = body.children[0];
    const clone = wrapper.children[0];

    expect(body.children).toContain(container);
    expect(container.children).toContain(wrapper);
    expect(container.style.position).toBe('absolute');
    expect(container.style.width).toBe('1px');
    expect(container.style.height).toBe('1px');
    expect(container.style.zIndex).toBe('-9999');
    expect(wrapper.style.position).toBe('absolute');
    expect(wrapper.style.left).toBe('0');
    expect(wrapper.style.width).toBe('1464px');
    expect(wrapper.style.background).toBe('#ffffff');
    expect(clone.style.width).toBe('1400px');
    expect(clone.style.margin).toBe('0 auto');
    expect(clone.style.paddingLeft).toBeUndefined();
    expect(clone.classList.contains(EXPORT_DESKTOP_CLASS)).toBe(true);

    capture.cleanup();
    expect(container.removed).toBe(true);
  });
});

type FakeElement = {
  scrollWidth: number;
  scrollHeight: number;
  ownerDocument: unknown;
  style: Record<string, string>;
  children: FakeElement[];
  removed: boolean;
  classList: {
    add: (name: string) => void;
    remove: (name: string) => void;
    contains: (name: string) => boolean;
  };
  appendChild: (child: FakeElement) => FakeElement;
  cloneNode: () => FakeElement;
  querySelectorAll: () => FakeElement[];
  remove: () => void;
};

function createFakeElement(ownerDocument?: unknown): FakeElement {
  const classes = new Set<string>();
  const element: FakeElement = {
    scrollWidth: 0,
    scrollHeight: 0,
    ownerDocument: ownerDocument ?? {
      body: undefined,
      createElement: () => createFakeElement(),
    },
    style: {},
    children: [],
    removed: false,
    classList: {
      add: (name: string) => classes.add(name),
      remove: (name: string) => classes.delete(name),
      contains: (name: string) => classes.has(name),
    },
    appendChild: (child: FakeElement) => {
      element.children.push(child);
      return child;
    },
    cloneNode: () => {
      const clone = createFakeElement(ownerDocument);
      clone.scrollWidth = element.scrollWidth;
      clone.scrollHeight = element.scrollHeight;
      return clone;
    },
    querySelectorAll: () => [],
    remove: () => {
      element.removed = true;
    },
  };

  return element;
}
