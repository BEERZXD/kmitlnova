import { describe, expect, it } from 'vitest';
import { getLoginImageClassName, getRenderableLoginImageIndexes, isLoginSubmitKey, parseLoginImageList } from './LoginView';

describe('parseLoginImageList', () => {
  it('uses non-empty non-comment lines as login image sources with default framing', () => {
    expect(parseLoginImageList(`
# Login images
/campus.jpg

https://example.com/campus.jpg
  /another-local-image.webp
    `)).toEqual([
      { src: '/campus.jpg', objectPosition: '50% 50%' },
      { src: 'https://example.com/campus.jpg', objectPosition: '50% 50%' },
      { src: '/another-local-image.webp', objectPosition: '50% 50%' },
    ]);
  });

  it('supports pipe-delimited object-position values for per-image framing', () => {
    expect(parseLoginImageList(`
/campus.jpg | 50% 35%
https://example.com/campus.jpg | center top
    `)).toEqual([
      { src: '/campus.jpg', objectPosition: '50% 35%' },
      { src: 'https://example.com/campus.jpg', objectPosition: 'center top' },
    ]);
  });
});

describe('getLoginImageClassName', () => {
  it('only marks the visible image as active so the carousel just crossfades', () => {
    expect(getLoginImageClassName(0, 0)).toBe('login-visual-image active');
    expect(getLoginImageClassName(1, 0)).toBe('login-visual-image inactive');
  });

  it('keeps the previous image active if the new active image has not loaded yet', () => {
    const loadedIndexes = new Set([0]); // image 0 loaded, image 1 not loaded
    const lastLoaded = 0;
    
    // image 1 is the active target, but is not loaded
    // so image 0 (the last loaded) stays active
    expect(getLoginImageClassName(0, 1, lastLoaded, loadedIndexes)).toBe('login-visual-image active');
    expect(getLoginImageClassName(1, 1, lastLoaded, loadedIndexes)).toBe('login-visual-image inactive');
  });

  it('deactivates the previous image once the new active image has finished loading', () => {
    const loadedIndexes = new Set([0, 1]); // both loaded
    const lastLoaded = 1;
    
    // image 1 is active, and is loaded
    // so image 0 is inactive, and image 1 is active
    expect(getLoginImageClassName(0, 1, lastLoaded, loadedIndexes)).toBe('login-visual-image inactive');
    expect(getLoginImageClassName(1, 1, lastLoaded, loadedIndexes)).toBe('login-visual-image active');
  });
});

describe('getRenderableLoginImageIndexes', () => {
  it('renders only the active image until next-image preloading is allowed', () => {
    expect(getRenderableLoginImageIndexes(5, 0, new Set(), false)).toEqual([0]);
  });

  it('adds the next image after the active image has loaded or the browser is idle', () => {
    expect(getRenderableLoginImageIndexes(5, 0, new Set(), true)).toEqual([0, 1]);
  });

  it('keeps loaded images mounted while adding the next not-yet-loaded image', () => {
    expect(getRenderableLoginImageIndexes(5, 1, new Set([0, 1]), true)).toEqual([0, 1, 2]);
  });

  it('wraps the next image without duplicating already loaded images', () => {
    expect(getRenderableLoginImageIndexes(5, 4, new Set([0, 1, 4]))).toEqual([0, 1, 4]);
  });
});

describe('isLoginSubmitKey', () => {
  it('treats plain Enter as a login submit intent', () => {
    expect(isLoginSubmitKey({ key: 'Enter', shiftKey: false, isComposing: false })).toBe(true);
    expect(isLoginSubmitKey({ key: 'Enter', shiftKey: true, isComposing: false })).toBe(false);
    expect(isLoginSubmitKey({ key: 'a', shiftKey: false, isComposing: false })).toBe(false);
  });
});
