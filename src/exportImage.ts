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
  const wrapper = document.createElement('div');
  const clone = source.cloneNode(true) as HTMLElement;
  const canvasWidth = Math.ceil(source.scrollWidth + EXTRA_HORIZONTAL_CAPTURE_PADDING * 2);
  const reportWidth = Math.ceil(source.scrollWidth);

  Object.assign(wrapper.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    zIndex: '-9999',
    width: `${canvasWidth}px`,
    margin: '0',
    padding: '0',
    background: '#ffffff',
    overflow: 'hidden',
    pointerEvents: 'none',
    boxSizing: 'border-box',
    opacity: '0.01', // Forces Safari to paint the element inside the viewport without stretching document scroll area
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
  document.body.appendChild(wrapper);

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
    cleanup: () => wrapper.remove(),
  };
}


