import assert from 'node:assert/strict';
import test from 'node:test';
import { sampleElementalStroke } from './elementalStrokeGeometry';

test('water advances along the aim and braids in three distinct strands', () => {
  const points = [0, 1, 2].map((lane) => sampleElementalStroke('water', 0.55, 200, lane));
  assert.ok(points[0].x > points[1].x && points[1].x > points[2].x);
  assert.equal(new Set(points.map((point) => point.y)).size, 3);
  assert.ok(sampleElementalStroke('water', 0.2, 200, 0).y > 0);
  assert.ok(sampleElementalStroke('water', 0.7, 200, 0).y < 0);
});

test('wind and guardian remain in front and taper toward both tips', () => {
  for (const element of ['wind', 'guardian'] as const) {
    for (const lane of [0, 1]) {
      const start = sampleElementalStroke(element, 0, 180, lane);
      const middle = sampleElementalStroke(element, 0.5, 180, lane);
      const end = sampleElementalStroke(element, 1, 180, lane);
      assert.ok(Math.min(start.x, middle.x, end.x) > 0);
      assert.ok(middle.width > start.width * 8 && middle.width > end.width * 8);
    }
  }
});
