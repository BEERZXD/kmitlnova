const EXTRA_HORIZONTAL_CAPTURE_PADDING = 32;
export const EXPORT_DESKTOP_CLASS = 'export-desktop';

async function waitForNextFrame() {
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

export function buildExportImageOptions(node: HTMLElement) {
  return {
    quality: 0.96,
    backgroundColor: '#f8f9fb',
    pixelRatio: 2,
    width: Math.ceil(node.scrollWidth),
    height: Math.ceil(node.scrollHeight),
    style: {
      boxSizing: 'border-box',
      width: `${Math.ceil(node.scrollWidth)}px`,
      maxWidth: 'none',
      overflow: 'visible',
    },
  };
}

export function createCenteredExportNode(source: HTMLElement) {
  const document = source.ownerDocument;
  const wrapper = document.createElement('div');
  const clone = source.cloneNode(true) as HTMLElement;
  const canvasWidth = Math.ceil(source.scrollWidth + EXTRA_HORIZONTAL_CAPTURE_PADDING * 2);
  const reportWidth = Math.ceil(source.scrollWidth);

  Object.assign(wrapper.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    zIndex: '-1',
    width: `${canvasWidth}px`,
    margin: '0',
    padding: '0',
    background: '#f8f9fb',
    overflow: 'hidden',
    pointerEvents: 'none',
    boxSizing: 'border-box',
  });

  clone.classList.add(EXPORT_DESKTOP_CLASS);
  Object.assign(clone.style, {
    width: `${reportWidth}px`,
    maxWidth: 'none',
    margin: '0 auto',
    overflow: 'visible',
    transform: 'none',
  });

  // Force-reset overflow on all descendants to prevent Safari iOS scrollbar bleed
  clone.querySelectorAll('*').forEach((el) => {
    const style = window.getComputedStyle(el);
    if (style.overflowX === 'auto' || style.overflowX === 'scroll' ||
        style.overflowY === 'auto' || style.overflowY === 'scroll') {
      (el as HTMLElement).style.overflow = 'visible';
      (el as HTMLElement).style.setProperty('-webkit-overflow-scrolling', 'auto');
    }
  });

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  return {
    node: wrapper,
    cleanup: () => wrapper.remove(),
  };
}

export async function withDesktopExportLayout<T>(
  node: HTMLElement,
  capture: () => Promise<T>,
  waitForStyles: () => Promise<void> = waitForNextFrame,
) {
  node.classList.add(EXPORT_DESKTOP_CLASS);
  try {
    await waitForStyles();
    return await capture();
  } finally {
    node.classList.remove(EXPORT_DESKTOP_CLASS);
  }
}
