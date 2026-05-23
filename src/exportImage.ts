const EXTRA_HORIZONTAL_CAPTURE_PADDING = 32;
export const EXPORT_DESKTOP_CLASS = 'export-desktop';



export function buildExportImageOptions(node: HTMLElement) {
  return {
    quality: 0.96,
    backgroundColor: '#ffffff',
    pixelRatio: 2,
    width: Math.ceil(node.scrollWidth),
    height: Math.ceil(node.scrollHeight),
    style: {
      boxSizing: 'border-box',
      width: `${Math.ceil(node.scrollWidth)}px`,
      maxWidth: 'none',
      overflow: 'visible',
      opacity: '1', // Ensure the exported JPEG is solid and fully visible
    },
  };
}

export function createCenteredExportNode(source: HTMLElement) {
  const document = source.ownerDocument;
  const container = document.createElement('div');
  const wrapper = document.createElement('div');
  const clone = source.cloneNode(true) as HTMLElement;
  const canvasWidth = Math.ceil(source.scrollWidth + EXTRA_HORIZONTAL_CAPTURE_PADDING * 2);
  const reportWidth = Math.ceil(source.scrollWidth);

  // Bounding box container to prevent scroll stretching
  Object.assign(container.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    zIndex: '-9999',
    pointerEvents: 'none',
  });

  // True size wrapper to allow absolute desktop layouts
  Object.assign(wrapper.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: `${canvasWidth}px`,
    margin: '0',
    padding: '0',
    background: '#ffffff',
    overflow: 'hidden',
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

  wrapper.appendChild(clone);
  container.appendChild(wrapper);
  document.body.appendChild(container);

  // Force-reset overflow on all scrollable descendants after DOM insertion
  // so getComputedStyle returns real values
  clone.querySelectorAll('*').forEach((el) => {
    const htmlEl = el as HTMLElement;
    const style = window.getComputedStyle(htmlEl);
    if (style.overflowX === 'auto' || style.overflowX === 'scroll' ||
        style.overflowY === 'auto' || style.overflowY === 'scroll') {
      htmlEl.style.overflow = 'visible';
      htmlEl.style.setProperty('-webkit-overflow-scrolling', 'auto');
    }
  });

  return {
    node: wrapper,
    cleanup: () => container.remove(),
  };
}


