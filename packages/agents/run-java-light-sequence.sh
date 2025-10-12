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
  
  # Use the same dynamic branch detection logic as the Java tools
  # This matches the detectDefaultBranch function in git-utils.ts
  local default_branch="main"
  
  # Try git symbolic-ref first (most reliable)
  if git symbolic-ref refs/remotes/origin/HEAD >/dev/null 2>&1; then
    default_branch=$(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')
  else
    # Fallback: check which common branch exists
    for branch in trunk main master; do
      if git rev-parse --verify "$branch" >/dev/null 2>&1; then
        default_branch="$branch"
        break
      fi
    done
  fi
  
  echo "🔍 Detected default branch: $default_branch"
  git checkout -B main "origin/$default_branch"
  
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
