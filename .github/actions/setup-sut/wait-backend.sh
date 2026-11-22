#!/bin/sh
# Chờ backend trả 200 ở /api/v3/api-docs (plan ci-bao-cao §5.3 bước 9).
# BACKEND_PORT (mặc định 9500), BACKEND_WAIT_S (mặc định 180). Quá hạn: in 80 dòng cuối backend-run.log, thoát 1.
port="${BACKEND_PORT:-9500}"
limit="${BACKEND_WAIT_S:-180}"
url="http://localhost:${port}/api/v3/api-docs"
start=$(date +%s)
while :; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$url" || true)
  elapsed=$(( $(date +%s) - start ))
  if [ "$code" = "200" ]; then
    echo "Backend sẵn sàng sau ${elapsed}s ($url)"
    exit 0
  fi
  if [ "$elapsed" -ge "$limit" ]; then
    echo "Backend không lên sau ${limit}s"
    if [ -f backend-run.log ]; then tail -80 backend-run.log; fi
    exit 1
  fi
  sleep 2
done
