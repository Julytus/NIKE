// TẠM cho TC-15 của plan ci-bao-cao: test đỏ có chủ đích, sẽ bị git revert ngay sau khi kiểm CI.
import { expect, test } from '../../fixtures/index.js';

test('TC-01 zz-tmp đỏ có chủ đích', { tag: '@smoke' }, async () => {
  expect(1).toBe(2);
});
