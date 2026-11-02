#!/usr/bin/env bash
set -euo pipefail

# Report the exact GitHub publishing error without exposing token values.
gh_checked() {
  local output status
  if output=$(gh "$@" 2>&1); then
    printf '%s\n' "$output"
  else
    status=$?
    printf '%s\n' "$output" >&2
    output=${output//'%'/'%25'}
    output=${output//$'\r'/'%0D'}
    output=${output//$'\n'/'%0A'}
    printf '::error title=Verified release publishing blocked::%s\n' "$output"
    exit "$status"
  fi
}

exe=$(find release -maxdepth 1 -name '*.exe' -printf '%f\n')
if [[ ! "$exe" =~ ^Chagok-([0-9]+\.[0-9]+\.[0-9]+)-Windows\.exe$ ]]; then
  echo '::error::Expected exactly one versioned Chagok executable.'
  exit 1
fi
version=${BASH_REMATCH[1]}
tag="v${version}"
cat > release-notes.md <<'NOTES'
Windows 10/11 64비트용 포터블 앱입니다. 기존 앱을 완전히 종료한 뒤 EXE를 실행하세요.

배포 검증:
- Microsoft Defender 사용자 지정 검사 완료 후 게시
- SHA256SUMS.txt: 다운로드 파일의 변조 여부 확인
- Defender-scan.json: 검사 엔진·서명 버전과 결과
- build-provenance.jsonl: GitHub 빌드 출처 증명

현재 EXE는 게시자 코드 서명이 없습니다. 위 검증은 SmartScreen 경고를 제거하거나 파일의 완전한 안전성을 보장하지 않습니다.
NOTES
if gh release view "$tag" >/dev/null 2>&1; then
  draft=$(gh_checked release view "$tag" --json isDraft --jq .isDraft)
  commit=$(gh_checked release view "$tag" --json targetCommitish --jq .targetCommitish)
  if [[ "$draft" != "true" || "$commit" != "$GITHUB_SHA" ]]; then
    echo '::error::An existing published release or draft of another commit will not be overwritten.'
    exit 1
  fi
else
  gh_checked release create "$tag" --draft --target "$GITHUB_SHA" --title "차곡 ${version} · Windows" --notes-file release-notes.md
fi
# The guard above permits resuming only an unpublished draft of this exact commit.
gh_checked release upload "$tag" release/*.exe release/SHA256SUMS.txt release/Defender-scan.json release/build-provenance.jsonl --clobber
gh_checked release edit "$tag" --draft=false --latest
