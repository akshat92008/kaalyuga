import test from 'node:test';
import assert from 'node:assert/strict';
import { getOrStartArenaVideo, prewarmArenaVideo, releaseArenaVideos } from './chamberGeometry';

test('eight chambers retain two media sources at most and release every source on exit', () => {
  const videos: Array<ReturnType<typeof createVideo>> = [];
  const events = new EventTarget();
  function createVideo() {
    return {
      src: '', paused: true,
      load() {},
      pause() { this.paused = true; },
      async play() { this.paused = false; },
      removeAttribute() { this.src = ''; },
    };
  }
  const saved = ['window', 'document'].map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, 'window', { configurable: true, value: events });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    createElement() { const video = createVideo(); videos.push(video); return video; },
  } });
  try {
    for (let chamber = 1; chamber <= 8; chamber++) {
      getOrStartArenaVideo(String(chamber));
      prewarmArenaVideo(String(chamber + 1));
      assert.equal(videos.filter(video => video.src).length, 2);
      assert.equal(videos.filter(video => !video.paused).length, 1);
    }
    releaseArenaVideos();
    events.dispatchEvent(new Event('pointerdown'));
    assert.ok(videos.every(video => !video.src && video.paused));
  } finally {
    releaseArenaVideos();
    ['window', 'document'].forEach((key, index) => {
      const previous = saved[index];
      if (previous) Object.defineProperty(globalThis, key, previous);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
});
