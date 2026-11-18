-- Lát go-lut (plan/go-lut.md §4): gỡ toàn bộ phần cửa hàng LUT.
-- Không sửa / xoá V3 → V17 và seed V3_1 / V5_1 (Flyway kiểm checksum); DB mới chạy V3 → V17 rồi xoá ngay ở đây.
-- Sau V18 còn: module, resource, role, permission, user_app, refresh_token (+ flyway_schema_history).
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS rec_eval_test, rec_eval_run, rec_impression,
  user_event, user_preference, lut_similarity,
  collection_item, collection, download_log,
  subscription, payment_order, `plan`,
  lut_color_feature, lut_tag, lut_category_map, lut, lut_category, creator;
SET FOREIGN_KEY_CHECKS = 1;

-- permission của các resource này xoá theo ON DELETE CASCADE
DELETE FROM `resource` WHERE `code` IN ('LUT', 'RECOMMEND', 'DASHBOARD');
DELETE FROM `module` WHERE `code` IN ('CATALOG', 'RECOMMENDER', 'SALES')
  AND NOT EXISTS (SELECT 1 FROM `resource` r WHERE r.module_id = `module`.id);
