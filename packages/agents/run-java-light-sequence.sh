#!/usr/bin/env bash
set -euo pipefail

# Oracle-only Java Light Test Sequence
# - Clones repositories with depth=10 and prepares two branches (main + pr)
# - Runs light tests sequentially by redirecting /tmp/kafka-repo symlink
# - Captures logs per repository

prepare_repo() {
  local url="$1"; local dir="$2"; local pr="${3:-}"
  rm -rf "$dir" && git clone --depth=10 --no-single-branch "$url" "$dir"
  pushd "$dir" >/dev/null
  git fetch origin main --depth=10 || git fetch origin master --depth=10
  git checkout -B main origin/main 2>/dev/null || git checkout -B main origin/master
  if [ -n "$pr" ]; then
    git fetch origin "pull/$pr/head:pr" --depth=10 && git checkout pr || {
      echo "PR #$pr not found; creating local 'pr' from main";
      git checkout -B pr main;
    }
  else
    git checkout -B pr main
  fi
  popd >/dev/null
}

run_light() {
  local repo_dir="$1"; local log_file="$2"
  ln -sfn "$repo_dir" /tmp/kafka-repo
  (cd "$(dirname "$0")" && npx ts-node src/two-branch/tests/__tests__/test-java-all-modes.ts) | tee "$log_file"
}

# Example matrix (edit as needed)
prepare_repo https://github.com/apache/kafka.git /tmp/kafka-repo-src 17620
prepare_repo https://github.com/spring-projects/spring-petclinic.git /tmp/petclinic-repo
prepare_repo https://github.com/quarkusio/quarkus-quickstarts.git /tmp/quarkus-qs-repo
prepare_repo https://github.com/micronaut-projects/micronaut-examples.git /tmp/micronaut-examples-repo
# Large repo (optional)
# prepare_repo https://github.com/elastic/elasticsearch.git /tmp/elasticsearch-repo

# Run sequentially (review after each)
run_light /tmp/kafka-repo-src /tmp/light-kafka.log
run_light /tmp/petclinic-repo /tmp/light-petclinic.log
run_light /tmp/quarkus-qs-repo /tmp/light-quarkus.log
run_light /tmp/micronaut-examples-repo /tmp/light-micronaut.log
# run_light /tmp/elasticsearch-repo /tmp/light-elasticsearch.log
