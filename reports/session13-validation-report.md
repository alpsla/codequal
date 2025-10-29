# 🔍 Code Quality Analysis Report

## Repository Information

**Repository:** [micronaut-projects/micronaut-core](https://github.com/micronaut-projects/micronaut-core)  
**Pull Request:** #200 - PR #200  
**Author:** test-user (test@example.com)  
**Organization:** micronaut-projects  
**Source Branch:** pr-200  
**Target Branch:** main  
**Analysis Date:** October 28, 2025 at 06:37 PM GMT  
**Repository Size:** 100 files | 10,000 lines  
**Analyzer Version:** 9.0.0

## PR Impact

**Files Modified:** 100  
**Lines Added:** +500  
**Lines Deleted:** -200  
**Net Change:** +300 lines  

## Analysis Performance

**Total Duration:** 2m 21s  

## Quality Decision

**Result:** ⛔ **DECLINED** (13389 blocking issues)

---

## 📊 Executive Summary

### Quality Score

❌ **0.0/100** (Grade: **F**) - Critical

> Significant quality issues require immediate action

**Score Breakdown**:

**Category Scores** (Repository Health):
- 🔒 Security: 16/100
- ⚡ Performance: 100/100
- 🏗️  Architecture: 100/100
- 📦 Dependencies: 100/100
- ✨ Code Quality: 0/100

**Overall Scores**:
- 📱 **APP Score**: 0/100 (MIN of categories - "weakest link")
- 👨‍💻 **Skill Score**: 63/100 (AVG of categories)

> Scores saved to Supabase for tracking trends over time


> 🚀 **Quick Win**: 26,720 issues (100%) can be automatically fixed using the attached manifest file!



---

### Issue Summary

**Total Issues**: 26,803 (68 unique types)

**By Severity**:
- 🔴 Critical: 6 (0.0%)
- 🟠 High: 15537 (58.0%)
- 🟡 Medium: 60 (0.2%)
- 🟢 Low: 11200 (41.8%)

**By Category & Severity**:

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| 🆕 NEW | 6 | 13383 | 52 | 10111 | **23552** |
| ⚠️ EXISTING_MODIFIED | 0 | 0 | 0 | 0 | **0** |
| ✅ RESOLVED | 0 | 0 | 0 | 0 | **0** |
| 📝 EXISTING_REST | 0 | 2154 | 8 | 1089 | **3251** |
| **TOTAL** | **6** | **15537** | **60** | **11200** | **26803** |

---

### Decision & Actions

**Blocking Decision**:
- 13389 blocking issues (NEW or EXISTING_MODIFIED with critical/high severity)
- ⛔ **PR REQUIRES FIXES BEFORE MERGE**



**Analysis Results**:
- AI-analyzed groups: 68
- Cost-optimized analysis: 99.7% reduction
- Coverage: 100% of detected issues
- Duration: 2m 21s

---

### 🔑 Key Findings

- 🔴 **Action Required**: 13389 critical/high severity issues must be fixed before merge
- 📊 **Most Common**: Com Puppycrawl Tools Checkstyle Checks Sizes LineLengthCheck appears 10035 times
- 🔒 **Security Alert**: 6 critical security vulnerabilities found
- 🔧 **Auto-Fix Available**: 348 issues can be fixed automatically (see IDE integration files)

---

### ⚡ Critical Blockers

⛔ **13389 issues must be fixed before merge**

**Fix Order (highest priority first):**

1. 🔴 **Insecure WebSocket Connection** (javascript.lang.security.detect-insecure-websocket.detect-insecure-websocket)
   - Severity: CRITICAL
   - Category: Security
   - Occurrences: 2 issues across 1 files
   - Priority Score: 130

**What's Wrong:**
WebSocket connection uses ws:// instead of wss:// (encrypted).

**Example (semgrep-results-base.json:1):**
```json
>    1 | {"errors": [{"code": 3, "level": "warn", "message": "Syntax error at line /workspace/.github/workflows/release.yml:67:\n When parsing a snippet as Bash for metavariable-pattern in rule 'yaml.github-actions.security.curl-eval.curl-eval', `${{` was unexpected", "path": "/workspace/.github/workflows/release.yml", "spans": [{"end": {"col": 32, "line": 67, "offset": 2726}, "file": "/workspace/.github/workflows/release.yml", "start": {"col": 29, "line": 67, "offset": 2723}}, {"end": {"col": 69, "line": 67, "offset": 2726}, "file": "/workspace/.github/workflows/release.yml", "start": {"col": 66, "line": 67, "offset": 2723}}], "type": "Syntax error"}, {"code": 2, "level": "warn", "message": "Timeout when running java.lang.security.audit.xss.no-direct-response-writer.no-direct-response-writer on /workspace/core-processor/src/main/java/io/micronaut/inject/writer/BeanDefinitionWriter.java:\n ", "path": "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/BeanDefinitionWriter.java", "rule_id": "java.lang.security.audit.xss.no-direct-response-writer.no-direct-response-writer", "type": "Timeout"}, {"code": 3, "level": "warn", "message": "Syntax error at line /workspace/gradlew:74:\n `APP_HOME=${app_path%\"${app_path##*/}\"}  # leaves a trailing /; empty if no leading path\n` was unexpected", "path": "/workspace/gradlew", "spans": [{"end": {"col": 1, "line": 75, "offset": 88}, "file": "/workspace/gradlew", "start": {"col": 5, "line": 74, "offset": 0}}, {"end": {"col": 15, "line": 178, "offset": 10}, "file": "/workspace/gradlew", "start": {"col": 5, "line": 178, "offset": 0}}], "type": "Syntax error"}], "paths": {"scanned": ["/workspace/.clineignore", "/workspace/.clinerules/coding.md", "/workspace/.clinerules/docs.md", "/workspace/.editorconfig", "/workspace/.gitattributes", "/workspace/.github/ISSUE_TEMPLATE/bug_report.yaml", "/workspace/.github/ISSUE_TEMPLATE/config.yml", "/workspace/.github/ISSUE_TEMPLATE/new_feature.yaml", "/workspace/.github/ISSUE_TEMPLATE/other.yaml", "/workspace/.github/instructions/coding.instructions.md", "/workspace/.github/instructions/docs.instructions.md", "/workspace/.github/release.yml", "/workspace/.github/renovate.json", "/workspace/.github/workflows/.rsync-filter", "/workspace/.github/workflows/central-sync.yml", "/workspace/.github/workflows/corretto.yml", "/workspace/.github/workflows/graalvm-dev.yml", "/workspace/.github/workflows/graalvm-latest.yml", "/workspace/.github/workflows/gradle.yml", "/workspace/.github/workflows/publish-snapshot.yml", "/workspace/.github/workflows/release.yml", "/workspace/.gitignore", "/workspace/CONTRIBUTING.md", "/workspace/GRAAL.md", "/workspace/ISSUE_TEMPLATE.md", "/workspace/LICENSE", "/workspace/MAINTAINING.md", "/workspace/README.md", "/workspace/RELEASE.adoc", "/workspace/ROADMAP.adoc", "/workspace/SECURITY.md", "/workspace/aop/README.md", "/workspace/aop/build.gradle.kts", "/workspace/aop/src/main/java/io/micronaut/aop/Adapter.java", "/workspace/aop/src/main/java/io/micronaut/aop/Around.java", "/workspace/aop/src/main/java/io/micronaut/aop/AroundConstruct.java", "/workspace/aop/src/main/java/io/micronaut/aop/ConstructorInterceptor.java", "/workspace/aop/src/main/java/io/micronaut/aop/ConstructorInvocationContext.java", "/workspace/aop/src/main/java/io/micronaut/aop/HotSwappableInterceptedProxy.java", "/workspace/aop/src/main/java/io/micronaut/aop/InterceptPhase.java", "/workspace/aop/src/main/java/io/micronaut/aop/Intercepted.java", "/workspace/aop/src/main/java/io/micronaut/aop/InterceptedMethod.java", "/workspace/aop/src/main/java/io/micronaut/aop/InterceptedProxy.java", "/workspace/aop/src/main/java/io/micronaut/aop/Interceptor.java", "/workspace/aop/src/main/java/io/micronaut/aop/InterceptorBean.java", "/workspace/aop/src/main/java/io/micronaut/aop/InterceptorBinding.java", "/workspace/aop/src/main/java/io/micronaut/aop/InterceptorBindingDefinitions.java", "/workspace/aop/src/main/java/io/micronaut/aop/InterceptorKind.java", "/workspace/aop/src/main/java/io/micronaut/aop/InterceptorRegistry.java", "/workspace/aop/src/main/java/io/micronaut/aop/Introduced.java", "/workspace/aop/src/main/java/io/micronaut/aop/Introduction.java", "/workspace/aop/src/main/java/io/micronaut/aop/InvocationContext.java", "/workspace/aop/src/main/java/io/micronaut/aop/MethodInterceptor.java", "/workspace/aop/src/main/java/io/micronaut/aop/MethodInvocationContext.java", "/workspace/aop/src/main/java/io/micronaut/aop/chain/AbstractInterceptorChain.java", "/workspace/aop/src/main/java/io/micronaut/aop/chain/AdapterIntroduction.java", "/workspace/aop/src/main/java/io/micronaut/aop/chain/ConstructorInterceptorChain.java", "/workspace/aop/src/main/java/io/micronaut/aop/chain/DefaultInterceptorRegistry.java", "/workspace/aop/src/main/java/io/micronaut/aop/chain/InterceptorChain.java", "/workspace/aop/src/main/java/io/micronaut/aop/chain/MethodInterceptorChain.java", "/workspace/aop/src/main/java/io/micronaut/aop/chain/package-info.java", "/workspace/aop/src/main/java/io/micronaut/aop/exceptions/UnimplementedAdviceException.java", "/workspace/aop/src/main/java/io/micronaut/aop/exceptions/package-info.java", "/workspace/aop/src/main/java/io/micronaut/aop/internal/InterceptorRegistryBean.java", "/workspace/aop/src/main/java/io/micronaut/aop/internal/intercepted/CompletionStageInterceptedMethod.java", "/workspace/aop/src/main/java/io/micronaut/aop/internal/intercepted/InterceptedMethodUtil.java", "/workspace/aop/src/main/java/io/micronaut/aop/internal/intercepted/KotlinInterceptedMethodImpl.java", "/workspace/aop/src/main/java/io/micronaut/aop/internal/intercepted/PublisherInterceptedMethod.java", "/workspace/aop/src/main/java/io/micronaut/aop/internal/intercepted/ReactorInterceptedMethod.java", "/workspace/aop/src/main/java/io/micronaut/aop/internal/intercepted/SynchronousInterceptedMethod.java", "/workspace/aop/src/main/java/io/micronaut/aop/kotlin/KotlinInterceptedMethod.java", "/workspace/aop/src/main/java/io/micronaut/aop/package-info.java", "/workspace/aop/src/main/kotlin/io/micronaut/aop/util/CompletableFutureContinuation.kt", "/workspace/aop/src/main/kotlin/io/micronaut/aop/util/DelegatingContextContinuation.kt", "/workspace/aop/src/main/kotlin/io/micronaut/aop/util/KotlinInterceptedMethodHelper.kt", "/workspace/aop/src/main/kotlin/io/micronaut/aop/util/MicronautPropagatedContext.kt", "/workspace/aop/src/main/resources/META-INF/micronaut/io.micronaut.inject.BeanDefinitionReference/io.micronaut.aop.internal.InterceptorRegistryBean", "/workspace/aop/src/main/resources/META-INF/native-image/io/micronaut/micronaut-aop/native-image.properties", "/workspace/benchmarks/build.gradle.kts", "/workspace/benchmarks/src/jmh/java/io/micronaut/aop/around/AroundCompileBenchmark.java", "/workspace/benchmarks/src/jmh/java/io/micronaut/context/env/PropertySourcePropertyResolverBenchmark.java", "/workspace/benchmarks/src/jmh/java/io/micronaut/context/scope/ThreadLocalScopeBenchmark.java", "/workspace/benchmarks/src/jmh/java/io/micronaut/core/CopyOnWriteMapBenchmark.java", "/workspace/benchmarks/src/jmh/java/io/micronaut/core/annotation/AnnotationValueBenchmark.java", "/workspace/benchmarks/src/jmh/java/io/micronaut/core/annotation/beans/TestIntroduction.java", "/workspace/benchmarks/src/jmh/java/io/micronaut/core/annotation/beans/introduction/Stub.java", "/workspace/benchmarks/src/jmh/java/io/micronaut/core/beans/PropertyIndexBenchmark.java", "/workspace/benchmarks/src/jmh/java/io/micronaut/core/convert/ConversionServiceBenchmark.java", "/workspace/benchmarks/src/jmh/java/io/micronaut/http/body/MessageBodyWriterDesignBenchmark.java", "/workspace/benchmarks/src/jmh/java/io/micronaut/http/server/StartupBenchmark.java", "/workspace/benchmarks/src/jmh/java/io/micronaut/http/server/binding/RequestArgumentSatisfierBenchmark.java", "/workspace/benchmarks/src/jmh/java/io/micronaut/http/server/binding/TestController.java", "/workspace/benchmarks/src/jmh/java/io/micronaut/http/server/stack/ControllersBenchmark.java", "/workspace/benchmarks/src/jmh/java/io/micronaut/http/server/stack/FullHttpStackBenchmark.java", "/workspace/benchmarks/src/jmh/java/io/micronaut/http/server/stack/JmhFastThreadLocalExecutor.java", "/workspace/benchmarks/src/jmh/java/io/micronaut/http/server/stack/NettyUtil.java", "/workspace/benchmarks/src/jmh/java/io/micronaut/http/server/stack/RawClientBenchmark.java", "/workspace/benchmarks/src/jmh/java/io/micronaut/http/server/stack/RequestHandler.java", "/workspace/benchmarks/src/jmh/java/io/micronaut/http/server/stack/SearchController.java", "/workspace/benchmarks/src/jmh/java/io/micronaut/supplier/SupplierBenchmark.java", "/workspace/benchmarks/src/jmh/resources/logback.xml", "/workspace/benchmarks/src/typeCheckTest/java/example/TypeThrashingTest.java", "/workspace/buffer-netty/README.md", "/workspace/buffer-netty/build.gradle.kts", "/workspace/buffer-netty/src/main/java/io/micronaut/buffer/netty/ByteBufAllocatorConfiguration.java", "/workspace/buffer-netty/src/main/java/io/micronaut/buffer/netty/DefaultByteBufAllocatorConfiguration.java", "/workspace/buffer-netty/src/main/java/io/micronaut/buffer/netty/NettyByteBuffer.java", "/workspace/buffer-netty/src/main/java/io/micronaut/buffer/netty/NettyByteBufferConverters.java", "/workspace/buffer-netty/src/main/java/io/micronaut/buffer/netty/NettyByteBufferFactory.java", "/workspace/buffer-netty/src/main/java/io/micronaut/buffer/netty/NettyReadBuffer.java", "/workspace/buffer-netty/src/main/java/io/micronaut/buffer/netty/NettyReadBufferFactory.java", "/workspace/buffer-netty/src/main/java/io/micronaut/buffer/netty/package-info.java", "/workspace/buffer-netty/src/main/resources/META-INF/services/io.micronaut.core.convert.TypeConverterRegistrar", "/workspace/build.gradle", "/workspace/buildSrc/build.gradle", "/workspace/buildSrc/settings.gradle", "/workspace/buildSrc/src/main/groovy/io.micronaut.build.internal.convention-base.gradle", "/workspace/buildSrc/src/main/groovy/io.micronaut.build.internal.convention-geb-base.gradle", "/workspace/buildSrc/src/main/groovy/io.micronaut.build.internal.convention-library.gradle", "/workspace/buildSrc/src/main/groovy/io.micronaut.build.internal.convention-quality.gradle", "/workspace/buildSrc/src/main/groovy/io.micronaut.build.internal.convention-test-library.gradle", "/workspace/buildSrc/src/main/groovy/io.micronaut.build.internal.functional-test.gradle", "/workspace/checkstyle-results-base.xml", "/workspace/config/HEADER", "/workspace/config/accepted-api-changes.json", "/workspace/config/checkstyle/.rsync-filter", "/workspace/config/checkstyle/HEADER", "/workspace/config/checkstyle/checkstyle.xml", "/workspace/config/checkstyle/custom-suppressions.xml", "/workspace/config/checkstyle/suppressions.xml", "/workspace/config/spotless.license.java", "/workspace/context/README.md", "/workspace/context/build.gradle.kts", "/workspace/context/src/main/java/io/micronaut/context/time/InstantSourceFactory.java", "/workspace/context/src/main/java/io/micronaut/logging/LogLevel.java", "/workspace/context/src/main/java/io/micronaut/logging/LoggingConverterRegistrar.java", "/workspace/context/src/main/java/io/micronaut/logging/LoggingSystem.java", "/workspace/context/src/main/java/io/micronaut/logging/LoggingSystemException.java", "/workspace/context/src/main/java/io/micronaut/logging/PropertiesLoggingLevelsConfigurer.java", "/workspace/context/src/main/java/io/micronaut/logging/impl/Log4jLoggingSystem.java", "/workspace/context/src/main/java/io/micronaut/logging/impl/LogbackLoggingSystem.java", "/workspace/context/src/main/java/io/micronaut/logging/impl/LogbackUtils.java", "/workspace/context/src/main/java/io/micronaut/runtime/ApplicationConfiguration.java", "/workspace/context/src/main/java/io/micronaut/runtime/EmbeddedApplication.java", "/workspace/context/src/main/java/io/micronaut/runtime/Micronaut.java", "/workspace/context/src/main/java/io/micronaut/runtime/beans/MapperIntroduction.java", "/workspace/context/src/main/java/io/micronaut/runtime/beans/MapperMethodProcessor.java", "/workspace/context/src/main/java/io/micronaut/runtime/context/CompositeMessageSource.java", "/workspace/context/src/main/java/io/micronaut/runtime/context/env/ConfigurationAdvice.java", "/workspace/context/src/main/java/io/micronaut/runtime/context/env/ConfigurationIntroductionAdvice.java", "/workspace/context/src/main/java/io/micronaut/runtime/context/env/package-info.java", "/workspace/context/src/main/java/io/micronaut/runtime/context/scope/Refreshable.java", "/workspace/context/src/main/java/io/micronaut/runtime/context/scope/ScopedProxy.java", "/workspace/context/src/main/java/io/micronaut/runtime/context/scope/ThreadLocal.java", "/workspace/context/src/main/java/io/micronaut/runtime/context/scope/ThreadLocalCustomScope.java", "/workspace/context/src/main/java/io/micronaut/runtime/context/scope/package-info.java", "/workspace/context/src/main/java/io/micronaut/runtime/context/scope/refresh/RefreshEvent.java", "/workspace/context/src/main/java/io/micronaut/runtime/context/scope/refresh/RefreshEventListener.java", "/workspace/context/src/main/java/io/micronaut/runtime/context/scope/refresh/RefreshInterceptor.java", "/workspace/context/src/main/java/io/micronaut/runtime/context/scope/refresh/RefreshScope.java", "/workspace/context/src/main/java/io/micronaut/runtime/context/scope/refresh/RefreshScopeCondition.java", "/workspace/context/src/main/java/io/micronaut/runtime/context/scope/refresh/package-info.java", "/workspace/context/src/main/java/io/micronaut/runtime/converters/time/TimeConverterRegistrar.java", "/workspace/context/src/main/java/io/micronaut/runtime/converters/time/package-info.java", "/workspace/context/src/main/java/io/micronaut/runtime/event/AbstractEmbeddedApplicationEvent.java", "/workspace/context/src/main/java/io/micronaut/runtime/event/ApplicationShutdownEvent.java", "/workspace/context/src/main/java/io/micronaut/runtime/event/ApplicationStartupEvent.java", "/workspace/context/src/main/java/io/micronaut/runtime/event/annotation/EventListener.java", "/workspace/context/src/main/java/io/micronaut/runtime/event/annotation/package-info.java", "/workspace/context/src/main/java/io/micronaut/runtime/event/package-info.java", "/workspace/context/src/main/java/io/micronaut/runtime/exceptions/ApplicationStartupException.java", "/workspace/context/src/main/java/io/micronaut/runtime/exceptions/package-info.java", "/workspace/context/src/main/java/io/micronaut/runtime/graceful/GracefulShutdownCapable.java", "/workspace/context/src/main/java/io/micronaut/runtime/graceful/GracefulShutdownConfiguration.java", "/workspace/context/src/main/java/io/micronaut/runtime/graceful/GracefulShutdownListener.java", "/workspace/context/src/main/java/io/micronaut/runtime/graceful/GracefulShutdownManager.java", "/workspace/context/src/main/java/io/micronaut/runtime/package-info.java", "/workspace/context/src/main/java/io/micronaut/runtime/server/EmbeddedServer.java", "/workspace/context/src/main/java/io/micronaut/runtime/server/event/ServerShutdownEvent.java", "/workspace/context/src/main/java/io/micronaut/runtime/server/event/ServerStartupEvent.java", "/workspace/context/src/main/java/io/micronaut/runtime/server/event/package-info.java", "/workspace/context/src/main/java/io/micronaut/runtime/server/package-info.java", "/workspace/context/src/main/java/io/micronaut/runtime/server/watch/event/FileWatchRestartListener.java", "/workspace/context/src/main/java/io/micronaut/scheduling/DefaultTaskExceptionHandler.java", "/workspace/context/src/main/java/io/micronaut/scheduling/LoomSupport.java", "/workspace/context/src/main/java/io/micronaut/scheduling/NextFireTime.java", "/workspace/context/src/main/java/io/micronaut/scheduling/ReschedulingTask.java", "/workspace/context/src/main/java/io/micronaut/scheduling/ScheduledExecutorTaskScheduler.java", "/workspace/context/src/main/java/io/micronaut/scheduling/TaskExceptionHandler.java", "/workspace/context/src/main/java/io/micronaut/scheduling/TaskExecutors.java", "/workspace/context/src/main/java/io/micronaut/scheduling/TaskScheduler.java", "/workspace/context/src/main/java/io/micronaut/scheduling/annotation/Async.java", "/workspace/context/src/main/java/io/micronaut/scheduling/annotation/ExecuteOn.java", "/workspace/context/src/main/java/io/micronaut/scheduling/annotation/Scheduled.java", "/workspace/context/src/main/java/io/micronaut/scheduling/annotation/Schedules.java", "/workspace/context/src/main/java/io/micronaut/scheduling/annotation/package-info.java", "/workspace/context/src/main/java/io/micronaut/scheduling/async/AsyncInterceptor.java", "/workspace/context/src/main/java/io/micronaut/scheduling/async/package-info.java", "/workspace/context/src/main/java/io/micronaut/scheduling/cron/CronExpression.java", "/workspace/context/src/main/java/io/micronaut/scheduling/cron/package-info.java", "/workspace/context/src/main/java/io/micronaut/scheduling/exceptions/SchedulerConfigurationException.java", "/workspace/context/src/main/java/io/micronaut/scheduling/exceptions/TaskExecutionException.java", "/workspace/context/src/main/java/io/micronaut/scheduling/exceptions/package-info.java", "/workspace/context/src/main/java/io/micronaut/scheduling/executor/DefaultExecutorSelector.java", "/workspace/context/src/main/java/io/micronaut/scheduling/executor/DefaultThreadFactory.java", "/workspace/context/src/main/java/io/micronaut/scheduling/executor/ExecutorConfiguration.java", "/workspace/context/src/main/java/io/micronaut/scheduling/executor/ExecutorFactory.java", "/workspace/context/src/main/java/io/micronaut/scheduling/executor/ExecutorSelector.java", "/workspace/context/src/main/java/io/micronaut/scheduling/executor/ExecutorType.java", "/workspace/context/src/main/java/io/micronaut/scheduling/executor/FastThreadPerTaskExecutor.java", "/workspace/context/src/main/java/io/micronaut/scheduling/executor/GracefulShutdownCapableScheduledThreadPoolExecutor.java", "/workspace/context/src/main/java/io/micronaut/scheduling/executor/IOExecutorServiceConfig.java", "/workspace/context/src/main/java/io/micronaut/scheduling/executor/NamedThreadFactory.java", "/workspace/context/src/main/java/io/micronaut/scheduling/executor/ScheduledExecutorServiceConfig.java", "/workspace/context/src/main/java/io/micronaut/scheduling/executor/ThreadSelection.java", "/workspace/context/src/main/java/io/micronaut/scheduling/executor/UserExecutorConfiguration.java", "/workspace/context/src/main/java/io/micronaut/scheduling/executor/package-info.java", "/workspace/context/src/main/java/io/micronaut/scheduling/instrument/InstrumentedExecutor.java", "/workspace/context/src/main/java/io/micronaut/scheduling/instrument/InstrumentedExecutorService.java", "/workspace/context/src/main/java/io/micronaut/scheduling/instrument/InstrumentedScheduledExecutorService.java", "/workspace/context/src/main/java/io/micronaut/scheduling/instrument/RunnableInstrumenter.java", "/workspace/context/src/main/java/io/micronaut/scheduling/instrument/package-info.java", "/workspace/context/src/main/java/io/micronaut/scheduling/io/watch/DefaultWatchThread.java", "/workspace/context/src/main/java/io/micronaut/scheduling/io/watch/FileWatchCondition.java", "/workspace/context/src/main/java/io/micronaut/scheduling/io/watch/FileWatchConfiguration.java", "/workspace/context/src/main/java/io/micronaut/scheduling/io/watch/WatchServiceFactory.java", "/workspace/context/src/main/java/io/micronaut/scheduling/io/watch/event/FileChangedEvent.java", "/workspace/context/src/main/java/io/micronaut/scheduling/io/watch/event/WatchEventType.java", "/workspace/context/src/main/java/io/micronaut/scheduling/io/watch/event/package-info.java", "/workspace/context/src/main/java/io/micronaut/scheduling/io/watch/package-info.java", "/workspace/context/src/main/java/io/micronaut/scheduling/package-info.java", "/workspace/context/src/main/java/io/micronaut/scheduling/processor/ScheduledMethodProcessor.java", "/workspace/context/src/main/java/io/micronaut/scheduling/processor/package-info.java", "/workspace/context/src/main/resources/META-INF/native-image/io.micronaut/micronaut-context/native-image.properties", "/workspace/context/src/main/resources/META-INF/services/io.micronaut.core.convert.TypeConverterRegistrar", "/workspace/context-propagation/build.gradle.kts", "/workspace/context-propagation/src/main/java/io/micronaut/context/propagation/instrument/execution/ContextPropagatingExecutorService.java", "/workspace/context-propagation/src/main/java/io/micronaut/context/propagation/instrument/execution/ContextPropagatingScheduledExecutorService.java", "/workspace/context-propagation/src/main/java/io/micronaut/context/propagation/instrument/execution/ExecutorServiceInstrumenter.java", "/workspace/context-propagation/src/main/java/io/micronaut/context/propagation/slf4j/MdcPropagationContext.java", "/workspace/core/README.md", "/workspace/core/build.gradle.kts", "/workspace/core/src/main/java/io/micronaut/core/annotation/AccessorsStyle.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/AnnotatedElement.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/AnnotatedTypeInfo.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/AnnotationClassValue.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/AnnotationDefaultValuesProvider.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/AnnotationMetadata.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/AnnotationMetadataDelegate.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/AnnotationMetadataProvider.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/AnnotationMetadataResolver.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/AnnotationSource.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/AnnotationUtil.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/AnnotationValue.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/AnnotationValueBuilder.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/AnnotationValueProvider.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/AnnotationValueResolver.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/Blocking.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/BuildTimeInit.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/Creator.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/EmptyAnnotationMetadata.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/EntryPoint.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/Experimental.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/Generated.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/ImmutableSortedStringsArrayMap.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/Indexed.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/Indexes.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/InstantiatedMember.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/Internal.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/Introspected.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/NextMajorVersion.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/NonBlocking.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/NonNull.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/NullMarked.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/Nullable.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/Order.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/ReflectionConfig.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/ReflectiveAccess.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/TypeHint.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/UsedByGeneratedCode.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/Vetoed.java", "/workspace/core/src/main/java/io/micronaut/core/annotation/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/attr/AttributeHolder.java", "/workspace/core/src/main/java/io/micronaut/core/attr/MutableAttributeHolder.java", "/workspace/core/src/main/java/io/micronaut/core/attr/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/beans/AbstractBeanConstructor.java", "/workspace/core/src/main/java/io/micronaut/core/beans/AbstractBeanIntrospectionReference.java", "/workspace/core/src/main/java/io/micronaut/core/beans/AbstractBeanMethod.java", "/workspace/core/src/main/java/io/micronaut/core/beans/AbstractBeanProperty.java", "/workspace/core/src/main/java/io/micronaut/core/beans/BeanConstructor.java", "/workspace/core/src/main/java/io/micronaut/core/beans/BeanInfo.java", "/workspace/core/src/main/java/io/micronaut/core/beans/BeanIntrospection.java", "/workspace/core/src/main/java/io/micronaut/core/beans/BeanIntrospectionMap.java", "/workspace/core/src/main/java/io/micronaut/core/beans/BeanIntrospectionReference.java", "/workspace/core/src/main/java/io/micronaut/core/beans/BeanIntrospector.java", "/workspace/core/src/main/java/io/micronaut/core/beans/BeanMap.java", "/workspace/core/src/main/java/io/micronaut/core/beans/BeanMethod.java", "/workspace/core/src/main/java/io/micronaut/core/beans/BeanProperty.java", "/workspace/core/src/main/java/io/micronaut/core/beans/BeanReadProperty.java", "/workspace/core/src/main/java/io/micronaut/core/beans/BeanWrapper.java", "/workspace/core/src/main/java/io/micronaut/core/beans/BeanWriteProperty.java", "/workspace/core/src/main/java/io/micronaut/core/beans/DefaultBeanIntrospector.java", "/workspace/core/src/main/java/io/micronaut/core/beans/DefaultBeanWrapper.java", "/workspace/core/src/main/java/io/micronaut/core/beans/EnumBeanIntrospection.java", "/workspace/core/src/main/java/io/micronaut/core/beans/UnsafeBeanInstantiationIntrospection.java", "/workspace/core/src/main/java/io/micronaut/core/beans/UnsafeBeanProperty.java", "/workspace/core/src/main/java/io/micronaut/core/beans/UnsafeBeanReadProperty.java", "/workspace/core/src/main/java/io/micronaut/core/beans/UnsafeBeanWriteProperty.java", "/workspace/core/src/main/java/io/micronaut/core/beans/exceptions/IntrospectionException.java", "/workspace/core/src/main/java/io/micronaut/core/beans/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/bind/ArgumentBinder.java", "/workspace/core/src/main/java/io/micronaut/core/bind/ArgumentBinderRegistry.java", "/workspace/core/src/main/java/io/micronaut/core/bind/BeanPropertyBinder.java", "/workspace/core/src/main/java/io/micronaut/core/bind/BoundExecutable.java", "/workspace/core/src/main/java/io/micronaut/core/bind/DefaultExecutableBinder.java", "/workspace/core/src/main/java/io/micronaut/core/bind/ExecutableBinder.java", "/workspace/core/src/main/java/io/micronaut/core/bind/MappedBindingResult.java", "/workspace/core/src/main/java/io/micronaut/core/bind/TypeArgumentBinder.java", "/workspace/core/src/main/java/io/micronaut/core/bind/annotation/AbstractAnnotatedArgumentBinder.java", "/workspace/core/src/main/java/io/micronaut/core/bind/annotation/AbstractArgumentBinder.java", "/workspace/core/src/main/java/io/micronaut/core/bind/annotation/AnnotatedArgumentBinder.java", "/workspace/core/src/main/java/io/micronaut/core/bind/annotation/Bindable.java", "/workspace/core/src/main/java/io/micronaut/core/bind/annotation/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/bind/exceptions/UnsatisfiedArgumentException.java", "/workspace/core/src/main/java/io/micronaut/core/bind/exceptions/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/bind/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/cli/CommandLine.java", "/workspace/core/src/main/java/io/micronaut/core/cli/CommandLineParser.java", "/workspace/core/src/main/java/io/micronaut/core/cli/DefaultCommandLine.java", "/workspace/core/src/main/java/io/micronaut/core/cli/Option.java", "/workspace/core/src/main/java/io/micronaut/core/cli/exceptions/ParseException.java", "/workspace/core/src/main/java/io/micronaut/core/cli/exceptions/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/cli/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/convert/ArgumentConversionContext.java", "/workspace/core/src/main/java/io/micronaut/core/convert/CharSequenceToEnumConverter.java", "/workspace/core/src/main/java/io/micronaut/core/convert/ConversionContext.java", "/workspace/core/src/main/java/io/micronaut/core/convert/ConversionError.java", "/workspace/core/src/main/java/io/micronaut/core/convert/ConversionService.java", "/workspace/core/src/main/java/io/micronaut/core/convert/ConversionServiceAware.java", "/workspace/core/src/main/java/io/micronaut/core/convert/ConversionServiceProvider.java", "/workspace/core/src/main/java/io/micronaut/core/convert/DefaultArgumentConversionContext.java", "/workspace/core/src/main/java/io/micronaut/core/convert/DefaultMutableConversionService.java", "/workspace/core/src/main/java/io/micronaut/core/convert/ErrorsContext.java", "/workspace/core/src/main/java/io/micronaut/core/convert/ImmutableArgumentConversionContext.java", "/workspace/core/src/main/java/io/micronaut/core/convert/MutableConversionService.java", "/workspace/core/src/main/java/io/micronaut/core/convert/TypeConverter.java", "/workspace/core/src/main/java/io/micronaut/core/convert/TypeConverterRegistrar.java", "/workspace/core/src/main/java/io/micronaut/core/convert/converters/MultiValuesConverterFactory.java", "/workspace/core/src/main/java/io/micronaut/core/convert/exceptions/ConversionErrorException.java", "/workspace/core/src/main/java/io/micronaut/core/convert/exceptions/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/convert/format/Format.java", "/workspace/core/src/main/java/io/micronaut/core/convert/format/FormattingTypeConverter.java", "/workspace/core/src/main/java/io/micronaut/core/convert/format/MapFormat.java", "/workspace/core/src/main/java/io/micronaut/core/convert/format/ReadableBytes.java", "/workspace/core/src/main/java/io/micronaut/core/convert/format/ReadableBytesTypeConverter.java", "/workspace/core/src/main/java/io/micronaut/core/convert/format/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/convert/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/convert/value/ConvertibleMultiValues.java", "/workspace/core/src/main/java/io/micronaut/core/convert/value/ConvertibleMultiValuesMap.java", "/workspace/core/src/main/java/io/micronaut/core/convert/value/ConvertibleValues.java", "/workspace/core/src/main/java/io/micronaut/core/convert/value/ConvertibleValuesMap.java", "/workspace/core/src/main/java/io/micronaut/core/convert/value/MutableConvertibleMultiValues.java", "/workspace/core/src/main/java/io/micronaut/core/convert/value/MutableConvertibleMultiValuesMap.java", "/workspace/core/src/main/java/io/micronaut/core/convert/value/MutableConvertibleValues.java", "/workspace/core/src/main/java/io/micronaut/core/convert/value/MutableConvertibleValuesMap.java", "/workspace/core/src/main/java/io/micronaut/core/convert/value/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/exceptions/BeanExceptionHandler.java", "/workspace/core/src/main/java/io/micronaut/core/exceptions/ExceptionHandler.java", "/workspace/core/src/main/java/io/micronaut/core/exceptions/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/execution/CompletableFutureExecutionFlow.java", "/workspace/core/src/main/java/io/micronaut/core/execution/CompletableFutureExecutionFlowImpl.java", "/workspace/core/src/main/java/io/micronaut/core/execution/DelayedExecutionFlow.java", "/workspace/core/src/main/java/io/micronaut/core/execution/DelayedExecutionFlowImpl.java", "/workspace/core/src/main/java/io/micronaut/core/execution/ExecutionFlow.java", "/workspace/core/src/main/java/io/micronaut/core/execution/ImperativeExecutionFlow.java", "/workspace/core/src/main/java/io/micronaut/core/execution/ImperativeExecutionFlowImpl.java", "/workspace/core/src/main/java/io/micronaut/core/expressions/EvaluatedExpression.java", "/workspace/core/src/main/java/io/micronaut/core/expressions/EvaluatedExpressionReference.java", "/workspace/core/src/main/java/io/micronaut/core/expressions/ExpressionEvaluationContext.java", "/workspace/core/src/main/java/io/micronaut/core/graal/GraalReflectionConfigurer.java", "/workspace/core/src/main/java/io/micronaut/core/io/FileReadable.java", "/workspace/core/src/main/java/io/micronaut/core/io/IOUtils.java", "/workspace/core/src/main/java/io/micronaut/core/io/Readable.java", "/workspace/core/src/main/java/io/micronaut/core/io/ResourceLoader.java", "/workspace/core/src/main/java/io/micronaut/core/io/ResourceResolver.java", "/workspace/core/src/main/java/io/micronaut/core/io/Streamable.java", "/workspace/core/src/main/java/io/micronaut/core/io/UrlReadable.java", "/workspace/core/src/main/java/io/micronaut/core/io/Writable.java", "/workspace/core/src/main/java/io/micronaut/core/io/buffer/ByteArrayBufferFactory.java", "/workspace/core/src/main/java/io/micronaut/core/io/buffer/ByteArrayByteBuffer.java", "/workspace/core/src/main/java/io/micronaut/core/io/buffer/ByteBuffer.java", "/workspace/core/src/main/java/io/micronaut/core/io/buffer/ByteBufferFactory.java", "/workspace/core/src/main/java/io/micronaut/core/io/buffer/DelegateByteBuffer.java", "/workspace/core/src/main/java/io/micronaut/core/io/buffer/NioReadBuffer.java", "/workspace/core/src/main/java/io/micronaut/core/io/buffer/ReadBuffer.java", "/workspace/core/src/main/java/io/micronaut/core/io/buffer/ReadBufferFactory.java", "/workspace/core/src/main/java/io/micronaut/core/io/buffer/ReferenceCounted.java", "/workspace/core/src/main/java/io/micronaut/core/io/buffer/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/io/file/DefaultFileSystemResourceLoader.java", "/workspace/core/src/main/java/io/micronaut/core/io/file/FileSystemResourceLoader.java", "/workspace/core/src/main/java/io/micronaut/core/io/file/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/io/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/io/scan/AnnotationScanner.java", "/workspace/core/src/main/java/io/micronaut/core/io/scan/BeanIntrospectionScanner.java", "/workspace/core/src/main/java/io/micronaut/core/io/scan/ClassPathResourceLoader.java", "/workspace/core/src/main/java/io/micronaut/core/io/scan/DefaultClassPathResourceLoader.java", "/workspace/core/src/main/java/io/micronaut/core/io/scan/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/io/service/DefaultServiceDefinition.java", "/workspace/core/src/main/java/io/micronaut/core/io/service/MicronautMetaServiceLoaderUtils.java", "/workspace/core/src/main/java/io/micronaut/core/io/service/ServiceDefinition.java", "/workspace/core/src/main/java/io/micronaut/core/io/service/ServiceLoaderFeature.java", "/workspace/core/src/main/java/io/micronaut/core/io/service/ServiceScanner.java", "/workspace/core/src/main/java/io/micronaut/core/io/service/SoftServiceLoader.java", "/workspace/core/src/main/java/io/micronaut/core/io/service/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/io/socket/SocketUtils.java", "/workspace/core/src/main/java/io/micronaut/core/io/socket/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/io/value/Base64ResourceLoader.java", "/workspace/core/src/main/java/io/micronaut/core/io/value/StringResourceLoader.java", "/workspace/core/src/main/java/io/micronaut/core/io/value/ValueResourceLoader.java", "/workspace/core/src/main/java/io/micronaut/core/naming/Described.java", "/workspace/core/src/main/java/io/micronaut/core/naming/NameResolver.java", "/workspace/core/src/main/java/io/micronaut/core/naming/NameUtils.java", "/workspace/core/src/main/java/io/micronaut/core/naming/Named.java", "/workspace/core/src/main/java/io/micronaut/core/naming/conventions/MethodConvention.java", "/workspace/core/src/main/java/io/micronaut/core/naming/conventions/PropertyConvention.java", "/workspace/core/src/main/java/io/micronaut/core/naming/conventions/StringConvention.java", "/workspace/core/src/main/java/io/micronaut/core/naming/conventions/TypeConvention.java", "/workspace/core/src/main/java/io/micronaut/core/naming/conventions/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/naming/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/optim/StaticOptimizations.java", "/workspace/core/src/main/java/io/micronaut/core/order/OrderUtil.java", "/workspace/core/src/main/java/io/micronaut/core/order/Ordered.java", "/workspace/core/src/main/java/io/micronaut/core/order/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/propagation/MutablePropagatedContext.java", "/workspace/core/src/main/java/io/micronaut/core/propagation/MutablePropagatedContextImpl.java", "/workspace/core/src/main/java/io/micronaut/core/propagation/PropagatedContext.java", "/workspace/core/src/main/java/io/micronaut/core/propagation/PropagatedContextElement.java", "/workspace/core/src/main/java/io/micronaut/core/propagation/PropagatedContextImpl.java", "/workspace/core/src/main/java/io/micronaut/core/propagation/ThreadContext.java", "/workspace/core/src/main/java/io/micronaut/core/propagation/ThreadPropagatedContextElement.java", "/workspace/core/src/main/java/io/micronaut/core/reflect/ClassUtils.java", "/workspace/core/src/main/java/io/micronaut/core/reflect/GenericTypeUtils.java", "/workspace/core/src/main/java/io/micronaut/core/reflect/InstantiationUtils.java", "/workspace/core/src/main/java/io/micronaut/core/reflect/ReflectionUtils.java", "/workspace/core/src/main/java/io/micronaut/core/reflect/exception/InstantiationException.java", "/workspace/core/src/main/java/io/micronaut/core/reflect/exception/InvocationException.java", "/workspace/core/src/main/java/io/micronaut/core/reflect/exception/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/reflect/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/serialize/JdkSerializer.java", "/workspace/core/src/main/java/io/micronaut/core/serialize/ObjectSerializer.java", "/workspace/core/src/main/java/io/micronaut/core/serialize/exceptions/SerializationException.java", "/workspace/core/src/main/java/io/micronaut/core/serialize/exceptions/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/serialize/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/type/Argument.java", "/workspace/core/src/main/java/io/micronaut/core/type/ArgumentCoercible.java", "/workspace/core/src/main/java/io/micronaut/core/type/ArgumentValue.java", "/workspace/core/src/main/java/io/micronaut/core/type/DefaultArgument.java", "/workspace/core/src/main/java/io/micronaut/core/type/DefaultArgumentValue.java", "/workspace/core/src/main/java/io/micronaut/core/type/DefaultGenericPlaceholder.java", "/workspace/core/src/main/java/io/micronaut/core/type/DefaultMutableArgumentValue.java", "/workspace/core/src/main/java/io/micronaut/core/type/Executable.java", "/workspace/core/src/main/java/io/micronaut/core/type/GenericArgument.java", "/workspace/core/src/main/java/io/micronaut/core/type/GenericPlaceholder.java", "/workspace/core/src/main/java/io/micronaut/core/type/Headers.java", "/workspace/core/src/main/java/io/micronaut/core/type/MutableArgumentValue.java", "/workspace/core/src/main/java/io/micronaut/core/type/MutableHeaders.java", "/workspace/core/src/main/java/io/micronaut/core/type/ReturnType.java", "/workspace/core/src/main/java/io/micronaut/core/type/RuntimeTypeInformation.java", "/workspace/core/src/main/java/io/micronaut/core/type/TypeInformation.java", "/workspace/core/src/main/java/io/micronaut/core/type/TypeInformationProvider.java", "/workspace/core/src/main/java/io/micronaut/core/type/TypeVariableResolver.java", "/workspace/core/src/main/java/io/micronaut/core/type/UnsafeExecutable.java", "/workspace/core/src/main/java/io/micronaut/core/type/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/util/AnsiColour.java", "/workspace/core/src/main/java/io/micronaut/core/util/AntPathMatcher.java", "/workspace/core/src/main/java/io/micronaut/core/util/ArgumentUtils.java", "/workspace/core/src/main/java/io/micronaut/core/util/ArrayUtils.java", "/workspace/core/src/main/java/io/micronaut/core/util/CollectionUtils.java", "/workspace/core/src/main/java/io/micronaut/core/util/CopyOnWriteMap.java", "/workspace/core/src/main/java/io/micronaut/core/util/EnvironmentProperties.java", "/workspace/core/src/main/java/io/micronaut/core/util/IOExceptionBiFunction.java", "/workspace/core/src/main/java/io/micronaut/core/util/KotlinUtils.java", "/workspace/core/src/main/java/io/micronaut/core/util/LocaleResolver.java", "/workspace/core/src/main/java/io/micronaut/core/util/NativeImageUtils.java", "/workspace/core/src/main/java/io/micronaut/core/util/ObjectUtils.java", "/workspace/core/src/main/java/io/micronaut/core/util/PathMatcher.java", "/workspace/core/src/main/java/io/micronaut/core/util/RegexPathMatcher.java", "/workspace/core/src/main/java/io/micronaut/core/util/StreamUtils.java", "/workspace/core/src/main/java/io/micronaut/core/util/StringIntMap.java", "/workspace/core/src/main/java/io/micronaut/core/util/StringUtils.java", "/workspace/core/src/main/java/io/micronaut/core/util/SupplierUtil.java", "/workspace/core/src/main/java/io/micronaut/core/util/Toggleable.java", "/workspace/core/src/main/java/io/micronaut/core/util/clhm/ConcurrentLinkedHashMap.java", "/workspace/core/src/main/java/io/micronaut/core/util/clhm/EntryWeigher.java", "/workspace/core/src/main/java/io/micronaut/core/util/clhm/EvictionListener.java", "/workspace/core/src/main/java/io/micronaut/core/util/clhm/LinkedDeque.java", "/workspace/core/src/main/java/io/micronaut/core/util/clhm/Weigher.java", "/workspace/core/src/main/java/io/micronaut/core/util/clhm/Weighers.java", "/workspace/core/src/main/java/io/micronaut/core/util/clhm/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/util/functional/ThrowingConsumer.java", "/workspace/core/src/main/java/io/micronaut/core/util/functional/ThrowingFunction.java", "/workspace/core/src/main/java/io/micronaut/core/util/functional/ThrowingRunnable.java", "/workspace/core/src/main/java/io/micronaut/core/util/functional/ThrowingSupplier.java", "/workspace/core/src/main/java/io/micronaut/core/util/locale/AbstractLocaleResolver.java", "/workspace/core/src/main/java/io/micronaut/core/util/locale/FixedLocaleResolver.java", "/workspace/core/src/main/java/io/micronaut/core/util/locale/LocaleResolutionConfiguration.java", "/workspace/core/src/main/java/io/micronaut/core/util/locale/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/util/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/value/MapPropertyResolver.java", "/workspace/core/src/main/java/io/micronaut/core/value/MapValueResolver.java", "/workspace/core/src/main/java/io/micronaut/core/value/OptionalMultiValues.java", "/workspace/core/src/main/java/io/micronaut/core/value/OptionalMultiValuesMap.java", "/workspace/core/src/main/java/io/micronaut/core/value/OptionalValues.java", "/workspace/core/src/main/java/io/micronaut/core/value/OptionalValuesMap.java", "/workspace/core/src/main/java/io/micronaut/core/value/PropertyCatalog.java", "/workspace/core/src/main/java/io/micronaut/core/value/PropertyNotFoundException.java", "/workspace/core/src/main/java/io/micronaut/core/value/PropertyResolver.java", "/workspace/core/src/main/java/io/micronaut/core/value/ValueException.java", "/workspace/core/src/main/java/io/micronaut/core/value/ValueResolver.java", "/workspace/core/src/main/java/io/micronaut/core/value/package-info.java", "/workspace/core/src/main/java/io/micronaut/core/version/SemanticVersion.java", "/workspace/core/src/main/java/io/micronaut/core/version/VersionUtils.java", "/workspace/core/src/main/java/io/micronaut/core/version/annotation/Version.java", "/workspace/core/src/main/java/io/micronaut/core/version/package-info.java", "/workspace/core/src/main/resources/META-INF/native-image/io.micronaut/micronaut-core/native-image.properties", "/workspace/core/src/main/resources/io/micronaut/core/beans/messages.properties", "/workspace/core-bom/README.md", "/workspace/core-bom/build.gradle.kts", "/workspace/core-processor/build.gradle.kts", "/workspace/core-processor/src/main/java/io/micronaut/aop/mapper/InterceptorBeanMapper.java", "/workspace/core-processor/src/main/java/io/micronaut/aop/writer/AopProxyWriter.java", "/workspace/core-processor/src/main/java/io/micronaut/aop/writer/package-info.java", "/workspace/core-processor/src/main/java/io/micronaut/context/visitor/BeanImportHandler.java", "/workspace/core-processor/src/main/java/io/micronaut/context/visitor/BeanImportVisitor.java", "/workspace/core-processor/src/main/java/io/micronaut/context/visitor/ConfigurationMetadataWriterVisitor.java", "/workspace/core-processor/src/main/java/io/micronaut/context/visitor/ConfigurationReaderVisitor.java", "/workspace/core-processor/src/main/java/io/micronaut/context/visitor/ContextConfigurerVisitor.java", "/workspace/core-processor/src/main/java/io/micronaut/context/visitor/ExecutableVisitor.java", "/workspace/core-processor/src/main/java/io/micronaut/context/visitor/InternalApiTypeElementVisitor.java", "/workspace/core-processor/src/main/java/io/micronaut/context/visitor/PackageConfigurationImportVisitor.java", "/workspace/core-processor/src/main/java/io/micronaut/context/visitor/VisitorUtils.java", "/workspace/core-processor/src/main/java/io/micronaut/context/visitor/package-info.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/EvaluatedExpressionConstants.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/EvaluatedExpressionWriter.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/context/DefaultExpressionCompilationContextFactory.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/context/DefaultExpressionEvaluationContext.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/context/ExpressionCompilationContextFactory.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/context/ExpressionEvaluationContext.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/context/ExpressionEvaluationContextRegistrar.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/context/ExpressionWithContext.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/context/ExtensibleExpressionEvaluationContext.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/CompoundEvaluatedExpressionParser.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/EvaluatedExpressionParser.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/SingleEvaluatedExpressionParser.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/ExpressionNode.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/access/AbstractMethodCall.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/access/BeanContextAccess.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/access/CandidateMethod.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/access/ContextElementAccess.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/access/ContextMethodCall.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/access/ContextMethodParameterAccess.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/access/ElementMethodCall.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/access/EnvironmentAccess.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/access/PropertyAccess.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/access/SubscriptOperator.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/access/ThisAccess.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/collection/OneDimensionalArray.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/conditional/ElvisOperator.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/conditional/TernaryExpression.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/literal/BoolLiteral.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/literal/DoubleLiteral.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/literal/FloatLiteral.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/literal/IntLiteral.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/literal/LongLiteral.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/literal/NullLiteral.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/literal/StringLiteral.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/operator/binary/AddOperator.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/operator/binary/AndOperator.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/operator/binary/BinaryOperator.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/operator/binary/ComparablesComparisonOperation.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/operator/binary/EqOperator.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/operator/binary/InstanceofOperator.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/operator/binary/LogicalOperator.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/operator/binary/MatchesOperator.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/operator/binary/MathOperator.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/operator/binary/NeqOperator.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/operator/binary/NumericComparisonOperation.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/operator/binary/OrOperator.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/operator/binary/PowOperator.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/operator/binary/RelationalOperator.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/operator/unary/EmptyOperator.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/operator/unary/NegOperator.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/operator/unary/NotOperator.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/operator/unary/PosOperator.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/operator/unary/UnaryOperator.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/types/TypeIdentifier.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/util/EvaluatedExpressionCompilationUtils.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/ast/util/TypeDescriptors.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/compilation/ExpressionCompilationContext.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/compilation/ExpressionVisitorContext.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/exception/ExpressionCompilationException.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/exception/ExpressionParsingException.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/token/Token.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/token/TokenType.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/parser/token/Tokenizer.java", "/workspace/core-processor/src/main/java/io/micronaut/expressions/util/EvaluatedExpressionsUtils.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/AbstractAnnotationMetadataBuilder.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/AnnotationMapper.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/AnnotationMetadataGenUtils.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/AnnotationMetadataWriter.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/AnnotationRemapper.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/AnnotationTransformer.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/EvaluatedExpressionReferenceCounter.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/NamedAnnotationMapper.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/NamedAnnotationTransformer.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/PackageRenameRemapper.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/TypedAnnotationMapper.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/TypedAnnotationTransformer.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/internal/AndroidxNullableTransformer.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/internal/CoreNonNullTransformer.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/internal/CoreNullableTransformer.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/internal/FindBugsRemapper.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/internal/InterceptorBindingMembers.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/internal/JakartaPersistenceContextAnnotationMapper.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/internal/JavaxNonnullTransformer.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/internal/JavaxNullableTransformer.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/internal/JavaxPersistenceContextAnnotationMapper.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/internal/JavaxPostConstructTransformer.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/internal/JavaxPreDestroyTransformer.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/internal/JavaxRemapper.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/internal/JdtNullableTransformer.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/internal/JspecifyNotNullTransformer.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/internal/JspecifyNullMarkedTransformer.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/internal/JspecifyNullableTransformer.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/internal/KotlinDeprecatedTransformer.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/internal/KotlinNotNullMapper.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/internal/KotlinNullableMapper.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/internal/QualifierBindingMembers.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/internal/ReactivexNullableTransformer.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/internal/ReactorNullableTransformer.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/internal/Rxjava3NullableTransformer.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/internal/SpotbugsNullableTransformer.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/annotation/internal/package-info.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/AnnotationElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/ArrayableClassElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/ClassElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/ConstructorElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/DefaultElementQuery.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/Element.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/ElementFactory.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/ElementModifier.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/ElementQuery.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/EnumConstantElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/EnumElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/FieldElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/GenericElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/GenericPlaceholderElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/ImportedClass.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/KotlinParameterElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/MemberElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/MethodElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/PackageElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/ParameterElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/PrimitiveElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/PropertyElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/PropertyElementQuery.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/ReflectClassElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/ReflectGenericPlaceholderElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/ReflectParameterElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/ReflectTypeElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/ReflectWildcardElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/SimpleClassElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/SimplePackageElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/TypedElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/UnresolvedTypeKind.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/WildcardElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/annotation/AbstractAnnotationElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/annotation/AbstractElementAnnotationMetadata.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/annotation/AbstractElementAnnotationMetadataFactory.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/annotation/AbstractMutableAnnotationMetadata.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/annotation/ElementAnnotationMetadata.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/annotation/ElementAnnotationMetadataFactory.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/annotation/ElementMutableAnnotationMetadataDelegate.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/annotation/GenericPlaceholderElementAnnotationMetadata.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/annotation/MethodElementAnnotationMetadata.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/annotation/MethodElementAnnotationsHelper.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/annotation/MutableAnnotationMetadataDelegate.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/annotation/MutatedMethodElementAnnotationMetadata.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/annotation/PropertyElementAnnotationMetadata.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/annotation/WildcardElementAnnotationMetadata.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/annotation/package-info.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/beans/BeanConstructorElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/beans/BeanElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/beans/BeanElementBuilder.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/beans/BeanFieldElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/beans/BeanMethodElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/beans/BeanParameterElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/beans/ConfigurableElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/beans/InjectableElement.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/package-info.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/utils/AstBeanPropertiesUtils.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/ast/utils/EnclosedElementsQuery.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/beans/visitor/BeanIntrospectionWriter.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/beans/visitor/EntityIntrospectedAnnotationMapper.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/beans/visitor/EntityReflectiveAccessAnnotationMapper.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/beans/visitor/IntrospectedPackageElementVisitor.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/beans/visitor/IntrospectedToBeanPropertiesTransformer.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/beans/visitor/IntrospectedTypeElementVisitor.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/beans/visitor/JsonCreatorAnnotationMapper.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/beans/visitor/MappedSuperClassIntrospectionMapper.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/beans/visitor/MapperAnnotationMapper.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/beans/visitor/MapperVisitor.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/beans/visitor/package-info.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/beans/visitor/persistence/JakartaEntityIntrospectedAnnotationMapper.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/beans/visitor/persistence/JakartaMappedSuperClassIntrospectionMapper.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/configuration/ConfigurationMetadata.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/configuration/ConfigurationMetadataBuilder.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/configuration/ConfigurationMetadataWriter.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/configuration/ConfigurationUtils.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/configuration/JsonConfigurationMetadataWriter.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/configuration/PropertyMetadata.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/configuration/builder/ConfigurationBuilderDefinition.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/configuration/builder/ConfigurationBuilderOfFieldDefinition.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/configuration/builder/ConfigurationBuilderOfPropertyDefinition.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/configuration/builder/ConfigurationBuilderPropertyDefinition.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/configuration/package-info.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/processing/AbstractBeanElementCreator.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/processing/AopIntroductionProxySupportedBeanElementCreator.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/processing/BeanDefinitionCreator.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/processing/BeanDefinitionCreatorFactory.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/processing/ConfigurationReaderBeanElementCreator.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/processing/DeclaredBeanElementCreator.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/processing/FactoryBeanElementCreator.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/processing/IntroductionInterfaceBeanElementCreator.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/processing/JavaModelUtils.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/processing/ProcessingException.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/processing/package-info.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/utils/NativeElementsHelper.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/visitor/BeanElementVisitor.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/visitor/BeanElementVisitorContext.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/visitor/BeanElementVisitorLoader.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/visitor/DefaultTypeElementQuery.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/visitor/ElementPostponedToNextRoundException.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/visitor/PackageElementVisitor.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/visitor/TypeElementQuery.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/visitor/TypeElementVisitor.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/visitor/VisitorConfiguration.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/visitor/VisitorContext.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/visitor/package-info.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/visitor/util/VisitorContextUtils.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/AbstractBeanDefinitionBuilder.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/AbstractClassWriterOutputVisitor.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/ArgumentExpUtils.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/BeanClassWriter.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/BeanConfigurationWriter.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/BeanDefinitionVisitor.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/BeanDefinitionWriter.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/ByteCodeWriterUtils.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/ClassGenerationException.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/ClassOutputWriter.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/ClassWriterOutputVisitor.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/ConfigBuilderState.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/DefaultOriginatingElements.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/DirectoryClassWriterOutputVisitor.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/DispatchWriter.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/EvaluatedExpressionProcessor.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/ExecutableMethodsDefinitionWriter.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/FileBackedGeneratedFile.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/GenUtils.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/GeneratedFile.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/MethodGenUtils.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/OriginatingElements.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/ProxyingBeanDefinitionVisitor.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/StaticOriginatingElements.java", "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/package-info.java", "/workspace/core-processor/src/main/java/io/micronaut/validation/visitor/async/AsyncTypeElementVisitor.java", "/workspace/core-processor/src/main/java/io/micronaut/validation/visitor/package-info.java", "/workspace/core-processor/src/main/resources/META-INF/services/io.micronaut.inject.annotation.AnnotationMapper", "/workspace/core-processor/src/main/resources/META-INF/services/io.micronaut.inject.annotation.AnnotationRemapper", "/workspace/core-processor/src/main/resources/META-INF/services/io.micronaut.inject.annotation.AnnotationTransformer", "/workspace/core-processor/src/main/resources/META-INF/services/io.micronaut.inject.configuration.ConfigurationMetadataWriter", "/workspace/core-processor/src/main/resources/META-INF/services/io.micronaut.inject.visitor.PackageElementVisitor", "/workspace/core-processor/src/main/resources/META-INF/services/io.micronaut.inject.visitor.TypeElementVisitor", "/workspace/core-reactive/README.md", "/workspace/core-reactive/build.gradle.kts", "/workspace/core-reactive/src/main/java/io/micronaut/core/async/ReactiveStreamsTypeInformationProvider.java", "/workspace/core-reactive/src/main/java/io/micronaut/core/async/annotation/SingleResult.java", "/workspace/core-reactive/src/main/java/io/micronaut/core/async/converters/ReactiveTypeConverterRegistrar.java", "/workspace/core-reactive/src/main/java/io/micronaut/core/async/package-info.java", "/workspace/core-reactive/src/main/java/io/micronaut/core/async/processor/SingleSubscriberProcessor.java", "/workspace/core-reactive/src/main/java/io/micronaut/core/async/processor/SingleThreadedBufferingProcessor.java", "/workspace/core-reactive/src/main/java/io/micronaut/core/async/processor/package-info.java", "/workspace/core-reactive/src/main/java/io/micronaut/core/async/propagation/ReactivePropagation.java", "/workspace/core-reactive/src/main/java/io/micronaut/core/async/propagation/ReactorPropagation.java", "/workspace/core-reactive/src/main/java/io/micronaut/core/async/publisher/AsyncSingleResultPublisher.java", "/workspace/core-reactive/src/main/java/io/micronaut/core/async/publisher/CompletableFuturePublisher.java", "/workspace/core-reactive/src/main/java/io/micronaut/core/async/publisher/DelayedSubscriber.java", "/workspace/core-reactive/src/main/java/io/micronaut/core/async/publisher/Publishers.java", "/workspace/core-reactive/src/main/java/io/micronaut/core/async/publisher/PublishersOptimizations.java", "/workspace/core-reactive/src/main/java/io/micronaut/core/async/publisher/SingleSubscriberPublisher.java", "/workspace/core-reactive/src/main/java/io/micronaut/core/async/publisher/package-info.java", "/workspace/core-reactive/src/main/java/io/micronaut/core/async/subscriber/Completable.java", "/workspace/core-reactive/src/main/java/io/micronaut/core/async/subscriber/CompletionAwareSubscriber.java", "/workspace/core-reactive/src/main/java/io/micronaut/core/async/subscriber/Emitter.java", "/workspace/core-reactive/src/main/java/io/micronaut/core/async/subscriber/LazySendingSubscriber.java", "/workspace/core-reactive/src/main/java/io/micronaut/core/async/subscriber/SingleThreadedBufferingSubscriber.java", "/workspace/core-reactive/src/main/java/io/micronaut/core/async/subscriber/TypedSubscriber.java", "/workspace/core-reactive/src/main/java/io/micronaut/core/async/subscriber/package-info.java", "/workspace/core-reactive/src/main/kotlin/io/micronaut/core/async/propagation/KotlinCoroutinePropagation.kt", "/workspace/core-reactive/src/main/kotlin/io/micronaut/core/async/propagation/MicronautPropagatedContext.kt", "/workspace/core-reactive/src/main/resources/META-INF/native-image/io.micronaut/micronaut-core-reactive/native-image.properties", "/workspace/core-reactive/src/main/resources/META-INF/native-image/io.micronaut/micronaut-core-reactive/reflect-config.json", "/workspace/core-reactive/src/main/resources/META-INF/services/io.micronaut.core.convert.TypeConverterRegistrar", "/workspace/core-reactive/src/main/resources/META-INF/services/io.micronaut.core.type.TypeInformationProvider", "/workspace/discovery-core/build.gradle.kts", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/CompositeDiscoveryClient.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/DefaultCompositeDiscoveryClient.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/DefaultServiceInstance.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/DefaultServiceInstanceIdGenerator.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/DiscoveryClient.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/DiscoveryConfiguration.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/EmbeddedServerInstance.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/ServiceInstance.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/ServiceInstanceIdGenerator.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/ServiceInstanceList.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/StaticServiceInstanceList.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/cloud/AbstractComputeInstanceMetadata.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/cloud/ComputeInstanceMetadata.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/cloud/ComputeInstanceMetadataResolver.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/cloud/ComputeInstanceMetadataResolverUtils.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/cloud/NetworkInterface.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/cloud/digitalocean/DigitalOceanInstanceMetadata.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/cloud/digitalocean/DigitalOceanMetadataConfiguration.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/cloud/digitalocean/DigitalOceanMetadataKeys.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/cloud/digitalocean/DigitalOceanMetadataResolver.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/cloud/digitalocean/DigitalOceanNetworkInterface.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/cloud/package-info.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/config/ConfigDiscoveryConfiguration.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/config/ConfigurationClient.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/config/DefaultCompositeConfigurationClient.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/config/package-info.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/event/AbstractServiceInstanceEvent.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/event/ServiceReadyEvent.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/event/ServiceStoppedEvent.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/event/package-info.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/exceptions/DiscoveryException.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/exceptions/NoAvailableServiceException.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/exceptions/package-info.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/metadata/ServiceInstanceMetadataContributor.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/metadata/package-info.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/package-info.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/registration/AutoRegistration.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/registration/RegistrationConfiguration.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/registration/RegistrationException.java", "/workspace/discovery-core/src/main/java/io/micronaut/discovery/registration/package-info.java", "/workspace/discovery-core/src/main/java/io/micronaut/health/CurrentHealthStatus.java", "/workspace/discovery-core/src/main/java/io/micronaut/health/DefaultCurrentHealthStatus.java", "/workspace/discovery-core/src/main/java/io/micronaut/health/HealthStatus.java", "/workspace/discovery-core/src/main/java/io/micronaut/health/HeartbeatConfiguration.java", "/workspace/discovery-core/src/main/java/io/micronaut/health/HeartbeatDiscoveryClientCondition.java", "/workspace/discovery-core/src/main/java/io/micronaut/health/HeartbeatEnabled.java", "/workspace/discovery-core/src/main/java/io/micronaut/health/HeartbeatEvent.java", "/workspace/discovery-core/src/main/java/io/micronaut/health/HeartbeatTask.java", "/workspace/discovery-core/src/main/java/io/micronaut/health/package-info.java", "/workspace/function/README.md", "/workspace/function/build.gradle.kts", "/workspace/function/src/main/java/io/micronaut/function/BinaryTypeConfiguration.java", "/workspace/function/src/main/java/io/micronaut/function/DefaultLocalFunctionRegistry.java", "/workspace/function/src/main/java/io/micronaut/function/FunctionBean.java", "/workspace/function/src/main/java/io/micronaut/function/LocalFunctionRegistry.java", "/workspace/function/src/main/java/io/micronaut/function/executor/AbstractExecutor.java", "/workspace/function/src/main/java/io/micronaut/function/executor/AbstractFunctionExecutor.java", "/workspace/function/src/main/java/io/micronaut/function/executor/DefaultFunctionExitHandler.java", "/workspace/function/src/main/java/io/micronaut/function/executor/FunctionApplication.java", "/workspace/function/src/main/java/io/micronaut/function/executor/FunctionExecutor.java", "/workspace/function/src/main/java/io/micronaut/function/executor/FunctionExitHandler.java", "/workspace/function/src/main/java/io/micronaut/function/executor/FunctionInitializer.java", "/workspace/function/src/main/java/io/micronaut/function/executor/StreamFunctionExecutor.java", "/workspace/function/src/main/java/io/micronaut/function/executor/package-info.java", "/workspace/function/src/main/java/io/micronaut/function/package-info.java", "/workspace/function-client/README.md", "/workspace/function-client/build.gradle.kts", "/workspace/function-client/src/main/java/io/micronaut/function/client/DefaultFunctionDiscoveryClient.java", "/workspace/function-client/src/main/java/io/micronaut/function/client/DefaultFunctionInvokerChooser.java", "/workspace/function-client/src/main/java/io/micronaut/function/client/FunctionClient.java", "/workspace/function-client/src/main/java/io/micronaut/function/client/FunctionDefinition.java", "/workspace/function-client/src/main/java/io/micronaut/function/client/FunctionDefinitionProvider.java", "/workspace/function-client/src/main/java/io/micronaut/function/client/FunctionDiscoveryClient.java", "/workspace/function-client/src/main/java/io/micronaut/function/client/FunctionInvoker.java", "/workspace/function-client/src/main/java/io/micronaut/function/client/FunctionInvokerChooser.java", "/workspace/function-client/src/main/java/io/micronaut/function/client/aop/FunctionClientAdvice.java", "/workspace/function-client/src/main/java/io/micronaut/function/client/aop/package-info.java", "/workspace/function-client/src/main/java/io/micronaut/function/client/exceptions/FunctionException.java", "/workspace/function-client/src/main/java/io/micronaut/function/client/exceptions/FunctionExecutionException.java", "/workspace/function-client/src/main/java/io/micronaut/function/client/exceptions/FunctionNotFoundException.java", "/workspace/function-client/src/main/java/io/micronaut/function/client/exceptions/package-info.java", "/workspace/function-client/src/main/java/io/micronaut/function/client/http/HttpFunctionExecutor.java", "/workspace/function-client/src/main/java/io/micronaut/function/client/http/package-info.java", "/workspace/function-client/src/main/java/io/micronaut/function/client/local/LocalFunctionDefinitionProvider.java", "/workspace/function-client/src/main/java/io/micronaut/function/client/local/package-info.java", "/workspace/function-client/src/main/java/io/micronaut/function/client/package-info.java", "/workspace/function-web/build.gradle.kts", "/workspace/function-web/src/main/java/io/micronaut/function/web/AnnotatedFunctionRouteBuilder.java", "/workspace/function-web/src/main/java/io/micronaut/function/web/package-info.java", "/workspace/graal/README.md", "/workspace/graal/build.gradle.kts", "/workspace/graal/src/main/java/io/micronaut/graal/reflect/GraalReflectionMetadataWriter.java", "/workspace/graal/src/main/java/io/micronaut/graal/reflect/GraalTypeElementVisitor.java", "/workspace/graal/src/main/java/io/micronaut/graal/reflect/package-info.java", "/workspace/graal/src/main/resources/META-INF/services/io.micronaut.inject.visitor.TypeElementVisitor", "/workspace/gradle/libs.versions.toml", "/workspace/gradle/wrapper/gradle-wrapper.jar", "/workspace/gradle/wrapper/gradle-wrapper.properties", "/workspace/gradle.properties", "/workspace/gradlew", "/workspace/gradlew.bat", "/workspace/http/README.md", "/workspace/http/build.gradle.kts", "/workspace/http/src/main/java/io/micronaut/http/BasicAuth.java", "/workspace/http/src/main/java/io/micronaut/http/BasicHttpAttributes.java", "/workspace/http/src/main/java/io/micronaut/http/ByteBodyHttpResponse.java", "/workspace/http/src/main/java/io/micronaut/http/ByteBodyHttpResponseWrapper.java", "/workspace/http/src/main/java/io/micronaut/http/CaseInsensitiveMutableHttpHeaders.java", "/workspace/http/src/main/java/io/micronaut/http/DefaultHttpFactories.java", "/workspace/http/src/main/java/io/micronaut/http/FullHttpRequest.java", "/workspace/http/src/main/java/io/micronaut/http/HttpAttributes.java", "/workspace/http/src/main/java/io/micronaut/http/HttpHeaderValues.java", "/workspace/http/src/main/java/io/micronaut/http/HttpHeaders.java", "/workspace/http/src/main/java/io/micronaut/http/HttpMessage.java", "/workspace/http/src/main/java/io/micronaut/http/HttpMessageWrapper.java", "/workspace/http/src/main/java/io/micronaut/http/HttpMethod.java", "/workspace/http/src/main/java/io/micronaut/http/HttpParameters.java", "/workspace/http/src/main/java/io/micronaut/http/HttpRequest.java", "/workspace/http/src/main/java/io/micronaut/http/HttpRequestFactory.java", "/workspace/http/src/main/java/io/micronaut/http/HttpRequestWrapper.java", "/workspace/http/src/main/java/io/micronaut/http/HttpResponse.java", "/workspace/http/src/main/java/io/micronaut/http/HttpResponseFactory.java", "/workspace/http/src/main/java/io/micronaut/http/HttpResponseProvider.java", "/workspace/http/src/main/java/io/micronaut/http/HttpResponseWrapper.java", "/workspace/http/src/main/java/io/micronaut/http/HttpStatus.java", "/workspace/http/src/main/java/io/micronaut/http/HttpTypeConverterRegistrar.java", "/workspace/http/src/main/java/io/micronaut/http/HttpVersion.java", "/workspace/http/src/main/java/io/micronaut/http/MediaType.java", "/workspace/http/src/main/java/io/micronaut/http/MutableHttpHeaders.java", "/workspace/http/src/main/java/io/micronaut/http/MutableHttpMessage.java", "/workspace/http/src/main/java/io/micronaut/http/MutableHttpParameters.java", "/workspace/http/src/main/java/io/micronaut/http/MutableHttpRequest.java", "/workspace/http/src/main/java/io/micronaut/http/MutableHttpRequestWrapper.java", "/workspace/http/src/main/java/io/micronaut/http/MutableHttpResponse.java", "/workspace/http/src/main/java/io/micronaut/http/PushCapableHttpRequest.java", "/workspace/http/src/main/java/io/micronaut/http/ServerHttpRequest.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/Body.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/ClientFilter.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/Consumes.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/Controller.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/CookieValue.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/CustomHttpMethod.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/Delete.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/Error.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/Filter.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/FilterMatcher.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/Get.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/Head.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/Header.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/Headers.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/HttpMethodMapping.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/Options.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/Part.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/Patch.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/PathVariable.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/Post.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/Produces.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/Put.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/QueryValue.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/RequestAttribute.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/RequestAttributes.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/RequestBean.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/RequestFilter.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/ResponseFilter.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/RouteCondition.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/ServerFilter.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/Status.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/Trace.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/UriMapping.java", "/workspace/http/src/main/java/io/micronaut/http/annotation/package-info.java", "/workspace/http/src/main/java/io/micronaut/http/bind/DefaultRequestBinderRegistry.java", "/workspace/http/src/main/java/io/micronaut/http/bind/RequestBinderRegistry.java", "/workspace/http/src/main/java/io/micronaut/http/bind/binders/AnnotatedRequestArgumentBinder.java", "/workspace/http/src/main/java/io/micronaut/http/bind/binders/BodyArgumentBinder.java", "/workspace/http/src/main/java/io/micronaut/http/bind/binders/CookieAnnotationBinder.java", "/workspace/http/src/main/java/io/micronaut/http/bind/binders/CookieObjectArgumentBinder.java", "/workspace/http/src/main/java/io/micronaut/http/bind/binders/DefaultBodyAnnotationBinder.java", "/workspace/http/src/main/java/io/micronaut/http/bind/binders/DefaultUnmatchedRequestArgumentBinder.java", "/workspace/http/src/main/java/io/micronaut/http/bind/binders/HeaderAnnotationBinder.java", "/workspace/http/src/main/java/io/micronaut/http/bind/binders/MappedPendingRequestBindingResult.java", "/workspace/http/src/main/java/io/micronaut/http/bind/binders/NonBlockingBodyArgumentBinder.java", "/workspace/http/src/main/java/io/micronaut/http/bind/binders/PartAnnotationBinder.java", "/workspace/http/src/main/java/io/micronaut/http/bind/binders/PathVariableAnnotationBinder.java", "/workspace/http/src/main/java/io/micronaut/http/bind/binders/PendingRequestBindingResult.java", "/workspace/http/src/main/java/io/micronaut/http/bind/binders/PostponedRequestArgumentBinder.java", "/workspace/http/src/main/java/io/micronaut/http/bind/binders/QueryValueArgumentBinder.java", "/workspace/http/src/main/java/io/micronaut/http/bind/binders/RequestArgumentBinder.java", "/workspace/http/src/main/java/io/micronaut/http/bind/binders/RequestAttributeAnnotationBinder.java", "/workspace/http/src/main/java/io/micronaut/http/bind/binders/RequestBeanAnnotationBinder.java", "/workspace/http/src/main/java/io/micronaut/http/bind/binders/TypedRequestArgumentBinder.java", "/workspace/http/src/main/java/io/micronaut/http/bind/binders/UnmatchedRequestArgumentBinder.java", "/workspace/http/src/main/java/io/micronaut/http/bind/binders/package-info.java", "/workspace/http/src/main/java/io/micronaut/http/bind/package-info.java", "/workspace/http/src/main/java/io/micronaut/http/body/AbstractBodyAdapter.java", "/workspace/http/src/main/java/io/micronaut/http/body/AbstractMessageBodyHandlerRegistry.java", "/workspace/http/src/main/java/io/micronaut/http/body/AvailableByteBody.java", "/workspace/http/src/main/java/io/micronaut/http/body/ByteArrayBodyHandler.java", "/workspace/http/src/main/java/io/micronaut/http/body/ByteBody.java", "/workspace/http/src/main/java/io/micronaut/http/body/ByteBodyFactory.java", "/workspace/http/src/main/java/io/micronaut/http/body/ByteBodyWriter.java", "/workspace/http/src/main/java/io/micronaut/http/body/ByteBufferBodyAdapter.java", "/workspace/http/src/main/java/io/micronaut/http/body/ByteBufferBodyHandler.java", "/workspace/http/src/main/java/io/micronaut/http/body/CharSequenceBodyWriter.java", "/workspace/http/src/main/java/io/micronaut/http/body/ChunkedMessageBodyReader.java", "/workspace/http/src/main/java/io/micronaut/http/body/CloseableAvailableByteBody.java", "/workspace/http/src/main/java/io/micronaut/http/body/CloseableByteBody.java", "/workspace/http/src/main/java/io/micronaut/http/body/ConcatenatingSubscriber.java", "/workspace/http/src/main/java/io/micronaut/http/body/ContextlessMessageBodyHandlerRegistry.java", "/workspace/http/src/main/java/io/micronaut/http/body/ConversionTextPlainHandler.java", "/workspace/http/src/main/java/io/micronaut/http/body/DefaultMessageBodyHandlerRegistry.java", "/workspace/http/src/main/java/io/micronaut/http/body/InternalByteBody.java", "/workspace/http/src/main/java/io/micronaut/http/body/MediaTypeProvider.java", "/workspace/http/src/main/java/io/micronaut/http/body/MessageBodyHandler.java", "/workspace/http/src/main/java/io/micronaut/http/body/MessageBodyHandlerRegistry.java", "/workspace/http/src/main/java/io/micronaut/http/body/MessageBodyReader.java", "/workspace/http/src/main/java/io/micronaut/http/body/MessageBodyWriter.java", "/workspace/http/src/main/java/io/micronaut/http/body/ReactiveByteBufferByteBody.java", "/workspace/http/src/main/java/io/micronaut/http/body/ResponseBodyWriter.java", "/workspace/http/src/main/java/io/micronaut/http/body/ResponseBodyWriterWrapper.java", "/workspace/http/src/main/java/io/micronaut/http/body/StringBodyReader.java", "/workspace/http/src/main/java/io/micronaut/http/body/TextPlainObjectBodyReader.java", "/workspace/http/src/main/java/io/micronaut/http/body/TextPlainObjectBodyWriter.java", "/workspace/http/src/main/java/io/micronaut/http/body/TextStreamBodyWriter.java", "/workspace/http/src/main/java/io/micronaut/http/body/TypedMessageBodyHandler.java", "/workspace/http/src/main/java/io/micronaut/http/body/TypedMessageBodyReader.java", "/workspace/http/src/main/java/io/micronaut/http/body/TypedMessageBodyWriter.java", "/workspace/http/src/main/java/io/micronaut/http/body/WritableBodyWriter.java", "/workspace/http/src/main/java/io/micronaut/http/body/stream/AvailableByteArrayBody.java", "/workspace/http/src/main/java/io/micronaut/http/body/stream/BaseSharedBuffer.java", "/workspace/http/src/main/java/io/micronaut/http/body/stream/BaseStreamingByteBody.java", "/workspace/http/src/main/java/io/micronaut/http/body/stream/BodySizeLimits.java", "/workspace/http/src/main/java/io/micronaut/http/body/stream/BufferConsumer.java", "/workspace/http/src/main/java/io/micronaut/http/body/stream/ByteQueue.java", "/workspace/http/src/main/java/io/micronaut/http/body/stream/ExtendedInputStream.java", "/workspace/http/src/main/java/io/micronaut/http/body/stream/InputStreamByteBody.java", "/workspace/http/src/main/java/io/micronaut/http/body/stream/LazyUpstream.java", "/workspace/http/src/main/java/io/micronaut/http/body/stream/PublisherAsBlocking.java", "/workspace/http/src/main/java/io/micronaut/http/body/stream/PublisherAsStream.java", "/workspace/http/src/main/java/io/micronaut/http/body/stream/StreamPair.java", "/workspace/http/src/main/java/io/micronaut/http/body/stream/UpstreamBalancer.java", "/workspace/http/src/main/java/io/micronaut/http/cachecontrol/CacheControl.java", "/workspace/http/src/main/java/io/micronaut/http/cachecontrol/ResponseDirective.java", "/workspace/http/src/main/java/io/micronaut/http/codec/CodecConfiguration.java", "/workspace/http/src/main/java/io/micronaut/http/codec/CodecException.java", "/workspace/http/src/main/java/io/micronaut/http/codec/DefaultMediaTypeCodecRegistry.java", "/workspace/http/src/main/java/io/micronaut/http/codec/MediaTypeCodec.java", "/workspace/http/src/main/java/io/micronaut/http/codec/MediaTypeCodecRegistry.java", "/workspace/http/src/main/java/io/micronaut/http/codec/package-info.java", "/workspace/http/src/main/java/io/micronaut/http/context/ClientContextPathProvider.java", "/workspace/http/src/main/java/io/micronaut/http/context/ContextPathUtils.java", "/workspace/http/src/main/java/io/micronaut/http/context/ServerContextPathProvider.java", "/workspace/http/src/main/java/io/micronaut/http/context/ServerHttpRequestContext.java", "/workspace/http/src/main/java/io/micronaut/http/context/ServerRequestContext.java", "/workspace/http/src/main/java/io/micronaut/http/context/ServerRequestTracingPublisher.java", "/workspace/http/src/main/java/io/micronaut/http/context/event/HttpRequestReceivedEvent.java", "/workspace/http/src/main/java/io/micronaut/http/context/event/HttpRequestTerminatedEvent.java", "/workspace/http/src/main/java/io/micronaut/http/context/event/package-info.java", "/workspace/http/src/main/java/io/micronaut/http/context/package-info.java", "/workspace/http/src/main/java/io/micronaut/http/converters/HttpConverterRegistrar.java", "/workspace/http/src/main/java/io/micronaut/http/converters/SharedHttpConvertersRegistrar.java", "/workspace/http/src/main/java/io/micronaut/http/converters/package-info.java", "/workspace/http/src/main/java/io/micronaut/http/cookie/ClientCookieEncoder.java", "/workspace/http/src/main/java/io/micronaut/http/cookie/Cookie.java", "/workspace/http/src/main/java/io/micronaut/http/cookie/CookieComparator.java", "/workspace/http/src/main/java/io/micronaut/http/cookie/CookieConfiguration.java", "/workspace/http/src/main/java/io/micronaut/http/cookie/CookieFactory.java", "/workspace/http/src/main/java/io/micronaut/http/cookie/CookieHttpCookieAdapter.java", "/workspace/http/src/main/java/io/micronaut/http/cookie/CookieSizeExceededException.java", "/workspace/http/src/main/java/io/micronaut/http/cookie/CookieUtils.java", "/workspace/http/src/main/java/io/micronaut/http/cookie/Cookies.java", "/workspace/http/src/main/java/io/micronaut/http/cookie/DefaultClientCookieEncoder.java", "/workspace/http/src/main/java/io/micronaut/http/cookie/DefaultServerCookieDecoder.java", "/workspace/http/src/main/java/io/micronaut/http/cookie/DefaultServerCookieEncoder.java", "/workspace/http/src/main/java/io/micronaut/http/cookie/HttpCookieFactory.java", "/workspace/http/src/main/java/io/micronaut/http/cookie/SameSite.java", "/workspace/http/src/main/java/io/micronaut/http/cookie/ServerCookieDecoder.java", "/workspace/http/src/main/java/io/micronaut/http/cookie/ServerCookieEncoder.java", "/workspace/http/src/main/java/io/micronaut/http/cookie/package-info.java", "/workspace/http/src/main/java/io/micronaut/http/exceptions/BufferLengthExceededException.java", "/workspace/http/src/main/java/io/micronaut/http/exceptions/ConnectionClosedException.java", "/workspace/http/src/main/java/io/micronaut/http/exceptions/ContentLengthExceededException.java", "/workspace/http/src/main/java/io/micronaut/http/exceptions/HttpException.java", "/workspace/http/src/main/java/io/micronaut/http/exceptions/HttpStatusException.java", "/workspace/http/src/main/java/io/micronaut/http/exceptions/MessageBodyException.java", "/workspace/http/src/main/java/io/micronaut/http/exceptions/UriSyntaxException.java", "/workspace/http/src/main/java/io/micronaut/http/exceptions/package-info.java", "/workspace/http/src/main/java/io/micronaut/http/expression/RequestConditionContext.java", "/workspace/http/src/main/java/io/micronaut/http/filter/AroundLegacyFilter.java", "/workspace/http/src/main/java/io/micronaut/http/filter/BaseFilterProcessor.java", "/workspace/http/src/main/java/io/micronaut/http/filter/ClientFilterChain.java", "/workspace/http/src/main/java/io/micronaut/http/filter/ConditionalFilter.java", "/workspace/http/src/main/java/io/micronaut/http/filter/DefaultFilterEntry.java", "/workspace/http/src/main/java/io/micronaut/http/filter/FilterArgumentBinderPredicate.java", "/workspace/http/src/main/java/io/micronaut/http/filter/FilterChain.java", "/workspace/http/src/main/java/io/micronaut/http/filter/FilterContext.java", "/workspace/http/src/main/java/io/micronaut/http/filter/FilterContinuation.java", "/workspace/http/src/main/java/io/micronaut/http/filter/FilterOrder.java", "/workspace/http/src/main/java/io/micronaut/http/filter/FilterPatternStyle.java", "/workspace/http/src/main/java/io/micronaut/http/filter/FilterRunner.java", "/workspace/http/src/main/java/io/micronaut/http/filter/GenericHttpFilter.java", "/workspace/http/src/main/java/io/micronaut/http/filter/HttpClientFilter.java", "/workspace/http/src/main/java/io/micronaut/http/filter/HttpClientFilterResolver.java", "/workspace/http/src/main/java/io/micronaut/http/filter/HttpFilter.java", "/workspace/http/src/main/java/io/micronaut/http/filter/HttpFilterResolver.java", "/workspace/http/src/main/java/io/micronaut/http/filter/HttpServerFilter.java", "/workspace/http/src/main/java/io/micronaut/http/filter/HttpServerFilterResolver.java", "/workspace/http/src/main/java/io/micronaut/http/filter/InternalHttpFilter.java", "/workspace/http/src/main/java/io/micronaut/http/filter/MethodFilter.java", "/workspace/http/src/main/java/io/micronaut/http/filter/ServerFilterChain.java", "/workspace/http/src/main/java/io/micronaut/http/filter/ServerFilterPhase.java", "/workspace/http/src/main/java/io/micronaut/http/filter/package-info.java", "/workspace/http/src/main/java/io/micronaut/http/form/FormConfiguration.java", "/workspace/http/src/main/java/io/micronaut/http/form/FormConfigurationProperties.java", "/workspace/http/src/main/java/io/micronaut/http/form/FormUrlEncodedDecoder.java", "/workspace/http/src/main/java/io/micronaut/http/hateoas/AbstractResource.java", "/workspace/http/src/main/java/io/micronaut/http/hateoas/DefaultLink.java", "/workspace/http/src/main/java/io/micronaut/http/hateoas/GenericResource.java", "/workspace/http/src/main/java/io/micronaut/http/hateoas/JsonError.java", "/workspace/http/src/main/java/io/micronaut/http/hateoas/Link.java", "/workspace/http/src/main/java/io/micronaut/http/hateoas/Resource.java", "/workspace/http/src/main/java/io/micronaut/http/hateoas/VndError.java", "/workspace/http/src/main/java/io/micronaut/http/hateoas/package-info.java", "/workspace/http/src/main/java/io/micronaut/http/multipart/CompletedFileUpload.java", "/workspace/http/src/main/java/io/micronaut/http/multipart/CompletedPart.java", "/workspace/http/src/main/java/io/micronaut/http/multipart/FileUpload.java", "/workspace/http/src/main/java/io/micronaut/http/multipart/MultipartException.java", "/workspace/http/src/main/java/io/micronaut/http/multipart/PartData.java", "/workspace/http/src/main/java/io/micronaut/http/multipart/StreamingFileUpload.java", "/workspace/http/src/main/java/io/micronaut/http/multipart/package-info.java", "/workspace/http/src/main/java/io/micronaut/http/package-info.java", "/workspace/http/src/main/java/io/micronaut/http/reactive/execution/FlowAsMono.java", "/workspace/http/src/main/java/io/micronaut/http/reactive/execution/ReactiveExecutionFlow.java", "/workspace/http/src/main/java/io/micronaut/http/reactive/execution/ReactorExecutionFlowImpl.java", "/workspace/http/src/main/java/io/micronaut/http/resource/ResourceLoaderFactory.java", "/workspace/http/src/main/java/io/micronaut/http/resource/package-info.java", "/workspace/http/src/main/java/io/micronaut/http/simple/SimpleHttpHeaders.java", "/workspace/http/src/main/java/io/micronaut/http/simple/SimpleHttpParameters.java", "/workspace/http/src/main/java/io/micronaut/http/simple/SimpleHttpRequest.java", "/workspace/http/src/main/java/io/micronaut/http/simple/SimpleHttpRequestFactory.java", "/workspace/http/src/main/java/io/micronaut/http/simple/SimpleHttpResponse.java", "/workspace/http/src/main/java/io/micronaut/http/simple/SimpleHttpResponseFactory.java", "/workspace/http/src/main/java/io/micronaut/http/simple/cookies/SimpleCookie.java", "/workspace/http/src/main/java/io/micronaut/http/simple/cookies/SimpleCookieFactory.java", "/workspace/http/src/main/java/io/micronaut/http/simple/cookies/SimpleCookies.java", "/workspace/http/src/main/java/io/micronaut/http/simple/cookies/package-info.java", "/workspace/http/src/main/java/io/micronaut/http/simple/package-info.java", "/workspace/http/src/main/java/io/micronaut/http/sse/DefaultEvent.java", "/workspace/http/src/main/java/io/micronaut/http/sse/Event.java", "/workspace/http/src/main/java/io/micronaut/http/sse/package-info.java", "/workspace/http/src/main/java/io/micronaut/http/ssl/AbstractCertificateFileConfig.java", "/workspace/http/src/main/java/io/micronaut/http/ssl/AbstractClientSslConfiguration.java", "/workspace/http/src/main/java/io/micronaut/http/ssl/CertificateProvider.java", "/workspace/http/src/main/java/io/micronaut/http/ssl/ClientAuthentication.java", "/workspace/http/src/main/java/io/micronaut/http/ssl/ClientSslConfiguration.java", "/workspace/http/src/main/java/io/micronaut/http/ssl/DefaultSslConfiguration.java", "/workspace/http/src/main/java/io/micronaut/http/ssl/FileCertificateProvider.java", "/workspace/http/src/main/java/io/micronaut/http/ssl/PemParser.java", "/workspace/http/src/main/java/io/micronaut/http/ssl/ResourceCertificateProvider.java", "/workspace/http/src/main/java/io/micronaut/http/ssl/SelfSignedCertificateProvider.java", "/workspace/http/src/main/java/io/micronaut/http/ssl/ServerSslConfiguration.java", "/workspace/http/src/main/java/io/micronaut/http/ssl/SslBuilder.java", "/workspace/http/src/main/java/io/micronaut/http/ssl/SslConfiguration.java", "/workspace/http/src/main/java/io/micronaut/http/ssl/SslConfigurationException.java", "/workspace/http/src/main/java/io/micronaut/http/ssl/package-info.java", "/workspace/http/src/main/java/io/micronaut/http/uri/DefaultFormUrlEncodedDecoder.java", "/workspace/http/src/main/java/io/micronaut/http/uri/DefaultUriBuilder.java", "/workspace/http/src/main/java/io/micronaut/http/uri/DefaultUriMatchInfo.java", "/workspace/http/src/main/java/io/micronaut/http/uri/QueryStringDecoder.java", "/workspace/http/src/main/java/io/micronaut/http/uri/UriBuilder.java", "/workspace/http/src/main/java/io/micronaut/http/uri/UriMatchInfo.java", "/workspace/http/src/main/java/io/micronaut/http/uri/UriMatchTemplate.java", "/workspace/http/src/main/java/io/micronaut/http/uri/UriMatchVariable.java", "/workspace/http/src/main/java/io/micronaut/http/uri/UriMatcher.java", "/workspace/http/src/main/java/io/micronaut/http/uri/UriTemplate.java", "/workspace/http/src/main/java/io/micronaut/http/uri/UriTemplateExpander.java", "/workspace/http/src/main/java/io/micronaut/http/uri/UriTemplateMatcher.java", "/workspace/http/src/main/java/io/micronaut/http/uri/UriTemplateParser.java", "/workspace/http/src/main/java/io/micronaut/http/uri/UriTypeMatchTemplate.java", "/workspace/http/src/main/java/io/micronaut/http/uri/package-info.java", "/workspace/http/src/main/java/io/micronaut/http/util/HtmlEntityEncodingHtmlSanitizer.java", "/workspace/http/src/main/java/io/micronaut/http/util/HtmlSanitizer.java", "/workspace/http/src/main/java/io/micronaut/http/util/HttpHeadersUtil.java", "/workspace/http/src/main/java/io/micronaut/http/util/HttpTypeInformationProvider.java", "/workspace/http/src/main/java/io/micronaut/http/util/HttpUtil.java", "/workspace/http/src/main/java/io/micronaut/http/util/OutgoingHttpRequestProcessor.java", "/workspace/http/src/main/java/io/micronaut/http/util/OutgoingHttpRequestProcessorImpl.java", "/workspace/http/src/main/java/io/micronaut/http/util/OutgoingRequestProcessorMatcher.java", "/workspace/http/src/main/java/io/micronaut/http/util/package-info.java", "/workspace/http/src/main/java/io/micronaut/runtime/http/codec/MediaTypeCodecRegistryFactory.java", "/workspace/http/src/main/java/io/micronaut/runtime/http/codec/TextPlainCodec.java", "/workspace/http/src/main/java/io/micronaut/runtime/http/codec/package-info.java", "/workspace/http/src/main/java/io/micronaut/runtime/http/scope/RequestAware.java", "/workspace/http/src/main/java/io/micronaut/runtime/http/scope/RequestCustomScope.java", "/workspace/http/src/main/java/io/micronaut/runtime/http/scope/RequestScope.java", "/workspace/http/src/main/kotlin/io/micronaut/http/bind/binders/ContinuationArgumentBinder.kt", "/workspace/http/src/main/kotlin/io/micronaut/http/bind/binders/HttpCoroutineContextFactory.kt", "/workspace/http/src/main/resources/META-INF/http/mime.types", "/workspace/http/src/main/resources/META-INF/native-image/io.micronaut.http/micronaut-http/resource-config.json", "/workspace/http/src/main/resources/META-INF/native-image/io.micronaut.http.hateoas/reflect-config.json", "/workspace/http/src/main/resources/META-INF/services/io.micronaut.core.convert.TypeConverterRegistrar", "/workspace/http/src/main/resources/META-INF/services/io.micronaut.core.type.TypeInformationProvider", "/workspace/http-client/README.md", "/workspace/http-client/build.gradle.kts", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/BlockHint.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/CancellableMonoSink.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/CompositeNettyClientCustomizer.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/ConnectionManager.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/DefaultHttpClient.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/DefaultHttpClientBuilder.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/DefaultNettyHttpClientRegistry.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/FullNettyClientHttpResponse.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/Http1ResponseHandler.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/Http2PingSender.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/InitialConnectionErrorHandler.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/MicronautFlux.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/NettyClientByteBodyResponse.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/NettyClientCustomizer.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/NettyClientHttpRequest.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/NettyClientHttpRequestFactory.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/NettyHttpClientFactory.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/NettyStreamedHttpResponse.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/Pool.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/Pool40.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/Pool49.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/PoolSink.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/RawHttpRequestWrapper.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/SimpleChannelInboundHandlerInstrumented.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/SseSplitter.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/StreamWriter.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/converters/package-info.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/package-info.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/ssl/ClientSslBuilder.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/ssl/NettyClientSslBuilder.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/ssl/NettyClientSslFactory.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/ssl/package-info.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/websocket/NettyWebSocketClientHandler.java", "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/websocket/package-info.java", "/workspace/http-client/src/main/resources/META-INF/services/io.micronaut.http.HttpRequestFactory", "/workspace/http-client/src/main/resources/META-INF/services/io.micronaut.http.client.HttpClientFactory", "/workspace/http-client/src/main/resources/META-INF/services/io.micronaut.http.client.ProxyHttpClientFactory", "/workspace/http-client/src/main/resources/META-INF/services/io.micronaut.http.client.RawHttpClientFactory", "/workspace/http-client/src/main/resources/META-INF/services/io.micronaut.http.client.StreamingHttpClientFactory", "/workspace/http-client/src/main/resources/META-INF/services/io.micronaut.http.client.sse.SseClientFactory", "/workspace/http-client/src/main/resources/META-INF/services/io.micronaut.websocket.WebSocketClientFactory", "/workspace/http-client-core/README.md", "/workspace/http-client-core/build.gradle.kts", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/AbstractHttpClientFactory.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/BlockingHttpClient.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/ClientAttributes.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/DefaultHttpClientConfiguration.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/DefaultLoadBalancerResolver.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/HttpClient.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/HttpClientConfiguration.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/HttpClientFactory.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/HttpClientFactoryResolver.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/HttpClientRegistry.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/HttpVersionSelection.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/LoadBalancer.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/LoadBalancerResolver.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/ProxyHttpClient.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/ProxyHttpClientFactory.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/ProxyHttpClientFactoryResolver.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/ProxyHttpClientRegistry.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/ProxyRequestOptions.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/RawHttpClient.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/RawHttpClientFactory.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/RawHttpClientFactoryResolver.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/RawHttpClientRegistry.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/ReactiveClientResultTransformer.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/ServiceHttpClientCondition.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/ServiceHttpClientConfiguration.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/ServiceHttpClientFactory.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/StreamingHttpClient.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/StreamingHttpClientFactory.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/StreamingHttpClientFactoryResolver.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/StreamingHttpClientRegistry.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/annotation/Client.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/annotation/package-info.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/bind/AnnotatedClientArgumentRequestBinder.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/bind/AnnotatedClientRequestBinder.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/bind/ClientArgumentRequestBinder.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/bind/ClientRequestBinder.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/bind/ClientRequestUriContext.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/bind/DefaultHttpClientBinderRegistry.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/bind/HttpClientBinderRegistry.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/bind/TypedClientArgumentRequestBinder.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/bind/binders/AttributeClientRequestBinder.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/bind/binders/HeaderClientRequestBinder.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/bind/binders/QueryValueClientArgumentRequestBinder.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/bind/binders/VersionClientRequestBinder.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/exceptions/ContentLengthExceededException.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/exceptions/EmptyResponseException.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/exceptions/HttpClientErrorDecoder.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/exceptions/HttpClientException.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/exceptions/HttpClientExceptionUtils.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/exceptions/HttpClientResponseException.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/exceptions/NoHostException.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/exceptions/ReadTimeoutException.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/exceptions/ResponseClosedException.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/exceptions/package-info.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/filter/ClientFilterResolutionContext.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/filter/DefaultHttpClientFilterResolver.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/filters/package-info.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/interceptor/HttpClientIntroductionAdvice.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/interceptor/configuration/ClientVersioningConfiguration.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/interceptor/configuration/DefaultClientVersioningConfiguration.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/interceptor/configuration/NamedClientVersioningConfiguration.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/interceptor/configuration/package-info.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/interceptor/package-info.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/loadbalance/AbstractRoundRobinLoadBalancer.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/loadbalance/DiscoveryClientLoadBalancerFactory.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/loadbalance/DiscoveryClientRoundRobinLoadBalancer.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/loadbalance/FixedLoadBalancer.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/loadbalance/LoadBalancerConverters.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/loadbalance/ServiceInstanceListLoadBalancerFactory.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/loadbalance/ServiceInstanceListRoundRobinLoadBalancer.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/loadbalance/package-info.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/multipart/AbstractFilePart.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/multipart/BytePart.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/multipart/FilePart.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/multipart/InputStreamPart.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/multipart/MultipartBody.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/multipart/MultipartDataFactory.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/multipart/Part.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/multipart/StringPart.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/multipart/package-info.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/package-info.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/sse/SseClient.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/sse/SseClientFactory.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/sse/SseClientFactoryResolver.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/sse/SseClientRegistry.java", "/workspace/http-client-core/src/main/java/io/micronaut/http/client/sse/package-info.java", "/workspace/http-client-core/src/main/resources/META-INF/services/io.micronaut.core.convert.TypeConverterRegistrar", "/workspace/http-client-jdk/build.gradle.kts", "/workspace/http-client-jdk/src/main/java/io/micronaut/http/client/jdk/AbstractJdkHttpClient.java", "/workspace/http-client-jdk/src/main/java/io/micronaut/http/client/jdk/BaseHttpResponseAdapter.java", "/workspace/http-client-jdk/src/main/java/io/micronaut/http/client/jdk/ByteBodySubscriber.java", "/workspace/http-client-jdk/src/main/java/io/micronaut/http/client/jdk/DefaultJdkHttpClient.java", "/workspace/http-client-jdk/src/main/java/io/micronaut/http/client/jdk/DefaultJdkHttpClientRegistry.java", "/workspace/http-client-jdk/src/main/java/io/micronaut/http/client/jdk/HttpHeadersAdapter.java", "/workspace/http-client-jdk/src/main/java/io/micronaut/http/client/jdk/HttpRequestFactory.java", "/workspace/http-client-jdk/src/main/java/io/micronaut/http/client/jdk/HttpResponseAdapter.java", "/workspace/http-client-jdk/src/main/java/io/micronaut/http/client/jdk/JdkBlockingHttpClient.java", "/workspace/http-client-jdk/src/main/java/io/micronaut/http/client/jdk/JdkClientSslBuilder.java", "/workspace/http-client-jdk/src/main/java/io/micronaut/http/client/jdk/JdkHttpClient.java", "/workspace/http-client-jdk/src/main/java/io/micronaut/http/client/jdk/JdkHttpClientFactory.java", "/workspace/http-client-jdk/src/main/java/io/micronaut/http/client/jdk/JdkRawHttpClient.java", "/workspace/http-client-jdk/src/main/java/io/micronaut/http/client/jdk/RawHttpRequestWrapper.java", "/workspace/http-client-jdk/src/main/java/io/micronaut/http/client/jdk/cookie/CompositeCookieDecoder.java", "/workspace/http-client-jdk/src/main/java/io/micronaut/http/client/jdk/cookie/CookieDecoder.java", "/workspace/http-client-jdk/src/main/java/io/micronaut/http/client/jdk/cookie/DefaultCookieDecoder.java", "/workspace/http-client-jdk/src/main/java/io/micronaut/http/client/jdk/cookie/NettyCookieDecoder.java", "/workspace/http-client-jdk/src/main/resources/META-INF/services/io.micronaut.http.client.HttpClientFactory", "/workspace/http-client-jdk/src/main/resources/META-INF/services/io.micronaut.http.client.RawHttpClientFactory", "/workspace/http-client-tck/build.gradle.kts", "/workspace/http-netty/build.gradle.kts", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/AbstractCompositeCustomizer.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/EventLoopFlow.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/NettyHttpHeaders.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/NettyHttpParameters.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/NettyHttpRequestBuilder.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/NettyHttpResponseBuilder.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/NettyMutableHttpResponse.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/NettySslContextBuilder.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/NettyTlsUtils.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/SslContextAutoLoader.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/SslContextHolder.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/body/AvailableNettyByteBody.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/body/JsonChunkedProcessor.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/body/JsonCounter.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/body/NettyBodyAdapter.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/body/NettyByteBodyFactory.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/body/NettyByteBufMessageBodyHandler.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/body/NettyJsonHandler.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/body/NettyJsonStreamHandler.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/body/NettyWriteContext.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/body/StreamingNettyByteBody.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/ChannelPipelineCustomizer.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/ChannelPipelineListener.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/DefaultEventLoopGroupConfiguration.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/DefaultEventLoopGroupFactory.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/DefaultEventLoopGroupRegistry.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/EpollAvailabilityCondition.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/EpollEventLoopGroupFactory.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/EventLoopGroupConfiguration.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/EventLoopGroupFactory.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/EventLoopGroupRegistry.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/IoUringAvailabilityCondition.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/IoUringEventLoopGroupFactory.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/KQueueAvailabilityCondition.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/KQueueEventLoopGroupFactory.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/NettyChannelType.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/NettyThreadFactory.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/NioEventLoopGroupFactory.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/converters/ChannelOptionFactory.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/converters/DefaultChannelOptionFactory.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/converters/EpollChannelOptionFactory.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/converters/KQueueChannelOptionFactory.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/loom/DelegateIoHandler.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/loom/EventLoopLoomFactory.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/loom/EventLoopVirtualThreadScheduler.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/loom/LoomBranchSupport.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/loom/LoomCarrierConfiguration.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/loom/LoomCarrierGroup.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/loom/PrivateLoomSupport.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/channel/package-info.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/configuration/NettyGlobalConfiguration.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/content/HttpContentUtil.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/content/package-info.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/cookies/NettyCookie.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/cookies/NettyCookieFactory.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/cookies/NettyCookies.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/cookies/NettyLaxClientCookieEncoder.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/cookies/NettyLaxServerCookieDecoder.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/cookies/NettyServerCookieEncoder.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/cookies/package-info.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/package-info.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/reactive/HandlerSubscriber.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/reactive/HotObservable.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/reactive/package-info.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/stream/DefaultStreamedHttpRequest.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/stream/DefaultStreamedHttpResponse.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/stream/DefaultWebSocketHttpResponse.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/stream/DelegateHttpMessage.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/stream/DelegateHttpRequest.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/stream/DelegateHttpResponse.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/stream/DelegateStreamedHttpRequest.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/stream/DelegateStreamedHttpResponse.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/stream/EmptyHttpRequest.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/stream/JsonSubscriber.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/stream/StreamedHttpMessage.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/stream/StreamedHttpRequest.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/stream/StreamedHttpResponse.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/stream/WebSocketHttpResponse.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/stream/package-info.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/websocket/AbstractNettyWebSocketHandler.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/websocket/NettyServerWebSocketBroadcaster.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/websocket/NettyWebSocketSession.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/websocket/WebSocketMessageEncoder.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/websocket/WebSocketSessionRepository.java", "/workspace/http-netty/src/main/java/io/micronaut/http/netty/websocket/package-info.java", "/workspace/http-netty/src/main/resources/META-INF/native-image/io.micronaut.micronaut.http.netty/native-image.properties", "/workspace/http-netty/src/main/resources/META-INF/native-image/io.micronaut.micronaut.http.netty/reflect-config.json", "/workspace/http-netty/src/main/resources/META-INF/services/io.micronaut.http.cookie.ClientCookieEncoder", "/workspace/http-netty/src/main/resources/META-INF/services/io.micronaut.http.cookie.CookieFactory", "/workspace/http-netty/src/main/resources/META-INF/services/io.micronaut.http.cookie.ServerCookieDecoder", "/workspace/http-netty/src/main/resources/META-INF/services/io.micronaut.http.cookie.ServerCookieEncoder", "/workspace/http-netty-http3/build.gradle.kts", "/workspace/http-server/build.gradle.kts", "/workspace/http-server/src/main/java/io/micronaut/http/server/CoroutineHelper.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/ExecutableRouteInfo.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/HttpServerConfiguration.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/HttpServerTypeConvertersRegistrar.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/OptionsFilter.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/RequestLifecycle.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/ResponseLifecycle.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/RouteExecutor.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/annotation/PreMatching.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/binding/BasicAuthArgumentBinder.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/binding/LocaleArgumentBinder.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/binding/RequestArgumentSatisfier.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/binding/RouteInfoArgumentBinder.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/binding/RouteMatchArgumentBinder.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/binding/package-info.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/body/AbstractFileBodyWriter.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/body/FileBodyWriter.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/body/InputStreamBodyWriter.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/body/StreamFileBodyWriter.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/body/SystemFileBodyWriter.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/codec/TextStreamCodec.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/codec/package-info.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/cors/CorsFilter.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/cors/CorsOriginConfiguration.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/cors/CorsOriginConverter.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/cors/CorsUtil.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/cors/CrossOrigin.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/cors/CrossOriginUtil.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/cors/package-info.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/BaseJsonExceptionHandler.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/BufferLengthExceededHandler.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/ContentLengthExceededHandler.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/ConversionErrorHandler.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/CookieSizeExceededHandler.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/DuplicateRouteHandler.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/ErrorExceptionHandler.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/ErrorResponseProcessorExceptionHandler.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/ExceptionHandler.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/HttpServerException.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/HttpStatusHandler.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/InternalServerException.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/JacksonExceptionHandler.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/JsonExceptionHandler.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/NotAcceptableException.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/NotAllowedException.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/NotAllowedExceptionHandler.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/NotFoundException.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/NotWebSocketRequestException.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/ServerStartupException.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/URISyntaxHandler.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/UnsatisfiedArgumentHandler.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/UnsatisfiedRouteHandler.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/UnsupportedMediaException.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/package-info.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/response/DefaultErrorContext.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/response/DefaultErrorResponseProcessor.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/response/DefaultHtmlErrorResponseBodyProvider.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/response/DefaultJsonErrorResponseBodyProvider.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/response/Error.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/response/ErrorContext.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/response/ErrorResponseBodyProvider.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/response/ErrorResponseProcessor.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/response/HateoasErrorResponseProcessor.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/response/HtmlErrorResponseBodyProvider.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/exceptions/response/JsonErrorResponseBodyProvider.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/filter/DefaultFilterBodyParser.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/filter/FilterBodyParser.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/filter/package-info.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/multipart/MultipartBody.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/multipart/package-info.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/package-info.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/types/CustomizableResponseType.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/types/files/FileCustomizableResponseType.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/types/files/StreamedFile.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/types/files/SystemFile.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/types/files/package-info.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/types/package-info.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/util/DefaultHttpClientAddressResolver.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/util/DefaultHttpHostResolver.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/util/HttpClientAddressResolver.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/util/HttpHostResolver.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/util/ProxyHeaderParser.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/util/locale/CompositeHttpLocaleResolver.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/util/locale/CookieLocaleResolver.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/util/locale/HttpAbstractLocaleResolver.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/util/locale/HttpFixedLocaleResolver.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/util/locale/HttpLocaleResolutionConfiguration.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/util/locale/HttpLocaleResolver.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/util/locale/HttpLocalizedMessageSource.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/util/locale/RequestLocaleResolver.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/util/locale/package-info.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/util/package-info.java", "/workspace/http-server/src/main/java/io/micronaut/http/server/websocket/ServerWebSocketProcessor.java", "/workspace/http-server/src/main/resources/META-INF/native-image/io.micronaut/micronaut-http-server/native-image.properties", "/workspace/http-server/src/main/resources/META-INF/services/io.micronaut.core.convert.TypeConverterRegistrar", "/workspace/http-server-netty/build.gradle.kts", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/AbstractNettyHttpRequest.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/ByteBufDelegate.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/CompositeNettyServerCustomizer.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/DefaultHttpCompressionStrategy.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/DefaultHttpContentProcessor.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/DefaultNettyEmbeddedServerFactory.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/DelegateHttpMessage.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/DelegateHttpResponse.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/DelegateNettyEmbeddedServices.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/DelegateStreamedHttpResponse.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/FormDataHttpContentProcessor.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/FormRouteCompleter.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/HttpCompressionStrategy.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/HttpContentProcessor.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/HttpContentProcessorAsReactiveProcessor.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/HttpContentSubscriberFactory.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/HttpPipelineBuilder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/HttpToHttpsRedirectHandler.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/IdentityWrapper.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/MicronautHttpData.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/NettyEmbeddedServer.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/NettyEmbeddedServerFactory.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/NettyEmbeddedServices.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/NettyHttpRequest.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/NettyHttpResponseFactory.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/NettyHttpServer.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/NettyRequestArgumentSatisfier.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/NettyRequestLifecycle.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/NettyResponseLifecycle.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/NettyServerCustomizer.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/NonReentrantLock.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/QuicTokenHandlerImpl.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/RoutingInBoundHandler.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/async/package-info.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/binders/NettyBodyAnnotationBinder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/binders/NettyCompletableFutureBodyBinder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/binders/NettyCompletedFileUploadBinder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/binders/NettyInputStreamBodyBinder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/binders/NettyPartUploadAnnotationBinder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/binders/NettyPublisherBodyBinder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/binders/NettyPublisherPartUploadBinder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/binders/NettyRequestArgumentBinder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/binders/NettyServerRequestBinderRegistry.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/binders/NettyStreamingFileUploadBinder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/binders/StreamedNettyRequestArgumentBinder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/binders/package-info.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/configuration/NettyHttpServerConfiguration.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/configuration/package-info.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/converters/NettyConverters.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/converters/NettyConvertersSpi.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/converters/package-info.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/decoders/package-info.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/discovery/NettyEmbeddedServerInstance.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/discovery/NettyServiceDiscovery.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/encoders/package-info.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/ChannelOutboundHandlerFactory.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/Compressor.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/Http1RequestEvent.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/Http2RequestEvent.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/Http2ServerHandler.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/HttpRequestEvent.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/MultiplexedServerHandler.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/OutboundAccess.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/PipeliningServerHandler.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/RequestHandler.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/Http2AccessLogConnectionEncoder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/Http2AccessLogFrameListener.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/Http2AccessLogManager.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/HttpAccessLogHandler.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/AbstractHttpMessageLogElement.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/AccessLog.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/AccessLogFormatParser.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/BytesSentElement.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/BytesSentElementBuilder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/ConnectionMetadata.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/ConnectionMetadataImpl.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/ConstantElement.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/CookieElement.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/CookieElementBuilder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/CookiesElement.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/DateTimeElement.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/DateTimeElementBuilder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/ElapseTimeElement.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/ElapseTimeElementBuilder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/HeaderElement.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/HeaderElementBuilder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/HeadersElement.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/LocalHostElement.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/LocalHostElementBuilder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/LocalIpElement.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/LocalIpElementBuilder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/LocalPortElement.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/LocalPortElementBuilder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/LogElement.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/LogElementBuilder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/NotImplementedElementBuilder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/RemoteHostElement.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/RemoteHostElementBuilder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/RemoteIpElement.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/RemoteIpElementBuilder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/RequestLineElement.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/RequestLineElementBuilder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/RequestMethodElement.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/RequestMethodElementBuilder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/RequestProtocolElement.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/RequestProtocolElementBuilder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/RequestUriElement.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/RequestUriElementBuilder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/ResponseCodeElement.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/accesslog/element/ResponseCodeElementBuilder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/handler/package-info.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/multipart/MultipartBodyArgumentBinder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/multipart/NettyCompletedAttribute.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/multipart/NettyCompletedFileUpload.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/multipart/NettyFileUploadInputStream.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/multipart/NettyPartData.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/multipart/NettyStreamingFileUpload.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/multipart/package-info.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/package-info.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/ssl/AbstractServerSslBuilder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/ssl/BuildSelfSignedCondition.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/ssl/CertificateProvidedSslBuilder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/ssl/NettyServerSslFactory.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/ssl/SelfSignedSslBuilder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/ssl/ServerSslBuilder.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/ssl/SslEnabledCondition.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/ssl/package-info.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/websocket/NettyServerWebSocketHandler.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/websocket/NettyServerWebSocketUpgradeHandler.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/websocket/WebSocketUpgradeHandlerFactory.java", "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/websocket/package-info.java", "/workspace/http-server-netty/src/main/resources/META-INF/services/io.micronaut.core.convert.TypeConverterRegistrar", "/workspace/http-server-netty/src/main/resources/META-INF/services/io.micronaut.http.HttpResponseFactory", "/workspace/http-server-netty/src/main/resources/META-INF/services/io.micronaut.http.server.netty.handler.accesslog.element.LogElementBuilder", "/workspace/http-server-tck/build.gradle.kts", "/workspace/http-server-tck/src/main/java/io/micronaut/http/server/tck/CorsAssertion.java", "/workspace/http-server-tck/src/main/java/io/micronaut/http/server/tck/CorsUtils.java", "/workspace/http-server-tck/src/main/resources/assets/hello.txt", "/workspace/http-tck/build.gradle.kts", "/workspace/http-tck/src/main/java/io/micronaut/http/tck/AssertionUtils.java", "/workspace/http-tck/src/main/java/io/micronaut/http/tck/BodyAssertion.java", "/workspace/http-tck/src/main/java/io/micronaut/http/tck/EmbeddedHttp2ServerUnderTestProvider.java", "/workspace/http-tck/src/main/java/io/micronaut/http/tck/EmbeddedServerUnderTest.java", "/workspace/http-tck/src/main/java/io/micronaut/http/tck/EmbeddedServerUnderTestProvider.java", "/workspace/http-tck/src/main/java/io/micronaut/http/tck/HttpResponseAssertion.java", "/workspace/http-tck/src/main/java/io/micronaut/http/tck/RequestSupplier.java", "/workspace/http-tck/src/main/java/io/micronaut/http/tck/ServerUnderTest.java", "/workspace/http-tck/src/main/java/io/micronaut/http/tck/ServerUnderTestProvider.java", "/workspace/http-tck/src/main/java/io/micronaut/http/tck/ServerUnderTestProviderUtils.java", "/workspace/http-tck/src/main/java/io/micronaut/http/tck/TestScenario.java", "/workspace/http-tck/src/main/java/io/micronaut/http/tck/netty/LeakDetectionExtension.java", "/workspace/http-tck/src/main/java/io/micronaut/http/tck/netty/TestLeakDetector.java", "/workspace/http-tck/src/main/resources/META-INF/native-image/io.micronaut.http.tck/micronaut-http-tck/native-image.properties", "/workspace/http-tck/src/main/resources/META-INF/services/org.junit.jupiter.api.extension.Extension", "/workspace/http-validation/build.gradle.kts", "/workspace/http-validation/src/main/java/io/micronaut/validation/routes/FilterVisitor.java", "/workspace/http-validation/src/main/java/io/micronaut/validation/routes/RouteParameterElement.java", "/workspace/http-validation/src/main/java/io/micronaut/validation/routes/RouteValidationResult.java", "/workspace/http-validation/src/main/java/io/micronaut/validation/routes/RouteValidationVisitor.java", "/workspace/http-validation/src/main/java/io/micronaut/validation/routes/package-info.java", "/workspace/http-validation/src/main/java/io/micronaut/validation/routes/rules/ClientTypesRule.java", "/workspace/http-validation/src/main/java/io/micronaut/validation/routes/rules/MissingParameterRule.java", "/workspace/http-validation/src/main/java/io/micronaut/validation/routes/rules/NullableParameterRule.java", "/workspace/http-validation/src/main/java/io/micronaut/validation/routes/rules/RequestBeanParameterRule.java", "/workspace/http-validation/src/main/java/io/micronaut/validation/routes/rules/RouteValidationRule.java", "/workspace/http-validation/src/main/java/io/micronaut/validation/routes/rules/package-info.java", "/workspace/http-validation/src/main/java/io/micronaut/validation/websocket/WebSocketVisitor.java", "/workspace/http-validation/src/main/java/io/micronaut/validation/websocket/package-info.java", "/workspace/http-validation/src/main/resources/META-INF/services/io.micronaut.inject.visitor.TypeElementVisitor", "/workspace/inject/README.md", "/workspace/inject/build.gradle.kts", "/workspace/inject/config/application.yml", "/workspace/inject/custom-config/application-env1.yml", "/workspace/inject/custom-config/application-env2.yml", "/workspace/inject/custom-config/application.yml", "/workspace/inject/custom-config/bootstrap.yml", "/workspace/inject/src/main/java/io/micronaut/context/AbstractBeanConfiguration.java", "/workspace/inject/src/main/java/io/micronaut/context/AbstractBeanContextConditional.java", "/workspace/inject/src/main/java/io/micronaut/context/AbstractBeanDefinitionBeanConstructor.java", "/workspace/inject/src/main/java/io/micronaut/context/AbstractBeanResolutionContext.java", "/workspace/inject/src/main/java/io/micronaut/context/AbstractExecutable.java", "/workspace/inject/src/main/java/io/micronaut/context/AbstractExecutableMethod.java", "/workspace/inject/src/main/java/io/micronaut/context/AbstractExecutableMethodsDefinition.java", "/workspace/inject/src/main/java/io/micronaut/context/AbstractInitializableBeanDefinition.java", "/workspace/inject/src/main/java/io/micronaut/context/AbstractInitializableBeanDefinitionAndReference.java", "/workspace/inject/src/main/java/io/micronaut/context/AbstractInitializableBeanDefinitionReference.java", "/workspace/inject/src/main/java/io/micronaut/context/AbstractLocalizedMessageSource.java", "/workspace/inject/src/main/java/io/micronaut/context/AbstractMessageSource.java", "/workspace/inject/src/main/java/io/micronaut/context/AnnotationProcessorListener.java", "/workspace/inject/src/main/java/io/micronaut/context/AnnotationReflectionUtils.java", "/workspace/inject/src/main/java/io/micronaut/context/ApplicationContext.java", "/workspace/inject/src/main/java/io/micronaut/context/ApplicationContextBuilder.java", "/workspace/inject/src/main/java/io/micronaut/context/ApplicationContextConfiguration.java", "/workspace/inject/src/main/java/io/micronaut/context/ApplicationContextConfigurationDelegate.java", "/workspace/inject/src/main/java/io/micronaut/context/ApplicationContextConfigurer.java", "/workspace/inject/src/main/java/io/micronaut/context/ApplicationContextLifeCycle.java", "/workspace/inject/src/main/java/io/micronaut/context/ApplicationContextProvider.java", "/workspace/inject/src/main/java/io/micronaut/context/BeanContext.java", "/workspace/inject/src/main/java/io/micronaut/context/BeanContextConfigurable.java", "/workspace/inject/src/main/java/io/micronaut/context/BeanContextConfiguration.java", "/workspace/inject/src/main/java/io/micronaut/context/BeanDefinitionAware.java", "/workspace/inject/src/main/java/io/micronaut/context/BeanDefinitionDelegate.java", "/workspace/inject/src/main/java/io/micronaut/context/BeanDefinitionRegistry.java", "/workspace/inject/src/main/java/io/micronaut/context/BeanDefinitionsProvider.java", "/workspace/inject/src/main/java/io/micronaut/context/BeanDisposingRegistration.java", "/workspace/inject/src/main/java/io/micronaut/context/BeanLocator.java", "/workspace/inject/src/main/java/io/micronaut/context/BeanProvider.java", "/workspace/inject/src/main/java/io/micronaut/context/BeanRegistration.java", "/workspace/inject/src/main/java/io/micronaut/context/BeanResolutionContext.java", "/workspace/inject/src/main/java/io/micronaut/context/BeanResolutionTraceConfiguration.java", "/workspace/inject/src/main/java/io/micronaut/context/BeanResolutionTraceMode.java", "/workspace/inject/src/main/java/io/micronaut/context/BeanResolutionTracer.java", "/workspace/inject/src/main/java/io/micronaut/context/BootstrapContextAccess.java", "/workspace/inject/src/main/java/io/micronaut/context/ConfigurableApplicationContext.java", "/workspace/inject/src/main/java/io/micronaut/context/ConfigurableBeanContext.java", "/workspace/inject/src/main/java/io/micronaut/context/ConsoleBeanResolutionTracer.java", "/workspace/inject/src/main/java/io/micronaut/context/DefaultApplicationContext.java", "/workspace/inject/src/main/java/io/micronaut/context/DefaultApplicationContextBuilder.java", "/workspace/inject/src/main/java/io/micronaut/context/DefaultBeanContext.java", "/workspace/inject/src/main/java/io/micronaut/context/DefaultBeanDefinitionsProvider.java", "/workspace/inject/src/main/java/io/micronaut/context/DefaultBeanResolutionContext.java", "/workspace/inject/src/main/java/io/micronaut/context/DefaultConditionContext.java", "/workspace/inject/src/main/java/io/micronaut/context/DefaultConstructorInjectionPoint.java", "/workspace/inject/src/main/java/io/micronaut/context/DefaultCustomScopeRegistry.java", "/workspace/inject/src/main/java/io/micronaut/context/DefaultFieldConstructorInjectionPoint.java", "/workspace/inject/src/main/java/io/micronaut/context/DefaultFieldInjectionPoint.java", "/workspace/inject/src/main/java/io/micronaut/context/DefaultMessageContext.java", "/workspace/inject/src/main/java/io/micronaut/context/DefaultMethodConstructorInjectionPoint.java", "/workspace/inject/src/main/java/io/micronaut/context/DefaultMethodInjectionPoint.java", "/workspace/inject/src/main/java/io/micronaut/context/DefaultReplacesDefinition.java", "/workspace/inject/src/main/java/io/micronaut/context/DefaultRuntimeBeanDefinition.java", "/workspace/inject/src/main/java/io/micronaut/context/DisabledBean.java", "/workspace/inject/src/main/java/io/micronaut/context/EnvironmentAwareArgument.java", "/workspace/inject/src/main/java/io/micronaut/context/EnvironmentConfigurable.java", "/workspace/inject/src/main/java/io/micronaut/context/ExecutionHandleLocator.java", "/workspace/inject/src/main/java/io/micronaut/context/ExpressionsAwareArgument.java", "/workspace/inject/src/main/java/io/micronaut/context/LifeCycle.java", "/workspace/inject/src/main/java/io/micronaut/context/LocalizedMessageSource.java", "/workspace/inject/src/main/java/io/micronaut/context/MessageSource.java", "/workspace/inject/src/main/java/io/micronaut/context/MessageSourceUtils.java", "/workspace/inject/src/main/java/io/micronaut/context/PropertyResolverDelegate.java", "/workspace/inject/src/main/java/io/micronaut/context/ProviderUtils.java", "/workspace/inject/src/main/java/io/micronaut/context/Qualifier.java", "/workspace/inject/src/main/java/io/micronaut/context/RequiresCondition.java", "/workspace/inject/src/main/java/io/micronaut/context/RuntimeBeanDefinition.java", "/workspace/inject/src/main/java/io/micronaut/context/SingletonScope.java", "/workspace/inject/src/main/java/io/micronaut/context/StaticMessageSource.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/AliasFor.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/Aliases.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/AnnotationExpressionContext.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/Any.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/Bean.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/BeanProperties.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/BootstrapContextCompatible.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/ClassImport.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/Configuration.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/ConfigurationBuilder.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/ConfigurationInject.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/ConfigurationProperties.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/ConfigurationReader.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/Context.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/ContextConfigurer.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/DefaultImplementation.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/DefaultScope.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/EachBean.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/EachProperty.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/Executable.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/Factory.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/Import.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/Infrastructure.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/InjectScope.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/Mapper.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/Mixin.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/NonBinding.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/Parallel.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/Parameter.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/Primary.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/Property.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/PropertySource.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/Prototype.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/Provided.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/Replaces.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/Requirements.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/Requires.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/Secondary.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/Type.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/Value.java", "/workspace/inject/src/main/java/io/micronaut/context/annotation/package-info.java", "/workspace/inject/src/main/java/io/micronaut/context/banner/Banner.java", "/workspace/inject/src/main/java/io/micronaut/context/banner/MicronautBanner.java", "/workspace/inject/src/main/java/io/micronaut/context/banner/ResourceBanner.java", "/workspace/inject/src/main/java/io/micronaut/context/beans/BeanDefinitionService.java", "/workspace/inject/src/main/java/io/micronaut/context/beans/DefaultBeanDefinitionService.java", "/workspace/inject/src/main/java/io/micronaut/context/bind/DefaultExecutableBeanContextBinder.java", "/workspace/inject/src/main/java/io/micronaut/context/bind/ExecutableBeanContextBinder.java", "/workspace/inject/src/main/java/io/micronaut/context/condition/Condition.java", "/workspace/inject/src/main/java/io/micronaut/context/condition/ConditionContext.java", "/workspace/inject/src/main/java/io/micronaut/context/condition/Failure.java", "/workspace/inject/src/main/java/io/micronaut/context/condition/NotInNativeImage.java", "/workspace/inject/src/main/java/io/micronaut/context/condition/OperatingSystem.java", "/workspace/inject/src/main/java/io/micronaut/context/condition/TrueCondition.java", "/workspace/inject/src/main/java/io/micronaut/context/condition/package-info.java", "/workspace/inject/src/main/java/io/micronaut/context/conditions/MatchesAbsenceOfBeansCondition.java", "/workspace/inject/src/main/java/io/micronaut/context/conditions/MatchesAbsenceOfClassNamesCondition.java", "/workspace/inject/src/main/java/io/micronaut/context/conditions/MatchesAbsenceOfClassesCondition.java", "/workspace/inject/src/main/java/io/micronaut/context/conditions/MatchesConditionUtils.java", "/workspace/inject/src/main/java/io/micronaut/context/conditions/MatchesConfigurationCondition.java", "/workspace/inject/src/main/java/io/micronaut/context/conditions/MatchesCurrentNotOsCondition.java", "/workspace/inject/src/main/java/io/micronaut/context/conditions/MatchesCurrentOsCondition.java", "/workspace/inject/src/main/java/io/micronaut/context/conditions/MatchesCustomCondition.java", "/workspace/inject/src/main/java/io/micronaut/context/conditions/MatchesDynamicCondition.java", "/workspace/inject/src/main/java/io/micronaut/context/conditions/MatchesEnvironmentCondition.java", "/workspace/inject/src/main/java/io/micronaut/context/conditions/MatchesMissingPropertyCondition.java", "/workspace/inject/src/main/java/io/micronaut/context/conditions/MatchesNotEnvironmentCondition.java", "/workspace/inject/src/main/java/io/micronaut/context/conditions/MatchesPresenceOfBeansCondition.java", "/workspace/inject/src/main/java/io/micronaut/context/conditions/MatchesPresenceOfClassesCondition.java", "/workspace/inject/src/main/java/io/micronaut/context/conditions/MatchesPresenceOfEntitiesCondition.java", "/workspace/inject/src/main/java/io/micronaut/context/conditions/MatchesPresenceOfResourcesCondition.java", "/workspace/inject/src/main/java/io/micronaut/context/conditions/MatchesPropertyCondition.java", "/workspace/inject/src/main/java/io/micronaut/context/conditions/MatchesSdkCondition.java", "/workspace/inject/src/main/java/io/micronaut/context/converters/ContextConverterRegistrar.java", "/workspace/inject/src/main/java/io/micronaut/context/converters/package-info.java", "/workspace/inject/src/main/java/io/micronaut/context/env/AbstractPropertySourceLoader.java", "/workspace/inject/src/main/java/io/micronaut/context/env/ActiveEnvironment.java", "/workspace/inject/src/main/java/io/micronaut/context/env/BootstrapPropertySourceLocator.java", "/workspace/inject/src/main/java/io/micronaut/context/env/CachedEnvironment.java", "/workspace/inject/src/main/java/io/micronaut/context/env/CommandLinePropertySource.java", "/workspace/inject/src/main/java/io/micronaut/context/env/ComputePlatform.java", "/workspace/inject/src/main/java/io/micronaut/context/env/ConfigurationPath.java", "/workspace/inject/src/main/java/io/micronaut/context/env/ConstantPropertySourceLoader.java", "/workspace/inject/src/main/java/io/micronaut/context/env/ConstantPropertySources.java", "/workspace/inject/src/main/java/io/micronaut/context/env/DefaultConfigurationPath.java", "/workspace/inject/src/main/java/io/micronaut/context/env/DefaultEnvironment.java", "/workspace/inject/src/main/java/io/micronaut/context/env/DefaultEnvironmentAndPackageDeducer.java", "/workspace/inject/src/main/java/io/micronaut/context/env/DefaultOrigin.java", "/workspace/inject/src/main/java/io/micronaut/context/env/DefaultPropertyEntry.java", "/workspace/inject/src/main/java/io/micronaut/context/env/DefaultPropertyPlaceholderResolver.java", "/workspace/inject/src/main/java/io/micronaut/context/env/EmptyPropertySource.java", "/workspace/inject/src/main/java/io/micronaut/context/env/Environment.java", "/workspace/inject/src/main/java/io/micronaut/context/env/EnvironmentNamesDeducer.java", "/workspace/inject/src/main/java/io/micronaut/context/env/EnvironmentPackagesDeducer.java", "/workspace/inject/src/main/java/io/micronaut/context/env/EnvironmentPropertySource.java", "/workspace/inject/src/main/java/io/micronaut/context/env/KubernetesEnvironmentPropertySource.java", "/workspace/inject/src/main/java/io/micronaut/context/env/MapPropertySource.java", "/workspace/inject/src/main/java/io/micronaut/context/env/PropertiesPropertySourceLoader.java", "/workspace/inject/src/main/java/io/micronaut/context/env/PropertyEntry.java", "/workspace/inject/src/main/java/io/micronaut/context/env/PropertyExpressionResolver.java", "/workspace/inject/src/main/java/io/micronaut/context/env/PropertyPlaceholderResolver.java", "/workspace/inject/src/main/java/io/micronaut/context/env/PropertySource.java", "/workspace/inject/src/main/java/io/micronaut/context/env/PropertySourceLoader.java", "/workspace/inject/src/main/java/io/micronaut/context/env/PropertySourceLocator.java", "/workspace/inject/src/main/java/io/micronaut/context/env/PropertySourcePropertyResolver.java", "/workspace/inject/src/main/java/io/micronaut/context/env/PropertySourceReader.java", "/workspace/inject/src/main/java/io/micronaut/context/env/PropertySourcesLocator.java", "/workspace/inject/src/main/java/io/micronaut/context/env/SystemPropertiesPropertySource.java", "/workspace/inject/src/main/java/io/micronaut/context/env/exp/RandomPropertyExpressionResolver.java", "/workspace/inject/src/main/java/io/micronaut/context/env/package-info.java", "/workspace/inject/src/main/java/io/micronaut/context/env/yaml/ConstructIsoTimestampString.java", "/workspace/inject/src/main/java/io/micronaut/context/env/yaml/CustomSafeConstructor.java", "/workspace/inject/src/main/java/io/micronaut/context/env/yaml/YamlPropertySourceLoader.java", "/workspace/inject/src/main/java/io/micronaut/context/env/yaml/package-info.java", "/workspace/inject/src/main/java/io/micronaut/context/event/ApplicationEvent.java", "/workspace/inject/src/main/java/io/micronaut/context/event/ApplicationEventListener.java", "/workspace/inject/src/main/java/io/micronaut/context/event/ApplicationEventPublisher.java", "/workspace/inject/src/main/java/io/micronaut/context/event/ApplicationEventPublisherFactory.java", "/workspace/inject/src/main/java/io/micronaut/context/event/BeanContextEvent.java", "/workspace/inject/src/main/java/io/micronaut/context/event/BeanCreatedEvent.java", "/workspace/inject/src/main/java/io/micronaut/context/event/BeanCreatedEventListener.java", "/workspace/inject/src/main/java/io/micronaut/context/event/BeanDestroyedEvent.java", "/workspace/inject/src/main/java/io/micronaut/context/event/BeanDestroyedEventListener.java", "/workspace/inject/src/main/java/io/micronaut/context/event/BeanEvent.java", "/workspace/inject/src/main/java/io/micronaut/context/event/BeanInitializedEventListener.java", "/workspace/inject/src/main/java/io/micronaut/context/event/BeanInitializingEvent.java", "/workspace/inject/src/main/java/io/micronaut/context/event/BeanPreDestroyEvent.java", "/workspace/inject/src/main/java/io/micronaut/context/event/BeanPreDestroyEventListener.java", "/workspace/inject/src/main/java/io/micronaut/context/event/NoOpApplicationEventPublisher.java", "/workspace/inject/src/main/java/io/micronaut/context/event/ShutdownEvent.java", "/workspace/inject/src/main/java/io/micronaut/context/event/StartupEvent.java", "/workspace/inject/src/main/java/io/micronaut/context/event/package-info.java", "/workspace/inject/src/main/java/io/micronaut/context/exceptions/BeanContextException.java", "/workspace/inject/src/main/java/io/micronaut/context/exceptions/BeanCreationException.java", "/workspace/inject/src/main/java/io/micronaut/context/exceptions/BeanDestructionException.java", "/workspace/inject/src/main/java/io/micronaut/context/exceptions/BeanInstantiationException.java", "/workspace/inject/src/main/java/io/micronaut/context/exceptions/CircularDependencyException.java", "/workspace/inject/src/main/java/io/micronaut/context/exceptions/ConfigurationException.java", "/workspace/inject/src/main/java/io/micronaut/context/exceptions/DependencyInjectionException.java", "/workspace/inject/src/main/java/io/micronaut/context/exceptions/DisabledBeanException.java", "/workspace/inject/src/main/java/io/micronaut/context/exceptions/ExpressionEvaluationException.java", "/workspace/inject/src/main/java/io/micronaut/context/exceptions/MessageUtils.java", "/workspace/inject/src/main/java/io/micronaut/context/exceptions/NoSuchBeanException.java", "/workspace/inject/src/main/java/io/micronaut/context/exceptions/NoSuchMessageException.java", "/workspace/inject/src/main/java/io/micronaut/context/exceptions/NonUniqueBeanException.java", "/workspace/inject/src/main/java/io/micronaut/context/exceptions/package-info.java", "/workspace/inject/src/main/java/io/micronaut/context/expressions/AbstractEvaluatedExpression.java", "/workspace/inject/src/main/java/io/micronaut/context/expressions/ConfigurableExpressionEvaluationContext.java", "/workspace/inject/src/main/java/io/micronaut/context/expressions/DefaultExpressionEvaluationContext.java", "/workspace/inject/src/main/java/io/micronaut/context/i18n/ResourceBundleMessageSource.java", "/workspace/inject/src/main/java/io/micronaut/context/package-info.java", "/workspace/inject/src/main/java/io/micronaut/context/processor/AnnotationProcessor.java", "/workspace/inject/src/main/java/io/micronaut/context/processor/BeanDefinitionProcessor.java", "/workspace/inject/src/main/java/io/micronaut/context/processor/ExecutableMethodProcessor.java", "/workspace/inject/src/main/java/io/micronaut/context/processor/package-info.java", "/workspace/inject/src/main/java/io/micronaut/context/scope/AbstractConcurrentCustomScope.java", "/workspace/inject/src/main/java/io/micronaut/context/scope/BeanCreationContext.java", "/workspace/inject/src/main/java/io/micronaut/context/scope/CreatedBean.java", "/workspace/inject/src/main/java/io/micronaut/context/scope/CustomScope.java", "/workspace/inject/src/main/java/io/micronaut/context/scope/CustomScopeRegistry.java", "/workspace/inject/src/main/java/io/micronaut/context/scope/package-info.java", "/workspace/inject/src/main/java/io/micronaut/inject/AdvisedBeanType.java", "/workspace/inject/src/main/java/io/micronaut/inject/ArgumentBeanType.java", "/workspace/inject/src/main/java/io/micronaut/inject/ArgumentInjectionPoint.java", "/workspace/inject/src/main/java/io/micronaut/inject/BeanConfiguration.java", "/workspace/inject/src/main/java/io/micronaut/inject/BeanContextConditional.java", "/workspace/inject/src/main/java/io/micronaut/inject/BeanDefinition.java", "/workspace/inject/src/main/java/io/micronaut/inject/BeanDefinitionMethodReference.java", "/workspace/inject/src/main/java/io/micronaut/inject/BeanDefinitionReference.java", "/workspace/inject/src/main/java/io/micronaut/inject/BeanIdentifier.java", "/workspace/inject/src/main/java/io/micronaut/inject/BeanType.java", "/workspace/inject/src/main/java/io/micronaut/inject/CallableInjectionPoint.java", "/workspace/inject/src/main/java/io/micronaut/inject/ConditionalBeanConfiguration.java", "/workspace/inject/src/main/java/io/micronaut/inject/ConstructorInjectionPoint.java", "/workspace/inject/src/main/java/io/micronaut/inject/DefaultBeanDefinitionMethodReference.java", "/workspace/inject/src/main/java/io/micronaut/inject/DefaultBeanIdentifier.java", "/workspace/inject/src/main/java/io/micronaut/inject/DelegatingBeanDefinition.java", "/workspace/inject/src/main/java/io/micronaut/inject/DelegatingExecutableMethod.java", "/workspace/inject/src/main/java/io/micronaut/inject/DisposableBeanDefinition.java", "/workspace/inject/src/main/java/io/micronaut/inject/ExecutableMethod.java", "/workspace/inject/src/main/java/io/micronaut/inject/ExecutableMethodsDefinition.java", "/workspace/inject/src/main/java/io/micronaut/inject/ExecutionHandle.java", "/workspace/inject/src/main/java/io/micronaut/inject/FieldInjectionPoint.java", "/workspace/inject/src/main/java/io/micronaut/inject/InitializingBeanDefinition.java", "/workspace/inject/src/main/java/io/micronaut/inject/InjectableBeanDefinition.java", "/workspace/inject/src/main/java/io/micronaut/inject/InjectionPoint.java", "/workspace/inject/src/main/java/io/micronaut/inject/InstantiatableBeanDefinition.java", "/workspace/inject/src/main/java/io/micronaut/inject/MethodExecutionHandle.java", "/workspace/inject/src/main/java/io/micronaut/inject/MethodInjectionPoint.java", "/workspace/inject/src/main/java/io/micronaut/inject/MethodReference.java", "/workspace/inject/src/main/java/io/micronaut/inject/ParametrizedInstantiatableBeanDefinition.java", "/workspace/inject/src/main/java/io/micronaut/inject/ParametrizedProvider.java", "/workspace/inject/src/main/java/io/micronaut/inject/ProxyBeanDefinition.java", "/workspace/inject/src/main/java/io/micronaut/inject/QualifiedBeanType.java", "/workspace/inject/src/main/java/io/micronaut/inject/ReplacesDefinition.java", "/workspace/inject/src/main/java/io/micronaut/inject/UnsafeExecutionHandle.java", "/workspace/inject/src/main/java/io/micronaut/inject/ValidatedBeanDefinition.java", "/workspace/inject/src/main/java/io/micronaut/inject/annotation/AbstractAnnotationMetadata.java", "/workspace/inject/src/main/java/io/micronaut/inject/annotation/AbstractEnvironmentAnnotationMetadata.java", "/workspace/inject/src/main/java/io/micronaut/inject/annotation/AnnotatedElementValidator.java", "/workspace/inject/src/main/java/io/micronaut/inject/annotation/AnnotationConvertersRegistrar.java", "/workspace/inject/src/main/java/io/micronaut/inject/annotation/AnnotationMetadataException.java", "/workspace/inject/src/main/java/io/micronaut/inject/annotation/AnnotationMetadataHierarchy.java", "/workspace/inject/src/main/java/io/micronaut/inject/annotation/AnnotationMetadataReference.java", "/workspace/inject/src/main/java/io/micronaut/inject/annotation/AnnotationMetadataSupport.java", "/workspace/inject/src/main/java/io/micronaut/inject/annotation/DefaultAnnotationMetadata.java", "/workspace/inject/src/main/java/io/micronaut/inject/annotation/EnvironmentAnnotationMetadata.java", "/workspace/inject/src/main/java/io/micronaut/inject/annotation/EnvironmentAnnotationValue.java", "/workspace/inject/src/main/java/io/micronaut/inject/annotation/EnvironmentConvertibleValuesMap.java", "/workspace/inject/src/main/java/io/micronaut/inject/annotation/EnvironmentOptionalValuesMap.java", "/workspace/inject/src/main/java/io/micronaut/inject/annotation/EvaluatedAnnotationMetadata.java", "/workspace/inject/src/main/java/io/micronaut/inject/annotation/EvaluatedAnnotationValue.java", "/workspace/inject/src/main/java/io/micronaut/inject/annotation/EvaluatedConvertibleValuesMap.java", "/workspace/inject/src/main/java/io/micronaut/inject/annotation/MappingAnnotationMetadataDelegate.java", "/workspace/inject/src/main/java/io/micronaut/inject/annotation/MutableAnnotationMetadata.java", "/workspace/inject/src/main/java/io/micronaut/inject/annotation/package-info.java", "/workspace/inject/src/main/java/io/micronaut/inject/beans/AbstractEnumBeanIntrospectionAndReference.java", "/workspace/inject/src/main/java/io/micronaut/inject/beans/AbstractExecutableBeanMethod.java", "/workspace/inject/src/main/java/io/micronaut/inject/beans/AbstractInitializableBeanIntrospection.java", "/workspace/inject/src/main/java/io/micronaut/inject/beans/AbstractInitializableBeanIntrospectionAndReference.java", "/workspace/inject/src/main/java/io/micronaut/inject/beans/KotlinExecutableMethodUtils.java", "/workspace/inject/src/main/java/io/micronaut/inject/beans/package-info.java", "/workspace/inject/src/main/java/io/micronaut/inject/package-info.java", "/workspace/inject/src/main/java/io/micronaut/inject/provider/AbstractProviderDefinition.java", "/workspace/inject/src/main/java/io/micronaut/inject/provider/BeanProviderDefinition.java", "/workspace/inject/src/main/java/io/micronaut/inject/provider/JakartaProviderBeanDefinition.java", "/workspace/inject/src/main/java/io/micronaut/inject/provider/JavaxProviderBeanDefinition.java", "/workspace/inject/src/main/java/io/micronaut/inject/provider/ProviderTypeInformationProvider.java", "/workspace/inject/src/main/java/io/micronaut/inject/provider/package-info.java", "/workspace/inject/src/main/java/io/micronaut/inject/proxy/InterceptedBean.java", "/workspace/inject/src/main/java/io/micronaut/inject/proxy/InterceptedBeanProxy.java", "/workspace/inject/src/main/java/io/micronaut/inject/qualifiers/AnnotationMetadataQualifier.java", "/workspace/inject/src/main/java/io/micronaut/inject/qualifiers/AnnotationQualifier.java", "/workspace/inject/src/main/java/io/micronaut/inject/qualifiers/AnnotationStereotypeQualifier.java", "/workspace/inject/src/main/java/io/micronaut/inject/qualifiers/AnyQualifier.java", "/workspace/inject/src/main/java/io/micronaut/inject/qualifiers/ClosestTypeArgumentQualifier.java", "/workspace/inject/src/main/java/io/micronaut/inject/qualifiers/CompositeQualifier.java", "/workspace/inject/src/main/java/io/micronaut/inject/qualifiers/EachBeanQualifier.java", "/workspace/inject/src/main/java/io/micronaut/inject/qualifiers/ExactTypeArgumentNameQualifier.java", "/workspace/inject/src/main/java/io/micronaut/inject/qualifiers/FilteringCompositeQualifier.java", "/workspace/inject/src/main/java/io/micronaut/inject/qualifiers/FilteringQualifier.java", "/workspace/inject/src/main/java/io/micronaut/inject/qualifiers/InterceptorBindingQualifier.java", "/workspace/inject/src/main/java/io/micronaut/inject/qualifiers/MatchArgumentQualifier.java", "/workspace/inject/src/main/java/io/micronaut/inject/qualifiers/NameQualifier.java", "/workspace/inject/src/main/java/io/micronaut/inject/qualifiers/NoneQualifier.java", "/workspace/inject/src/main/java/io/micronaut/inject/qualifiers/PrimaryQualifier.java", "/workspace/inject/src/main/java/io/micronaut/inject/qualifiers/Qualified.java", "/workspace/inject/src/main/java/io/micronaut/inject/qualifiers/QualifierUtils.java", "/workspace/inject/src/main/java/io/micronaut/inject/qualifiers/Qualifiers.java", "/workspace/inject/src/main/java/io/micronaut/inject/qualifiers/RepeatableAnnotationQualifier.java", "/workspace/inject/src/main/java/io/micronaut/inject/qualifiers/TypeAnnotationQualifier.java", "/workspace/inject/src/main/java/io/micronaut/inject/qualifiers/TypeArgumentQualifier.java", "/workspace/inject/src/main/java/io/micronaut/inject/qualifiers/package-info.java", "/workspace/inject/src/main/java/io/micronaut/inject/validation/BeanDefinitionValidator.java", "/workspace/inject/src/main/java/io/micronaut/inject/validation/RequiresValidation.java", "/workspace/inject/src/main/java/io/micronaut/inject/validation/package-info.java", "/workspace/inject/src/main/resources/META-INF/micronaut/io.micronaut.inject.BeanDefinitionReference/io.micronaut.context.event.ApplicationEventPublisherFactory", "/workspace/inject/src/main/resources/META-INF/micronaut/io.micronaut.inject.BeanDefinitionReference/io.micronaut.inject.provider.BeanProviderDefinition", "/workspace/inject/src/main/resources/META-INF/micronaut/io.micronaut.inject.BeanDefinitionReference/io.micronaut.inject.provider.JakartaProviderBeanDefinition", "/workspace/inject/src/main/resources/META-INF/micronaut/io.micronaut.inject.BeanDefinitionReference/io.micronaut.inject.provider.JavaxProviderBeanDefinition", "/workspace/inject/src/main/resources/META-INF/native-image/io.micronaut/micronaut-inject/native-image.properties", "/workspace/inject/src/main/resources/META-INF/native-image/io.micronaut/micronaut-inject/resource-config.json", "/workspace/inject/src/main/resources/META-INF/services/io.micronaut.core.convert.TypeConverterRegistrar", "/workspace/inject/src/main/resources/META-INF/services/io.micronaut.core.type.TypeInformationProvider", "/workspace/inject-groovy/build.gradle.kts", "/workspace/inject-groovy/src/functionalTest/groovy/io/micronaut/context/ApplicationContextConfigurerSpec.groovy", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/GroovyNativeElementHelper.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/InjectTransform.groovy", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/PackageElementVisitorTransform.groovy", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/TypeElementVisitorEnd.groovy", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/TypeElementVisitorStart.groovy", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/TypeElementVisitorTransform.groovy", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/annotation/GroovyAnnotationMetadataBuilder.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/annotation/GroovyElementAnnotationMetadataFactory.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/package-info.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/scan/AnnotatedTypeInfoVisitor.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/scan/AnnotationClassReader.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/scan/Attribute.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/scan/ClassPathAnnotationScanner.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/scan/Context.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/utils/AstClassUtils.groovy", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/utils/AstMessageUtils.groovy", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/utils/ExtendedParameter.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/utils/InMemoryByteCodeGroovyClassLoader.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/utils/InMemoryClassWriterOutputVisitor.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/utils/package-info.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/visitor/AbstractGroovyElement.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/visitor/GroovyAnnotationElement.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/visitor/GroovyBeanDefinitionBuilder.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/visitor/GroovyClassElement.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/visitor/GroovyClassWriterOutputVisitor.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/visitor/GroovyConstructorElement.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/visitor/GroovyElementFactory.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/visitor/GroovyEnumConstantElement.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/visitor/GroovyEnumElement.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/visitor/GroovyFieldElement.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/visitor/GroovyGenericPlaceholderElement.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/visitor/GroovyMethodElement.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/visitor/GroovyNativeElement.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/visitor/GroovyPackageElement.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/visitor/GroovyParameterElement.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/visitor/GroovyPropertyElement.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/visitor/GroovyVisitorContext.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/visitor/GroovyWildcardElement.java", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/visitor/LoadedVisitor.groovy", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/visitor/PackageLoadedVisitor.groovy", "/workspace/inject-groovy/src/main/groovy/io/micronaut/ast/groovy/visitor/package-info.java", "/workspace/inject-groovy/src/main/resources/META-INF/services/org.codehaus.groovy.transform.ASTTransformation", "/workspace/inject-groovy-test/build.gradle.kts", "/workspace/inject-java/build.gradle.kts", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/AbstractInjectAnnotationProcessor.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/AggregatingPackageElementVisitorProcessor.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/AggregatingTypeElementVisitorProcessor.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/AnnotationProcessingOutputVisitor.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/AnnotationUtils.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/AnnotationsElement.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/BeanDefinitionInjectProcessor.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/GenericUtils.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/JavaAnnotationMetadataBuilder.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/JavaElementAnnotationMetadataFactory.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/JavaNativeElementsHelper.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/LoadedVisitor.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/MixinVisitorProcessor.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/ModelUtils.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/PackageElementVisitorProcessor.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/PackageLoadedVisitor.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/PostponeToNextRoundException.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/PublicAbstractMethodVisitor.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/PublicMethodVisitor.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/SuperclassAwareTypeVisitor.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/TypeElementVisitorProcessor.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/package-info.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/visitor/AbstractJavaElement.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/visitor/AbstractJavaMemberElement.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/visitor/AbstractTypeAwareJavaElement.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/visitor/JavaAnnotationElement.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/visitor/JavaBeanDefinitionBuilder.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/visitor/JavaClassElement.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/visitor/JavaConstructorElement.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/visitor/JavaElementFactory.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/visitor/JavaEnumConstantElement.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/visitor/JavaEnumElement.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/visitor/JavaFieldElement.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/visitor/JavaGenericPlaceholderElement.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/visitor/JavaMethodElement.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/visitor/JavaNativeElement.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/visitor/JavaPackageElement.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/visitor/JavaParameterElement.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/visitor/JavaPropertyElement.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/visitor/JavaVisitorContext.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/visitor/JavaWildcardElement.java", "/workspace/inject-java/src/main/java/io/micronaut/annotation/processing/visitor/package-info.java", "/workspace/inject-java/src/main/resources/META-INF/gradle/incremental.annotation.processors", "/workspace/inject-java/src/main/resources/META-INF/services/javax.annotation.processing.Processor", "/workspace/inject-java-helper/build.gradle.kts", "/workspace/inject-java-helper2/build.gradle.kts", "/workspace/inject-java-test/build.gradle.kts", "/workspace/inject-kotlin/build.gradle.kts", "/workspace/inject-kotlin/gradle.properties", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/KotlinNativeElementsHelper.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/KotlinOutputVisitor.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/annotation/KotlinAnnotationMetadataBuilder.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/annotation/KotlinAnnotations.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/annotation/KotlinElementAnnotationMetadataFactory.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/beans/BeanDefinitionProcessor.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/beans/BeanDefinitionProcessorProvider.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/extensions.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/visitor/AbstractKotlinElement.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/visitor/AbstractKotlinMethodElement.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/visitor/AbstractKotlinPropertyAccessorMethodElement.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/visitor/AbstractKotlinPropertyElement.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/visitor/KotlinClassElement.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/visitor/KotlinConstructorElement.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/visitor/KotlinElementFactory.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/visitor/KotlinEnumConstantElement.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/visitor/KotlinEnumConstructorElement.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/visitor/KotlinEnumElement.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/visitor/KotlinFieldElement.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/visitor/KotlinGenericPlaceholderElement.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/visitor/KotlinMethodElement.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/visitor/KotlinNativeElement.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/visitor/KotlinParameterElement.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/visitor/KotlinPropertyElement.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/visitor/KotlinPropertyGetterMethodElement.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/visitor/KotlinPropertySetterMethodElement.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/visitor/KotlinSimplePropertyElement.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/visitor/KotlinTypeArgumentElement.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/visitor/KotlinVisitorContext.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/visitor/KotlinWildcardElement.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/visitor/LoadedVisitor.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/visitor/TypeElementSymbolProcessor.kt", "/workspace/inject-kotlin/src/main/kotlin/io/micronaut/kotlin/processing/visitor/TypeElementSymbolProcessorProvider.kt", "/workspace/inject-kotlin/src/main/resources/META-INF/services/com.google.devtools.ksp.processing.SymbolProcessorProvider", "/workspace/inject-kotlin/src/main/resources/notes.txt", "/workspace/inject-kotlin-test/build.gradle.kts", "/workspace/inject-kotlin-test/src/main/resources/META-INF/services/org.jetbrains.kotlin.compiler.plugin.ComponentRegistrar", "/workspace/inject-test-utils/build.gradle.kts", "/workspace/inject-test-utils/src/main/groovy/io/micronaut/inject/ast/AbstractClassElementSpec.groovy", "/workspace/jackson-core/build.gradle.kts", "/workspace/jackson-core/src/main/java/io/micronaut/jackson/core/env/CloudFoundryVcapApplicationPropertySourceLoader.java", "/workspace/jackson-core/src/main/java/io/micronaut/jackson/core/env/CloudFoundryVcapServicesPropertySourceLoader.java", "/workspace/jackson-core/src/main/java/io/micronaut/jackson/core/env/EnvJsonPropertySourceLoader.java", "/workspace/jackson-core/src/main/java/io/micronaut/jackson/core/env/JsonPropertySourceLoader.java", "/workspace/jackson-core/src/main/java/io/micronaut/jackson/core/env/package-info.java", "/workspace/jackson-core/src/main/java/io/micronaut/jackson/core/parser/JacksonCoreParserFactory.java", "/workspace/jackson-core/src/main/java/io/micronaut/jackson/core/parser/JacksonCoreProcessor.java", "/workspace/jackson-core/src/main/java/io/micronaut/jackson/core/tree/JsonNodeTraversingParser.java", "/workspace/jackson-core/src/main/java/io/micronaut/jackson/core/tree/JsonNodeTreeCodec.java", "/workspace/jackson-core/src/main/java/io/micronaut/jackson/core/tree/JsonStreamTransfer.java", "/workspace/jackson-core/src/main/java/io/micronaut/jackson/core/tree/TreeGenerator.java", "/workspace/jackson-core/src/main/resources/META-INF/services/io.micronaut.context.env.PropertySourceLoader", "/workspace/jackson-databind/build.gradle.kts", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/JacksonConfiguration.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/JacksonDatabindFeature.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/JacksonDeserializationPreInstantiateCallback.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/ObjectMapperFactory.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/annotation/JacksonFeatures.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/annotation/package-info.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/codec/JacksonFeatures.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/codec/JacksonMediaTypeCodec.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/codec/JsonMediaTypeCodec.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/codec/JsonStreamMediaTypeCodec.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/codec/package-info.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/databind/DatabindPropertyBinderExceptionHandler.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/databind/JacksonDatabindMapper.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/databind/JacksonDatabindMapperSupplier.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/databind/convert/JacksonConverterRegistrar.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/databind/convert/ObjectNodeConvertibleValues.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/databind/convert/package-info.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/env/JsonPropertySourceLoader.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/modules/BeanIntrospectionModule.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/modules/package-info.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/package-info.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/parser/JacksonProcessor.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/serialize/ConvertibleMultiValuesSerializer.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/serialize/ConvertibleValuesDeserializer.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/serialize/ConvertibleValuesSerializer.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/serialize/JacksonObjectSerializer.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/serialize/JsonNodeDeserializer.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/serialize/JsonNodeSerializer.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/serialize/MicronautDeserializers.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/serialize/OptionalValuesSerializer.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/serialize/ResourceDeserializerModifier.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/serialize/ResourceModule.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/serialize/ResourceSerializerModifier.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/serialize/package-info.java", "/workspace/jackson-databind/src/main/java/io/micronaut/jackson/validation/ValidationJacksonDeserializationPreInstantiateCallback.java", "/workspace/jackson-databind/src/main/resources/META-INF/native-image/io.micronaut/micronaut-jackson-databind/native-image.properties", "/workspace/jackson-databind/src/main/resources/META-INF/services/io.micronaut.json.JsonMapperSupplier", "/workspace/json-core/build.gradle.kts", "/workspace/json-core/src/main/java/io/micronaut/json/JsonConfiguration.java", "/workspace/json-core/src/main/java/io/micronaut/json/JsonFeatures.java", "/workspace/json-core/src/main/java/io/micronaut/json/JsonMapper.java", "/workspace/json-core/src/main/java/io/micronaut/json/JsonMapperSupplier.java", "/workspace/json-core/src/main/java/io/micronaut/json/JsonObjectSerializer.java", "/workspace/json-core/src/main/java/io/micronaut/json/JsonStreamConfig.java", "/workspace/json-core/src/main/java/io/micronaut/json/JsonSyntaxException.java", "/workspace/json-core/src/main/java/io/micronaut/json/bind/JsonBeanPropertyBinder.java", "/workspace/json-core/src/main/java/io/micronaut/json/bind/JsonBeanPropertyBinderExceptionHandler.java", "/workspace/json-core/src/main/java/io/micronaut/json/bind/package-info.java", "/workspace/json-core/src/main/java/io/micronaut/json/body/CustomizableJsonHandler.java", "/workspace/json-core/src/main/java/io/micronaut/json/body/JsonMessageHandler.java", "/workspace/json-core/src/main/java/io/micronaut/json/codec/JsonMediaTypeCodec.java", "/workspace/json-core/src/main/java/io/micronaut/json/codec/JsonStreamMediaTypeCodec.java", "/workspace/json-core/src/main/java/io/micronaut/json/codec/MapperMediaTypeCodec.java", "/workspace/json-core/src/main/java/io/micronaut/json/convert/JsonConverterRegistrar.java", "/workspace/json-core/src/main/java/io/micronaut/json/convert/JsonNodeConvertibleValues.java", "/workspace/json-core/src/main/java/io/micronaut/json/convert/LazyJsonNode.java", "/workspace/json-core/src/main/java/io/micronaut/json/tree/JsonArray.java", "/workspace/json-core/src/main/java/io/micronaut/json/tree/JsonBoolean.java", "/workspace/json-core/src/main/java/io/micronaut/json/tree/JsonContainer.java", "/workspace/json-core/src/main/java/io/micronaut/json/tree/JsonNode.java", "/workspace/json-core/src/main/java/io/micronaut/json/tree/JsonNull.java", "/workspace/json-core/src/main/java/io/micronaut/json/tree/JsonNumber.java", "/workspace/json-core/src/main/java/io/micronaut/json/tree/JsonObject.java", "/workspace/json-core/src/main/java/io/micronaut/json/tree/JsonScalar.java", "/workspace/json-core/src/main/java/io/micronaut/json/tree/JsonString.java", "/workspace/management/build.gradle.kts", "/workspace/management/src/main/java/io/micronaut/management/endpoint/EndpointConfiguration.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/EndpointDefaultConfiguration.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/EndpointEnabledCondition.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/EndpointSensitivityHandler.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/EndpointSensitivityProcessor.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/EndpointsFilter.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/annotation/Delete.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/annotation/Endpoint.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/annotation/Read.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/annotation/Selector.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/annotation/Sensitive.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/annotation/Write.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/annotation/package-info.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/beans/BeanDefinitionData.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/beans/BeanDefinitionDataCollector.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/beans/BeansEndpoint.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/beans/impl/DefaultBeanDefinitionData.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/beans/impl/DefaultBeanDefinitionDataCollector.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/beans/impl/package-info.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/beans/package-info.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/env/EnvironmentEndpoint.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/env/EnvironmentEndpointFilter.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/env/EnvironmentFilterSpecification.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/env/package-info.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/health/DetailsVisibility.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/health/HealthEndpoint.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/health/HealthLevelOfDetail.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/health/filter/HealthResultFilter.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/health/filter/package-info.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/health/package-info.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/info/InfoAggregator.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/info/InfoEndpoint.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/info/InfoSource.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/info/impl/ReactiveInfoAggregator.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/info/impl/package-info.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/info/package-info.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/info/source/BuildInfoSource.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/info/source/ConfigurationInfoSource.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/info/source/GitInfoSource.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/info/source/PropertiesInfoSource.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/info/source/package-info.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/loggers/LoggerConfiguration.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/loggers/LoggersEndpoint.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/loggers/LoggersManager.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/loggers/ManagedLoggingSystem.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/loggers/impl/DefaultLoggersManager.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/loggers/impl/Log4jLoggingSystem.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/loggers/impl/LogbackLoggingSystem.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/loggers/impl/package-info.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/loggers/package-info.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/package-info.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/processors/AbstractEndpointRouteBuilder.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/processors/DeleteEndpointRouteBuilder.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/processors/ReadEndpointRouteBuilder.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/processors/WriteEndpointRouteBuilder.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/processors/package-info.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/refresh/RefreshEndpoint.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/refresh/package-info.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/routes/RouteData.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/routes/RouteDataCollector.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/routes/RoutesEndpoint.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/routes/impl/DefaultRouteData.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/routes/impl/DefaultRouteDataCollector.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/routes/impl/package-info.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/routes/package-info.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/stop/ServerStopEndpoint.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/stop/package-info.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/threads/ThreadDumpEndpoint.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/threads/ThreadInfoMapper.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/threads/impl/DefaultThreadInfoMapper.java", "/workspace/management/src/main/java/io/micronaut/management/endpoint/threads/package-info.java", "/workspace/management/src/main/java/io/micronaut/management/health/aggregator/DefaultHealthAggregator.java", "/workspace/management/src/main/java/io/micronaut/management/health/aggregator/HealthAggregator.java", "/workspace/management/src/main/java/io/micronaut/management/health/aggregator/package-info.java", "/workspace/management/src/main/java/io/micronaut/management/health/indicator/AbstractHealthIndicator.java", "/workspace/management/src/main/java/io/micronaut/management/health/indicator/DefaultHealthResult.java", "/workspace/management/src/main/java/io/micronaut/management/health/indicator/GracefulShutdownHealthIndicator.java", "/workspace/management/src/main/java/io/micronaut/management/health/indicator/HealthCheckType.java", "/workspace/management/src/main/java/io/micronaut/management/health/indicator/HealthIndicator.java", "/workspace/management/src/main/java/io/micronaut/management/health/indicator/HealthResult.java", "/workspace/management/src/main/java/io/micronaut/management/health/indicator/annotation/Liveness.java", "/workspace/management/src/main/java/io/micronaut/management/health/indicator/annotation/Readiness.java", "/workspace/management/src/main/java/io/micronaut/management/health/indicator/client/ServiceHttpClientHealthIndicator.java", "/workspace/management/src/main/java/io/micronaut/management/health/indicator/discovery/DiscoveryClientHealthIndicator.java", "/workspace/management/src/main/java/io/micronaut/management/health/indicator/discovery/DiscoveryClientHealthIndicatorConfiguration.java", "/workspace/management/src/main/java/io/micronaut/management/health/indicator/discovery/package-info.java", "/workspace/management/src/main/java/io/micronaut/management/health/indicator/diskspace/DiskSpaceIndicator.java", "/workspace/management/src/main/java/io/micronaut/management/health/indicator/diskspace/DiskSpaceIndicatorConfiguration.java", "/workspace/management/src/main/java/io/micronaut/management/health/indicator/diskspace/package-info.java", "/workspace/management/src/main/java/io/micronaut/management/health/indicator/jdbc/JdbcIndicator.java", "/workspace/management/src/main/java/io/micronaut/management/health/indicator/jdbc/package-info.java", "/workspace/management/src/main/java/io/micronaut/management/health/indicator/package-info.java", "/workspace/management/src/main/java/io/micronaut/management/health/indicator/service/ServiceReadyHealthIndicator.java", "/workspace/management/src/main/java/io/micronaut/management/health/indicator/threads/DeadlockedThreadsHealthIndicator.java", "/workspace/management/src/main/java/io/micronaut/management/health/indicator/threads/package-info.java", "/workspace/management/src/main/java/io/micronaut/management/health/monitor/HealthMonitorTask.java", "/workspace/management/src/main/java/io/micronaut/management/health/monitor/package-info.java", "/workspace/media/mn.icns", "/workspace/messaging/build.gradle.kts", "/workspace/messaging/src/main/java/io/micronaut/messaging/Acknowledgement.java", "/workspace/messaging/src/main/java/io/micronaut/messaging/MessageHeaders.java", "/workspace/messaging/src/main/java/io/micronaut/messaging/MessagingApplication.java", "/workspace/messaging/src/main/java/io/micronaut/messaging/annotation/MessageBody.java", "/workspace/messaging/src/main/java/io/micronaut/messaging/annotation/MessageHeader.java", "/workspace/messaging/src/main/java/io/micronaut/messaging/annotation/MessageHeaders.java", "/workspace/messaging/src/main/java/io/micronaut/messaging/annotation/MessageListener.java", "/workspace/messaging/src/main/java/io/micronaut/messaging/annotation/MessageMapping.java", "/workspace/messaging/src/main/java/io/micronaut/messaging/annotation/MessageProducer.java", "/workspace/messaging/src/main/java/io/micronaut/messaging/annotation/SendTo.java", "/workspace/messaging/src/main/java/io/micronaut/messaging/annotation/package-info.java", "/workspace/messaging/src/main/java/io/micronaut/messaging/exceptions/MessageAcknowledgementException.java", "/workspace/messaging/src/main/java/io/micronaut/messaging/exceptions/MessageListenerException.java", "/workspace/messaging/src/main/java/io/micronaut/messaging/exceptions/MessagingClientException.java", "/workspace/messaging/src/main/java/io/micronaut/messaging/exceptions/MessagingException.java", "/workspace/messaging/src/main/java/io/micronaut/messaging/exceptions/MessagingSystemException.java", "/workspace/messaging/src/main/java/io/micronaut/messaging/exceptions/package-info.java", "/workspace/messaging/src/main/java/io/micronaut/messaging/package-info.java", "/workspace/pmd-results-base.json", "/workspace/retry/build.gradle.kts", "/workspace/retry/src/main/java/io/micronaut/retry/CircuitState.java", "/workspace/retry/src/main/java/io/micronaut/retry/RetryState.java", "/workspace/retry/src/main/java/io/micronaut/retry/RetryStateBuilder.java", "/workspace/retry/src/main/java/io/micronaut/retry/annotation/CircuitBreaker.java", "/workspace/retry/src/main/java/io/micronaut/retry/annotation/DefaultRetryPredicate.java", "/workspace/retry/src/main/java/io/micronaut/retry/annotation/Fallback.java", "/workspace/retry/src/main/java/io/micronaut/retry/annotation/Recoverable.java", "/workspace/retry/src/main/java/io/micronaut/retry/annotation/RetryPredicate.java", "/workspace/retry/src/main/java/io/micronaut/retry/annotation/Retryable.java", "/workspace/retry/src/main/java/io/micronaut/retry/annotation/package-info.java", "/workspace/retry/src/main/java/io/micronaut/retry/event/CircuitClosedEvent.java", "/workspace/retry/src/main/java/io/micronaut/retry/event/CircuitOpenEvent.java", "/workspace/retry/src/main/java/io/micronaut/retry/event/RetryEvent.java", "/workspace/retry/src/main/java/io/micronaut/retry/event/RetryEventListener.java", "/workspace/retry/src/main/java/io/micronaut/retry/event/package-info.java", "/workspace/retry/src/main/java/io/micronaut/retry/exception/CircuitOpenException.java", "/workspace/retry/src/main/java/io/micronaut/retry/exception/FallbackException.java", "/workspace/retry/src/main/java/io/micronaut/retry/exception/RetryException.java", "/workspace/retry/src/main/java/io/micronaut/retry/exception/package-info.java", "/workspace/retry/src/main/java/io/micronaut/retry/intercept/AnnotationRetryStateBuilder.java", "/workspace/retry/src/main/java/io/micronaut/retry/intercept/CircuitBreakerRetry.java", "/workspace/retry/src/main/java/io/micronaut/retry/intercept/DefaultRetryInterceptor.java", "/workspace/retry/src/main/java/io/micronaut/retry/intercept/MutableRetryState.java", "/workspace/retry/src/main/java/io/micronaut/retry/intercept/RecoveryInterceptor.java", "/workspace/retry/src/main/java/io/micronaut/retry/intercept/SimpleRetry.java", "/workspace/retry/src/main/java/io/micronaut/retry/intercept/package-info.java", "/workspace/retry/src/main/java/io/micronaut/retry/package-info.java", "/workspace/router/build.gradle.kts", "/workspace/router/src/main/groovy/io/micronaut/web/router/GroovyRouteBuilder.groovy", "/workspace/router/src/main/java/io/micronaut/web/router/AbstractRouteMatch.java", "/workspace/router/src/main/java/io/micronaut/web/router/AnnotatedFilterRouteBuilder.java", "/workspace/router/src/main/java/io/micronaut/web/router/AnnotatedMethodRouteBuilder.java", "/workspace/router/src/main/java/io/micronaut/web/router/DefaultErrorRouteInfo.java", "/workspace/router/src/main/java/io/micronaut/web/router/DefaultFilterRoute.java", "/workspace/router/src/main/java/io/micronaut/web/router/DefaultMethodBasedRouteInfo.java", "/workspace/router/src/main/java/io/micronaut/web/router/DefaultRequestMatcher.java", "/workspace/router/src/main/java/io/micronaut/web/router/DefaultRouteBuilder.java", "/workspace/router/src/main/java/io/micronaut/web/router/DefaultRouteInfo.java", "/workspace/router/src/main/java/io/micronaut/web/router/DefaultRouter.java", "/workspace/router/src/main/java/io/micronaut/web/router/DefaultStatusRouteInfo.java", "/workspace/router/src/main/java/io/micronaut/web/router/DefaultUriRouteMatch.java", "/workspace/router/src/main/java/io/micronaut/web/router/DefaultUrlRouteInfo.java", "/workspace/router/src/main/java/io/micronaut/web/router/ErrorRoute.java", "/workspace/router/src/main/java/io/micronaut/web/router/ErrorRouteInfo.java", "/workspace/router/src/main/java/io/micronaut/web/router/ErrorRouteMatch.java", "/workspace/router/src/main/java/io/micronaut/web/router/FilterRoute.java", "/workspace/router/src/main/java/io/micronaut/web/router/MethodBasedRouteInfo.java", "/workspace/router/src/main/java/io/micronaut/web/router/MethodBasedRouteMatch.java", "/workspace/router/src/main/java/io/micronaut/web/router/RequestMatcher.java", "/workspace/router/src/main/java/io/micronaut/web/router/ResourceRoute.java", "/workspace/router/src/main/java/io/micronaut/web/router/Route.java", "/workspace/router/src/main/java/io/micronaut/web/router/RouteAttributes.java", "/workspace/router/src/main/java/io/micronaut/web/router/RouteBuilder.java", "/workspace/router/src/main/java/io/micronaut/web/router/RouteInfo.java", "/workspace/router/src/main/java/io/micronaut/web/router/RouteMatch.java", "/workspace/router/src/main/java/io/micronaut/web/router/RouteMatchUtils.java", "/workspace/router/src/main/java/io/micronaut/web/router/Router.java", "/workspace/router/src/main/java/io/micronaut/web/router/ServerFilterRouteBuilder.java", "/workspace/router/src/main/java/io/micronaut/web/router/StatusRoute.java", "/workspace/router/src/main/java/io/micronaut/web/router/StatusRouteInfo.java", "/workspace/router/src/main/java/io/micronaut/web/router/StatusRouteMatch.java", "/workspace/router/src/main/java/io/micronaut/web/router/UriRoute.java", "/workspace/router/src/main/java/io/micronaut/web/router/UriRouteInfo.java", "/workspace/router/src/main/java/io/micronaut/web/router/UriRouteMatch.java", "/workspace/router/src/main/java/io/micronaut/web/router/exceptions/DuplicateRouteException.java", "/workspace/router/src/main/java/io/micronaut/web/router/exceptions/RoutingException.java", "/workspace/router/src/main/java/io/micronaut/web/router/exceptions/UnsatisfiedBodyRouteException.java", "/workspace/router/src/main/java/io/micronaut/web/router/exceptions/UnsatisfiedCookieValueRouteException.java", "/workspace/router/src/main/java/io/micronaut/web/router/exceptions/UnsatisfiedHeaderRouteException.java", "/workspace/router/src/main/java/io/micronaut/web/router/exceptions/UnsatisfiedPartRouteException.java", "/workspace/router/src/main/java/io/micronaut/web/router/exceptions/UnsatisfiedPathVariableRouteException.java", "/workspace/router/src/main/java/io/micronaut/web/router/exceptions/UnsatisfiedQueryValueRouteException.java", "/workspace/router/src/main/java/io/micronaut/web/router/exceptions/UnsatisfiedRequestAttributeRouteException.java", "/workspace/router/src/main/java/io/micronaut/web/router/exceptions/UnsatisfiedRouteException.java", "/workspace/router/src/main/java/io/micronaut/web/router/exceptions/package-info.java", "/workspace/router/src/main/java/io/micronaut/web/router/filter/FilteredRouter.java", "/workspace/router/src/main/java/io/micronaut/web/router/filter/RouteMatchFilter.java", "/workspace/router/src/main/java/io/micronaut/web/router/naming/ConfigurableUriNamingStrategy.java", "/workspace/router/src/main/java/io/micronaut/web/router/naming/HyphenatedUriNamingStrategy.java", "/workspace/router/src/main/java/io/micronaut/web/router/naming/package-info.java", "/workspace/router/src/main/java/io/micronaut/web/router/package-info.java", "/workspace/router/src/main/java/io/micronaut/web/router/qualifier/ConsumesMediaTypeQualifier.java", "/workspace/router/src/main/java/io/micronaut/web/router/qualifier/ProducesMediaTypeQualifier.java", "/workspace/router/src/main/java/io/micronaut/web/router/qualifier/package-info.java", "/workspace/router/src/main/java/io/micronaut/web/router/resource/StaticResourceConfiguration.java", "/workspace/router/src/main/java/io/micronaut/web/router/resource/StaticResourceResolver.java", "/workspace/router/src/main/java/io/micronaut/web/router/resource/StaticResourceResolverFactory.java", "/workspace/router/src/main/java/io/micronaut/web/router/resource/package-info.java", "/workspace/router/src/main/java/io/micronaut/web/router/uri/PercentEncoder.java", "/workspace/router/src/main/java/io/micronaut/web/router/uri/UriUtil.java", "/workspace/router/src/main/java/io/micronaut/web/router/version/ConfigurationDefaultVersionProvider.java", "/workspace/router/src/main/java/io/micronaut/web/router/version/DefaultVersionProvider.java", "/workspace/router/src/main/java/io/micronaut/web/router/version/RouteVersionFilter.java", "/workspace/router/src/main/java/io/micronaut/web/router/version/RoutesVersioningConfiguration.java", "/workspace/router/src/main/java/io/micronaut/web/router/version/VersionAwareRouterListener.java", "/workspace/router/src/main/java/io/micronaut/web/router/version/VersionRouteMatchFilter.java", "/workspace/router/src/main/java/io/micronaut/web/router/version/package-info.java", "/workspace/router/src/main/java/io/micronaut/web/router/version/resolution/HeaderVersionResolver.java", "/workspace/router/src/main/java/io/micronaut/web/router/version/resolution/HeaderVersionResolverConfiguration.java", "/workspace/router/src/main/java/io/micronaut/web/router/version/resolution/ParameterVersionResolver.java", "/workspace/router/src/main/java/io/micronaut/web/router/version/resolution/ParameterVersionResolverConfiguration.java", "/workspace/router/src/main/java/io/micronaut/web/router/version/resolution/RequestVersionResolver.java", "/workspace/router/src/main/java/io/micronaut/web/router/version/resolution/VersionResolver.java", "/workspace/router/src/main/java/io/micronaut/web/router/version/resolution/package-info.java", "/workspace/runtime/build.gradle.kts", "/workspace/runtime-osx/README.md", "/workspace/runtime-osx/build.gradle.kts", "/workspace/runtime-osx/src/main/java/io/micronaut/scheduling/io/watch/osx/MacOsWatchServiceFactory.java", "/workspace/runtime-osx/src/main/java/io/micronaut/scheduling/io/watch/osx/MacOsWatchThread.java", "/workspace/runtime-osx/src/main/java/io/micronaut/scheduling/io/watch/osx/package-info.java", "/workspace/settings.gradle", "/workspace/setup.sh", "/workspace/src/main/docs/guide/aop/adapterAdvice.adoc", "/workspace/src/main/docs/guide/aop/aroundAdvice.adoc", "/workspace/src/main/docs/guide/aop/caching.adoc", "/workspace/src/main/docs/guide/aop/introductionAdvice.adoc", "/workspace/src/main/docs/guide/aop/lifecycleAdvice.adoc", "/workspace/src/main/docs/guide/aop/retry.adoc", "/workspace/src/main/docs/guide/aop/scheduling.adoc", "/workspace/src/main/docs/guide/aop/springAop.adoc", "/workspace/src/main/docs/guide/aop/validation.adoc", "/workspace/src/main/docs/guide/aop.adoc", "/workspace/src/main/docs/guide/appendix/architecture/annotationArch.adoc", "/workspace/src/main/docs/guide/appendix/architecture/aopArch.adoc", "/workspace/src/main/docs/guide/appendix/architecture/compilerArch.adoc", "/workspace/src/main/docs/guide/appendix/architecture/containerArch.adoc", "/workspace/src/main/docs/guide/appendix/architecture/httpServerArch.adoc", "/workspace/src/main/docs/guide/appendix/architecture/introspectionArch.adoc", "/workspace/src/main/docs/guide/appendix/architecture/iocArch.adoc", "/workspace/src/main/docs/guide/appendix/architecture.adoc", "/workspace/src/main/docs/guide/appendix/breaks.adoc", "/workspace/src/main/docs/guide/appendix/faq.adoc", "/workspace/src/main/docs/guide/appendix/problems.adoc", "/workspace/src/main/docs/guide/appendix/usingsnapshots.adoc", "/workspace/src/main/docs/guide/appendix.adoc", "/workspace/src/main/docs/guide/certificates.adoc", "/workspace/src/main/docs/guide/cli/commands.adoc", "/workspace/src/main/docs/guide/cli/createProject/comparingVersions.adoc", "/workspace/src/main/docs/guide/cli/createProject.adoc", "/workspace/src/main/docs/guide/cli/features.adoc", "/workspace/src/main/docs/guide/cli/proxy.adoc", "/workspace/src/main/docs/guide/cli/reloading/automaticRestart.adoc", "/workspace/src/main/docs/guide/cli/reloading/gradleReload.adoc", "/workspace/src/main/docs/guide/cli/reloading/ideReload.adoc", "/workspace/src/main/docs/guide/cli/reloading/jrebel.adoc", "/workspace/src/main/docs/guide/cli/reloading/springloaded.adoc", "/workspace/src/main/docs/guide/cli/reloading.adoc", "/workspace/src/main/docs/guide/cli.adoc", "/workspace/src/main/docs/guide/cloud/clientSideLoadBalancing/netflixRibbon.adoc", "/workspace/src/main/docs/guide/cloud/clientSideLoadBalancing.adoc", "/workspace/src/main/docs/guide/cloud/cloudConfiguration/distributedConfiguration.adoc", "/workspace/src/main/docs/guide/cloud/cloudConfiguration/distributedConfigurationAwsParameterStore.adoc", "/workspace/src/main/docs/guide/cloud/cloudConfiguration/distributedConfigurationConsul.adoc", "/workspace/src/main/docs/guide/cloud/cloudConfiguration/distributedConfigurationGoogleCloudSecretManager.adoc", "/workspace/src/main/docs/guide/cloud/cloudConfiguration/distributedConfigurationKubernetes.adoc", "/workspace/src/main/docs/guide/cloud/cloudConfiguration/distributedConfigurationOracleCloudVault.adoc", "/workspace/src/main/docs/guide/cloud/cloudConfiguration/distributedConfigurationSpringCloud.adoc", "/workspace/src/main/docs/guide/cloud/cloudConfiguration/distributedConfigurationVault.adoc", "/workspace/src/main/docs/guide/cloud/cloudConfiguration.adoc", "/workspace/src/main/docs/guide/cloud/distributedTracing.adoc", "/workspace/src/main/docs/guide/cloud/lambdaFunctions.adoc", "/workspace/src/main/docs/guide/cloud/serviceDiscovery/serviceDiscoveryConsul.adoc", "/workspace/src/main/docs/guide/cloud/serviceDiscovery/serviceDiscoveryEureka.adoc", "/workspace/src/main/docs/guide/cloud/serviceDiscovery/serviceDiscoveryKubernetes.adoc", "/workspace/src/main/docs/guide/cloud/serviceDiscovery/serviceDiscoveryManual.adoc", "/workspace/src/main/docs/guide/cloud/serviceDiscovery/serviceDiscoveryRoute53.adoc", "/workspace/src/main/docs/guide/cloud/serviceDiscovery.adoc", "/workspace/src/main/docs/guide/cloud.adoc", "/workspace/src/main/docs/guide/commandLineApps/picocli.adoc", "/workspace/src/main/docs/guide/commandLineApps.adoc", "/workspace/src/main/docs/guide/config/banner.adoc", "/workspace/src/main/docs/guide/config/bootstrap.adoc", "/workspace/src/main/docs/guide/config/configurationProperties.adoc", "/workspace/src/main/docs/guide/config/customTypeConverter.adoc", "/workspace/src/main/docs/guide/config/customTypeConverters.adoc", "/workspace/src/main/docs/guide/config/eachBean.adoc", "/workspace/src/main/docs/guide/config/eachProperty.adoc", "/workspace/src/main/docs/guide/config/environments/defaultEnvironment.adoc", "/workspace/src/main/docs/guide/config/environments/disablingEnvironmentDetection.adoc", "/workspace/src/main/docs/guide/config/environments/environmentPriority.adoc", "/workspace/src/main/docs/guide/config/environments.adoc", "/workspace/src/main/docs/guide/config/evaluatedExpressions.adoc", "/workspace/src/main/docs/guide/config/immutableConfig.adoc", "/workspace/src/main/docs/guide/config/jmx.adoc", "/workspace/src/main/docs/guide/config/propertySource.adoc", "/workspace/src/main/docs/guide/config/validation.adoc", "/workspace/src/main/docs/guide/config/valueAnnotation.adoc", "/workspace/src/main/docs/guide/config.adoc", "/workspace/src/main/docs/guide/configurations/dataAccess/cassandraSupport.adoc", "/workspace/src/main/docs/guide/configurations/dataAccess/flywaySupport.adoc", "/workspace/src/main/docs/guide/configurations/dataAccess/hibernateSupport.adoc", "/workspace/src/main/docs/guide/configurations/dataAccess/liquibaseSupport.adoc", "/workspace/src/main/docs/guide/configurations/dataAccess/mongoSupport.adoc", "/workspace/src/main/docs/guide/configurations/dataAccess/mysqlSupport.adoc", "/workspace/src/main/docs/guide/configurations/dataAccess/neo4jSupport.adoc", "/workspace/src/main/docs/guide/configurations/dataAccess/postgresSupport.adoc", "/workspace/src/main/docs/guide/configurations/dataAccess/redisSupport.adoc", "/workspace/src/main/docs/guide/configurations/dataAccess/sqlSupport.adoc", "/workspace/src/main/docs/guide/configurations/dataAccess.adoc", "/workspace/src/main/docs/guide/configurations/otherConfigurations/rabbitmq.adoc", "/workspace/src/main/docs/guide/configurations/otherConfigurations.adoc", "/workspace/src/main/docs/guide/configurations/reactiveConfigs/reactor.adoc", "/workspace/src/main/docs/guide/configurations/reactiveConfigs/rxjava1.adoc", "/workspace/src/main/docs/guide/configurations/reactiveConfigs/rxjava2.adoc", "/workspace/src/main/docs/guide/configurations/reactiveConfigs/rxjava3.adoc", "/workspace/src/main/docs/guide/configurations/reactiveConfigs.adoc", "/workspace/src/main/docs/guide/configurations.adoc", "/workspace/src/main/docs/guide/contextPropagation/httpFilterContextPropagation.adoc", "/workspace/src/main/docs/guide/contextPropagation/reactorContextPropagation.adoc", "/workspace/src/main/docs/guide/contextPropagation.adoc", "/workspace/src/main/docs/guide/httpClient/clientAnnotation/clientAnnotationStreaming.adoc", "/workspace/src/main/docs/guide/httpClient/clientAnnotation/clientError.adoc", "/workspace/src/main/docs/guide/httpClient/clientAnnotation/clientFallback.adoc", "/workspace/src/main/docs/guide/httpClient/clientAnnotation/clientHeaders.adoc", "/workspace/src/main/docs/guide/httpClient/clientAnnotation/clientJackson.adoc", "/workspace/src/main/docs/guide/httpClient/clientAnnotation/clientParameters.adoc", "/workspace/src/main/docs/guide/httpClient/clientAnnotation/clientRetry.adoc", "/workspace/src/main/docs/guide/httpClient/clientAnnotation/netflixHystrix.adoc", "/workspace/src/main/docs/guide/httpClient/clientAnnotation.adoc", "/workspace/src/main/docs/guide/httpClient/clientFilter.adoc", "/workspace/src/main/docs/guide/httpClient/clientHttp2.adoc", "/workspace/src/main/docs/guide/httpClient/clientHttp3.adoc", "/workspace/src/main/docs/guide/httpClient/clientSample.adoc", "/workspace/src/main/docs/guide/httpClient/httpClientImplementations/jdkHttpClient.adoc", "/workspace/src/main/docs/guide/httpClient/httpClientImplementations/nettyHttpClient.adoc", "/workspace/src/main/docs/guide/httpClient/httpClientImplementations.adoc", "/workspace/src/main/docs/guide/httpClient/lowLevelHttpClient/bindErrors.adoc", "/workspace/src/main/docs/guide/httpClient/lowLevelHttpClient/clientBasics.adoc", "/workspace/src/main/docs/guide/httpClient/lowLevelHttpClient/clientConfiguration.adoc", "/workspace/src/main/docs/guide/httpClient/lowLevelHttpClient/clientPostRequests.adoc", "/workspace/src/main/docs/guide/httpClient/lowLevelHttpClient/clientStreaming.adoc", "/workspace/src/main/docs/guide/httpClient/lowLevelHttpClient/clientUploads.adoc", "/workspace/src/main/docs/guide/httpClient/lowLevelHttpClient/lowLevelClientError.adoc", "/workspace/src/main/docs/guide/httpClient/lowLevelHttpClient.adoc", "/workspace/src/main/docs/guide/httpClient/lowLevelOrHighLevel.adoc", "/workspace/src/main/docs/guide/httpClient/nettyPooling.adoc", "/workspace/src/main/docs/guide/httpClient/proxyClient.adoc", "/workspace/src/main/docs/guide/httpClient.adoc", "/workspace/src/main/docs/guide/httpServer/apiVersioning.adoc", "/workspace/src/main/docs/guide/httpServer/binding.adoc", "/workspace/src/main/docs/guide/httpServer/byteBody/byteBodyExample.adoc", "/workspace/src/main/docs/guide/httpServer/byteBody/byteBodyPrimary.adoc", "/workspace/src/main/docs/guide/httpServer/byteBody/byteBodySplitting.adoc", "/workspace/src/main/docs/guide/httpServer/byteBody.adoc", "/workspace/src/main/docs/guide/httpServer/clientIpAddress.adoc", "/workspace/src/main/docs/guide/httpServer/consumesAnnotation.adoc", "/workspace/src/main/docs/guide/httpServer/contentNegotiation.adoc", "/workspace/src/main/docs/guide/httpServer/customArgumentBinding.adoc", "/workspace/src/main/docs/guide/httpServer/datavalidation/validationGroups.adoc", "/workspace/src/main/docs/guide/httpServer/datavalidation.adoc", "/workspace/src/main/docs/guide/httpServer/errorHandling/errorFormatting.adoc", "/workspace/src/main/docs/guide/httpServer/errorHandling/exceptionHandler/builtInExceptionHandlers.adoc", "/workspace/src/main/docs/guide/httpServer/errorHandling/exceptionHandler/customExceptionHandler.adoc", "/workspace/src/main/docs/guide/httpServer/errorHandling/exceptionHandler.adoc", "/workspace/src/main/docs/guide/httpServer/errorHandling/globalErrorHandling.adoc", "/workspace/src/main/docs/guide/httpServer/errorHandling/localErrorHandling.adoc", "/workspace/src/main/docs/guide/httpServer/errorHandling/statusHandlers.adoc", "/workspace/src/main/docs/guide/httpServer/errorHandling.adoc", "/workspace/src/main/docs/guide/httpServer/filters/filterPatterns.adoc", "/workspace/src/main/docs/guide/httpServer/filters/filtermethods/continuations.adoc", "/workspace/src/main/docs/guide/httpServer/filters/filtermethods/errorStates.adoc", "/workspace/src/main/docs/guide/httpServer/filters/filtermethods/filtermethodproceed.adoc", "/workspace/src/main/docs/guide/httpServer/filters/filtermethods/filtermethodsexample.adoc", "/workspace/src/main/docs/guide/httpServer/filters/filtermethods/order.adoc", "/workspace/src/main/docs/guide/httpServer/filters/filtermethods.adoc", "/workspace/src/main/docs/guide/httpServer/filters/httpServerFilter/httpServerFilterErrorStates.adoc", "/workspace/src/main/docs/guide/httpServer/filters/httpServerFilter/httpServerFilterExample.adoc", "/workspace/src/main/docs/guide/httpServer/filters/httpServerFilter.adoc", "/workspace/src/main/docs/guide/httpServer/filters.adoc", "/workspace/src/main/docs/guide/httpServer/formData.adoc", "/workspace/src/main/docs/guide/httpServer/graphql.adoc", "/workspace/src/main/docs/guide/httpServer/hostResolution.adoc", "/workspace/src/main/docs/guide/httpServer/http2Server.adoc", "/workspace/src/main/docs/guide/httpServer/http3Server.adoc", "/workspace/src/main/docs/guide/httpServer/jsonBinding/bindingUsingCompletableFuture.adoc", "/workspace/src/main/docs/guide/httpServer/jsonBinding/bindingUsingPOJOs.adoc", "/workspace/src/main/docs/guide/httpServer/jsonBinding/bindingUsingReactiveFrameworks.adoc", "/workspace/src/main/docs/guide/httpServer/jsonBinding/jacksonConfiguration/jacksonConfigurationBeans.adoc", "/workspace/src/main/docs/guide/httpServer/jsonBinding/jacksonConfiguration/jacksonConfigurationFeatures.adoc", "/workspace/src/main/docs/guide/httpServer/jsonBinding/jacksonConfiguration/jacksonConfigurationFurtherCustomisingJsonFactory.adoc", "/workspace/src/main/docs/guide/httpServer/jsonBinding/jacksonConfiguration/jacksonConfigurationNumberPrecision.adoc", "/workspace/src/main/docs/guide/httpServer/jsonBinding/jacksonConfiguration/jacksonConfigurationServiceLoader.adoc", "/workspace/src/main/docs/guide/httpServer/jsonBinding/jacksonConfiguration/jacksonConfigurationSupportForJsonView.adoc", "/workspace/src/main/docs/guide/httpServer/jsonBinding/jacksonConfiguration.adoc", "/workspace/src/main/docs/guide/httpServer/jsonBinding/jsonMapper.adoc", "/workspace/src/main/docs/guide/httpServer/jsonBinding/serializationUsingJacksonDatabind.adoc", "/workspace/src/main/docs/guide/httpServer/jsonBinding/serializeUsingMicronautSerialization.adoc", "/workspace/src/main/docs/guide/httpServer/jsonBinding.adoc", "/workspace/src/main/docs/guide/httpServer/localeResolution.adoc", "/workspace/src/main/docs/guide/httpServer/openapi.adoc", "/workspace/src/main/docs/guide/httpServer/plainTextResponses.adoc", "/workspace/src/main/docs/guide/httpServer/producesAnnotation.adoc", "/workspace/src/main/docs/guide/httpServer/reactiveServer/bodyAnnotation.adoc", "/workspace/src/main/docs/guide/httpServer/reactiveServer/reactiveResponses.adoc", "/workspace/src/main/docs/guide/httpServer/reactiveServer.adoc", "/workspace/src/main/docs/guide/httpServer/requestResponse.adoc", "/workspace/src/main/docs/guide/httpServer/routing.adoc", "/workspace/src/main/docs/guide/httpServer/runningServer.adoc", "/workspace/src/main/docs/guide/httpServer/runningSpecificPort.adoc", "/workspace/src/main/docs/guide/httpServer/serverConfiguration/accessLogger.adoc", "/workspace/src/main/docs/guide/httpServer/serverConfiguration/cors/annotationBasedCors.adoc", "/workspace/src/main/docs/guide/httpServer/serverConfiguration/cors/corsAllowCredentials.adoc", "/workspace/src/main/docs/guide/httpServer/serverConfiguration/cors/corsAllowPrivateNetwork.adoc", "/workspace/src/main/docs/guide/httpServer/serverConfiguration/cors/corsAllowedHeaders.adoc", "/workspace/src/main/docs/guide/httpServer/serverConfiguration/cors/corsAllowedMethods.adoc", "/workspace/src/main/docs/guide/httpServer/serverConfiguration/cors/corsAllowedOrigins.adoc", "/workspace/src/main/docs/guide/httpServer/serverConfiguration/cors/corsConfiguration.adoc", "/workspace/src/main/docs/guide/httpServer/serverConfiguration/cors/corsExposedHeaders.adoc", "/workspace/src/main/docs/guide/httpServer/serverConfiguration/cors/corsMaxAge.adoc", "/workspace/src/main/docs/guide/httpServer/serverConfiguration/cors/corsMultipleHeaderValues.adoc", "/workspace/src/main/docs/guide/httpServer/serverConfiguration/cors.adoc", "/workspace/src/main/docs/guide/httpServer/serverConfiguration/dualProtocol.adoc", "/workspace/src/main/docs/guide/httpServer/serverConfiguration/https.adoc", "/workspace/src/main/docs/guide/httpServer/serverConfiguration/listener.adoc", "/workspace/src/main/docs/guide/httpServer/serverConfiguration/nettyClientPipeline.adoc", "/workspace/src/main/docs/guide/httpServer/serverConfiguration/nettyServerPipeline.adoc", "/workspace/src/main/docs/guide/httpServer/serverConfiguration/secondaryServers.adoc", "/workspace/src/main/docs/guide/httpServer/serverConfiguration/threadPools/atBlocking.adoc", "/workspace/src/main/docs/guide/httpServer/serverConfiguration/threadPools/blockingOperations.adoc", "/workspace/src/main/docs/guide/httpServer/serverConfiguration/threadPools/virtualThreads.adoc", "/workspace/src/main/docs/guide/httpServer/serverConfiguration/threadPools.adoc", "/workspace/src/main/docs/guide/httpServer/serverConfiguration.adoc", "/workspace/src/main/docs/guide/httpServer/serverEvents.adoc", "/workspace/src/main/docs/guide/httpServer/serverIO.adoc", "/workspace/src/main/docs/guide/httpServer/sessions.adoc", "/workspace/src/main/docs/guide/httpServer/sse.adoc", "/workspace/src/main/docs/guide/httpServer/staticResources.adoc", "/workspace/src/main/docs/guide/httpServer/statusAnnotation.adoc", "/workspace/src/main/docs/guide/httpServer/transfers.adoc", "/workspace/src/main/docs/guide/httpServer/uploads.adoc", "/workspace/src/main/docs/guide/httpServer/views.adoc", "/workspace/src/main/docs/guide/httpServer/websocket/websocketClient.adoc", "/workspace/src/main/docs/guide/httpServer/websocket/websocketServer.adoc", "/workspace/src/main/docs/guide/httpServer/websocket.adoc", "/workspace/src/main/docs/guide/httpServer.adoc", "/workspace/src/main/docs/guide/i18n/bundle.adoc", "/workspace/src/main/docs/guide/i18n/localizedMessageSource.adoc", "/workspace/src/main/docs/guide/i18n.adoc", "/workspace/src/main/docs/guide/introduction/upgrading.adoc", "/workspace/src/main/docs/guide/introduction.adoc", "/workspace/src/main/docs/guide/ioc/android.adoc", "/workspace/src/main/docs/guide/ioc/annotationMetadata.adoc", "/workspace/src/main/docs/guide/ioc/beanConfigurations.adoc", "/workspace/src/main/docs/guide/ioc/beanContext.adoc", "/workspace/src/main/docs/guide/ioc/beanImport.adoc", "/workspace/src/main/docs/guide/ioc/beanMappers/beanMappersMerging/beanMappersMergingStrategy.adoc", "/workspace/src/main/docs/guide/ioc/beanMappers/beanMappersMerging.adoc", "/workspace/src/main/docs/guide/ioc/beanMappers.adoc", "/workspace/src/main/docs/guide/ioc/beanValidation.adoc", "/workspace/src/main/docs/guide/ioc/beans.adoc", "/workspace/src/main/docs/guide/ioc/classImport.adoc", "/workspace/src/main/docs/guide/ioc/conditionalBeans.adoc", "/workspace/src/main/docs/guide/ioc/contextEvents.adoc", "/workspace/src/main/docs/guide/ioc/events.adoc", "/workspace/src/main/docs/guide/ioc/factories.adoc", "/workspace/src/main/docs/guide/ioc/gracefulShutdown.adoc", "/workspace/src/main/docs/guide/ioc/how.adoc", "/workspace/src/main/docs/guide/ioc/injection/constructorInjection.adoc", "/workspace/src/main/docs/guide/ioc/injection/fieldInjection.adoc", "/workspace/src/main/docs/guide/ioc/injection/methodInjection.adoc", "/workspace/src/main/docs/guide/ioc/injection/nullableInjection.adoc", "/workspace/src/main/docs/guide/ioc/injection.adoc", "/workspace/src/main/docs/guide/ioc/introspection/accessKind.adoc", "/workspace/src/main/docs/guide/ioc/introspection/atCreator.adoc", "/workspace/src/main/docs/guide/ioc/introspection/atIntrospected.adoc", "/workspace/src/main/docs/guide/ioc/introspection/beanWrapperApi.adoc", "/workspace/src/main/docs/guide/ioc/introspection/introspectExistingAnnotations.adoc", "/workspace/src/main/docs/guide/ioc/introspection/introspectedAccessorsStyle.adoc", "/workspace/src/main/docs/guide/ioc/introspection/introspectedAnnotationOnAConfigurationClass.adoc", "/workspace/src/main/docs/guide/ioc/introspection/introspectionBuilders.adoc", "/workspace/src/main/docs/guide/ioc/introspection/introspectionEnums.adoc", "/workspace/src/main/docs/guide/ioc/introspection/jacksonAndBeanIntrospection.adoc", "/workspace/src/main/docs/guide/ioc/introspection/kotlinAndBeanIntrospection.adoc", "/workspace/src/main/docs/guide/ioc/introspection/makingABeanAvailableForIntrospection.adoc", "/workspace/src/main/docs/guide/ioc/introspection/staticAtCreator.adoc", "/workspace/src/main/docs/guide/ioc/introspection.adoc", "/workspace/src/main/docs/guide/ioc/iocDebugging.adoc", "/workspace/src/main/docs/guide/ioc/lifecycle.adoc", "/workspace/src/main/docs/guide/ioc/mixin.adoc", "/workspace/src/main/docs/guide/ioc/nullabilityAnnotations/jspecify.adoc", "/workspace/src/main/docs/guide/ioc/nullabilityAnnotations.adoc", "/workspace/src/main/docs/guide/ioc/qualifiers.adoc", "/workspace/src/main/docs/guide/ioc/replaces.adoc", "/workspace/src/main/docs/guide/ioc/scopes/builtInScopes/eagerInit.adoc", "/workspace/src/main/docs/guide/ioc/scopes/builtInScopes.adoc", "/workspace/src/main/docs/guide/ioc/scopes/metaScopes.adoc", "/workspace/src/main/docs/guide/ioc/scopes/refreshable.adoc", "/workspace/src/main/docs/guide/ioc/scopes.adoc", "/workspace/src/main/docs/guide/ioc/springBeans.adoc", "/workspace/src/main/docs/guide/ioc/typed.adoc", "/workspace/src/main/docs/guide/ioc/types.adoc", "/workspace/src/main/docs/guide/ioc.adoc", "/workspace/src/main/docs/guide/languageSupport/graal/graalFAQ.adoc", "/workspace/src/main/docs/guide/languageSupport/graal/graalServices.adoc", "/workspace/src/main/docs/guide/languageSupport/graal.adoc", "/workspace/src/main/docs/guide/languageSupport/groovy.adoc", "/workspace/src/main/docs/guide/languageSupport/java/ide.adoc", "/workspace/src/main/docs/guide/languageSupport/java/incrementalannotationgradle.adoc", "/workspace/src/main/docs/guide/languageSupport/java/java9.adoc", "/workspace/src/main/docs/guide/languageSupport/java/lombok.adoc", "/workspace/src/main/docs/guide/languageSupport/java/retainparameternames.adoc", "/workspace/src/main/docs/guide/languageSupport/java.adoc", "/workspace/src/main/docs/guide/languageSupport/kotlin/controller.adoc", "/workspace/src/main/docs/guide/languageSupport/kotlin/coroutineTracingContextPropagation.adoc", "/workspace/src/main/docs/guide/languageSupport/kotlin/coroutines.adoc", "/workspace/src/main/docs/guide/languageSupport/kotlin/gradlekapt.adoc", "/workspace/src/main/docs/guide/languageSupport/kotlin/kapt.adoc", "/workspace/src/main/docs/guide/languageSupport/kotlin/kaptOrKsp.adoc", "/workspace/src/main/docs/guide/languageSupport/kotlin/kaptintellij.adoc", "/workspace/src/main/docs/guide/languageSupport/kotlin/kotlinContextPropagation.adoc", "/workspace/src/main/docs/guide/languageSupport/kotlin/kotlinretainparamnames.adoc", "/workspace/src/main/docs/guide/languageSupport/kotlin/ksp.adoc", "/workspace/src/main/docs/guide/languageSupport/kotlin/openandaop.adoc", "/workspace/src/main/docs/guide/languageSupport/kotlin.adoc", "/workspace/src/main/docs/guide/languageSupport.adoc", "/workspace/src/main/docs/guide/logging/logback.adoc", "/workspace/src/main/docs/guide/logging/loggingConfiguration.adoc", "/workspace/src/main/docs/guide/logging/loggingMessages.adoc", "/workspace/src/main/docs/guide/logging/loggingSystem.adoc", "/workspace/src/main/docs/guide/logging.adoc", "/workspace/src/main/docs/guide/management/buildingEndpoints/endpointAnnotation.adoc", "/workspace/src/main/docs/guide/management/buildingEndpoints/endpointConfiguration.adoc", "/workspace/src/main/docs/guide/management/buildingEndpoints/endpointMethod.adoc", "/workspace/src/main/docs/guide/management/buildingEndpoints/endpointSensitivity.adoc", "/workspace/src/main/docs/guide/management/buildingEndpoints.adoc", "/workspace/src/main/docs/guide/management/providedEndpoints/beansEndpoint.adoc", "/workspace/src/main/docs/guide/management/providedEndpoints/cachesEndpoint.adoc", "/workspace/src/main/docs/guide/management/providedEndpoints/environmentEndpoint.adoc", "/workspace/src/main/docs/guide/management/providedEndpoints/healthEndpoint/deadlockedThreads.adoc", "/workspace/src/main/docs/guide/management/providedEndpoints/healthEndpoint/healthEndpointConfiguration.adoc", "/workspace/src/main/docs/guide/management/providedEndpoints/healthEndpoint/healthEndpointCustomization.adoc", "/workspace/src/main/docs/guide/management/providedEndpoints/healthEndpoint/healthEndpointStatusCode.adoc", "/workspace/src/main/docs/guide/management/providedEndpoints/healthEndpoint/healthLogging.adoc", "/workspace/src/main/docs/guide/management/providedEndpoints/healthEndpoint/healthMonitoringTask.adoc", "/workspace/src/main/docs/guide/management/providedEndpoints/healthEndpoint/healthProvidedIndicators/deadlockedThreads.adoc", "/workspace/src/main/docs/guide/management/providedEndpoints/healthEndpoint/healthProvidedIndicators/discoveryClientHealthIndicator.adoc", "/workspace/src/main/docs/guide/management/providedEndpoints/healthEndpoint/healthProvidedIndicators/diskSpaceHealthIndicator.adoc", "/workspace/src/main/docs/guide/management/providedEndpoints/healthEndpoint/healthProvidedIndicators/jdbcHealthIndicator.adoc", "/workspace/src/main/docs/guide/management/providedEndpoints/healthEndpoint/healthProvidedIndicators.adoc", "/workspace/src/main/docs/guide/management/providedEndpoints/healthEndpoint.adoc", "/workspace/src/main/docs/guide/management/providedEndpoints/infoEndpoint.adoc", "/workspace/src/main/docs/guide/management/providedEndpoints/loggersEndpoint.adoc", "/workspace/src/main/docs/guide/management/providedEndpoints/metricsEndpoint.adoc", "/workspace/src/main/docs/guide/management/providedEndpoints/refreshEndpoint.adoc", "/workspace/src/main/docs/guide/management/providedEndpoints/routesEndpoint.adoc", "/workspace/src/main/docs/guide/management/providedEndpoints/stopEndpoint.adoc", "/workspace/src/main/docs/guide/management/providedEndpoints/threadDumpEndpoint.adoc", "/workspace/src/main/docs/guide/management/providedEndpoints.adoc", "/workspace/src/main/docs/guide/management.adoc", "/workspace/src/main/docs/guide/messaging/kafka.adoc", "/workspace/src/main/docs/guide/messaging/nats.adoc", "/workspace/src/main/docs/guide/messaging/rabbitmq.adoc", "/workspace/src/main/docs/guide/messaging.adoc", "/workspace/src/main/docs/guide/multitenancy.adoc", "/workspace/src/main/docs/guide/quickStart/buildCLI.adoc", "/workspace/src/main/docs/guide/quickStart/creatingClient.adoc", "/workspace/src/main/docs/guide/quickStart/creatingServer.adoc", "/workspace/src/main/docs/guide/quickStart/deployingApp.adoc", "/workspace/src/main/docs/guide/quickStart/ideSetup/eclipseSetup.adoc", "/workspace/src/main/docs/guide/quickStart/ideSetup/ideaSetup.adoc", "/workspace/src/main/docs/guide/quickStart/ideSetup/netbeansSetup.adoc", "/workspace/src/main/docs/guide/quickStart/ideSetup/vsCodeSetup.adoc", "/workspace/src/main/docs/guide/quickStart/ideSetup.adoc", "/workspace/src/main/docs/guide/quickStart.adoc", "/workspace/src/main/docs/guide/resources.adoc", "/workspace/src/main/docs/guide/security.adoc", "/workspace/src/main/docs/guide/serverlessFunctions/awsLambda.adoc", "/workspace/src/main/docs/guide/serverlessFunctions/azureFunction.adoc", "/workspace/src/main/docs/guide/serverlessFunctions/gcpCloudRun.adoc", "/workspace/src/main/docs/guide/serverlessFunctions/gcpFunction.adoc", "/workspace/src/main/docs/guide/serverlessFunctions.adoc", "/workspace/src/main/docs/guide/spring.adoc", "/workspace/src/main/docs/guide/toc.yml", "/workspace/src/main/docs/resources/img/arch/annotationmetadata.png", "/workspace/src/main/docs/resources/img/arch/aop-proxies.png", "/workspace/src/main/docs/resources/img/arch/aop.png", "/workspace/src/main/docs/resources/img/arch/applicationcontext.png", "/workspace/src/main/docs/resources/img/arch/beancontext.png", "/workspace/src/main/docs/resources/img/arch/beanwriter.png", "/workspace/src/main/docs/resources/img/arch/embeddedserver.png", "/workspace/src/main/docs/resources/img/arch/http-server-requestflow.png", "/workspace/src/main/docs/resources/img/arch/httpserver.png", "/workspace/src/main/docs/resources/img/arch/introspections.png", "/workspace/src/main/docs/resources/img/arch/nettybootstrap.png", "/workspace/src/main/docs/resources/img/checkstyle-issue.png", "/workspace/src/main/docs/resources/img/delegatetogradle.png", "/workspace/src/main/docs/resources/img/filter-order.svg", "/workspace/src/main/docs/resources/img/https-certificate.jpg", "/workspace/src/main/docs/resources/img/https-valid-certificate.jpg", "/workspace/src/main/docs/resources/img/https-warning.jpg", "/workspace/src/main/docs/resources/img/installing-tools-for-micronaut-vs-code.gif", "/workspace/src/main/docs/resources/img/intellij-annotation-processors.png", "/workspace/src/main/docs/resources/img/kotlin-run-1.png", "/workspace/src/main/docs/resources/img/kotlin-run-2.png", "/workspace/src/main/docs/resources/img/netbeans-plugins-java-web-ee.png", "/workspace/src/main/docs/resources/img/picocli-example.png", "/workspace/test-inject-kotlin2-ksp2/build.gradle.kts", "/workspace/test-inject-kotlin2-ksp2/gradle.properties", "/workspace/test-inject-kotlin2-test/build.gradle.kts", "/workspace/test-inject-kotlin2-test/src/main/resources/META-INF/services/org.jetbrains.kotlin.compiler.plugin.CompilerPluginRegistrar", "/workspace/test-inject-kotlin2-test/src/main/resources/META-INF/services/org.jetbrains.kotlin.compiler.plugin.ComponentRegistrar", "/workspace/test-suite/build.gradle.kts", "/workspace/test-suite/gradle.properties", "/workspace/test-suite/src/functionalTest/groovy/io/micronaut/context/ApplicationContextConfigurerSpec.groovy", "/workspace/test-suite/src/main/java/example/micronaut/inject/visitor/AnnotatingVisitor.java", "/workspace/test-suite/src/main/java/example/micronaut/inject/visitor/TestAnn.java", "/workspace/test-suite/src/main/java/io/micronaut/docs/expressions/ContextRegistrar.java", "/workspace/test-suite/src/main/java/io/micronaut/docs/expressions/CustomEvaluationContext.java", "/workspace/test-suite/src/main/resources/META-INF/services/io.micronaut.inject.visitor.TypeElementVisitor", "/workspace/test-suite/src/testFixtures/groovy/io/micronaut/fixtures/context/ApplicationContextLoader.groovy", "/workspace/test-suite/src/testFixtures/groovy/io/micronaut/fixtures/context/ApplicationUnderTest.groovy", "/workspace/test-suite/src/testFixtures/groovy/io/micronaut/fixtures/context/MicronautApplicationTest.groovy", "/workspace/test-suite-annotation-remapper/build.gradle.kts", "/workspace/test-suite-annotation-remapper-visitor/build.gradle.kts", "/workspace/test-suite-annotation-remapper-visitor/src/main/java/example/micronaut/AddAnnotationWithEnumVisitor.java", "/workspace/test-suite-annotation-remapper-visitor/src/main/resources/META-INF/services/io.micronaut.inject.visitor.TypeElementVisitor", "/workspace/test-suite-geb/build.gradle.kts", "/workspace/test-suite-groovy/build.gradle.kts", "/workspace/test-suite-groovy/gradle.properties", "/workspace/test-suite-helper/build.gradle.kts", "/workspace/test-suite-helper/gradle.properties", "/workspace/test-suite-helper/src/main/java/io/micronaut/testsuitehelper/TestGeneratingAnnotationProcessor.java", "/workspace/test-suite-helper/src/main/resources/META-INF/services/javax.annotation.processing.Processor", "/workspace/test-suite-http-client-jdk-ssl/build.gradle.kts", "/workspace/test-suite-http-client-tck-jdk/build.gradle.kts", "/workspace/test-suite-http-client-tck-netty/build.gradle.kts", "/workspace/test-suite-http-server-tck-jdk/build.gradle.kts", "/workspace/test-suite-http-server-tck-netty/build.gradle.kts", "/workspace/test-suite-http2-server-tck-netty/build.gradle.kts", "/workspace/test-suite-jakarta-inject-bean-import/build.gradle", "/workspace/test-suite-javax-inject/build.gradle.kts", "/workspace/test-suite-kotlin/build.gradle.kts", "/workspace/test-suite-kotlin/gradle.properties", "/workspace/test-suite-kotlin-graalvm/build.gradle.kts", "/workspace/test-suite-kotlin-ksp/build.gradle.kts", "/workspace/test-suite-kotlin-ksp/gradle.properties", "/workspace/test-suite-kotlin-ksp-all-open/build.gradle.kts", "/workspace/test-suite-kotlin-ksp-all-open/gradle.properties", "/workspace/test-suite-kotlin2-ksp2/build.gradle.kts", "/workspace/test-suite-kotlin2-ksp2/gradle.properties", "/workspace/test-suite-logback/build.gradle.kts", "/workspace/test-suite-logback-external-configuration/build.gradle.kts", "/workspace/test-suite-logback-external-configuration/src/external/external-logback.xml", "/workspace/test-suite-logback-graalvm/build.gradle.kts", "/workspace/test-suite-netty-ssl-graalvm/build.gradle.kts", "/workspace/test-utils/build.gradle.kts", "/workspace/test-utils/gradle.properties", "/workspace/test-utils/src/main/groovy/io.micronaut.testutils/YamlAsciidocTagCleaner.groovy", "/workspace/websocket/build.gradle.kts", "/workspace/websocket/src/main/java/io/micronaut/websocket/CloseReason.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/WebSocketBroadcaster.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/WebSocketClient.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/WebSocketClientFactory.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/WebSocketClientFactoryResolver.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/WebSocketClientRegistry.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/WebSocketPongMessage.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/WebSocketSession.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/WebSocketVersion.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/annotation/ClientWebSocket.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/annotation/OnClose.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/annotation/OnError.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/annotation/OnMessage.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/annotation/OnOpen.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/annotation/ServerWebSocket.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/annotation/WebSocketComponent.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/annotation/WebSocketMapping.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/annotation/package-info.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/bind/WebSocketState.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/bind/WebSocketStateBinder.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/bind/WebSocketStateBinderRegistry.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/bind/package-info.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/context/DefaultWebSocketBeanRegistry.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/context/WebSocketBean.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/context/WebSocketBeanRegistry.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/context/package-info.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/event/WebSocketEvent.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/event/WebSocketMessageProcessedEvent.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/event/WebSocketSessionClosedEvent.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/event/WebSocketSessionOpenEvent.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/event/package-info.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/exceptions/WebSocketClientException.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/exceptions/WebSocketException.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/exceptions/WebSocketSessionException.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/exceptions/package-info.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/interceptor/ClientWebSocketInterceptor.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/interceptor/WebSocketSessionAware.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/interceptor/package-info.java", "/workspace/websocket/src/main/java/io/micronaut/websocket/package-info.java"]}, "results": [{"check_id": "java.lang.security.audit.unsafe-reflection.unsafe-reflection", "end": {"col": 72, "line": 188, "offset": 7037}, "extra": {"engine_kind": "OSS", "fingerprint": "8bdb540ba758d919a49dec1ebfbe0fc156fa7bf0e6ddbbb58175da82f04ddab66f7dde05e14ece67bafd10634ebf2567e0bc371939a953edc371fb375e14e453_0", "is_ignored": false, "lines": "                (Class<S>) Class.forName(className, false, classLoader);", "message": "If an attacker can supply values that the application then uses to determine which class to instantiate or which method to invoke, the potential exists for the attacker to create control flow paths through the application that were not intended by the application developers. This attack vector may allow the attacker to bypass authentication or access control checks or otherwise cause the application to behave in an unexpected manner.", "metadata": {"category": "security", "confidence": "LOW", "cwe": ["CWE-470: Use of Externally-Controlled Input to Select Classes or Code ('Unsafe Reflection')"], "impact": "LOW", "license": "Semgrep Rules License v1.0. For more details, visit semgrep.dev/legal/rules-license", "likelihood": "LOW", "owasp": ["A03:2021 - Injection"], "references": ["https://owasp.org/Top10/A03_2021-Injection"], "semgrep.dev": {"rule": {"origin": "community", "r_id": 9993, "rule_id": "DbUW1W", "rv_id": 945704, "url": "https://semgrep.dev/playground/r/3ZTOP7Q/java.lang.security.audit.unsafe-reflection.unsafe-reflection", "version_id": "3ZTOP7Q"}}, "shortlink": "https://sg.run/R8X8", "source": "https://semgrep.dev/r/java.lang.security.audit.unsafe-reflection.unsafe-reflection", "source-rule-url": "https://owasp.org/www-community/vulnerabilities/Unsafe_use_of_Reflection", "subcategory": ["audit"], "technology": ["java"], "vulnerability_class": ["Improper Authorization"]}, "metavars": {"$CLASS": {"abstract_content": "className", "end": {"col": 51, "line": 188, "offset": 7016}, "start": {"col": 42, "line": 188, "offset": 7007}}}, "severity": "WARNING", "validation_state": "NO_VALIDATOR"}, "path": "/workspace/core/src/main/java/io/micronaut/core/io/service/MicronautMetaServiceLoaderUtils.java", "start": {"col": 28, "line": 188, "offset": 6993}}, {"check_id": "java.lang.security.audit.unsafe-reflection.unsafe-reflection", "end": {"col": 80, "line": 185, "offset": 7213}, "extra": {"engine_kind": "OSS", "fingerprint": "03d7d69f792a421d692e6949e58cfd91a6ab08898f56833d4bf0dba2cdcb036ff127cd306048e4ac3b5a528d6153bcd00e03ad849c820913266b9e81eadb3cfd_0", "is_ignored": false, "lines": "                        (Class<S>) Class.forName(className, false, classLoader);", "message": "If an attacker can supply values that the application then uses to determine which class to instantiate or which method to invoke, the potential exists for the attacker to create control flow paths through the application that were not intended by the application developers. This attack vector may allow the attacker to bypass authentication or access control checks or otherwise cause the application to behave in an unexpected manner.", "metadata": {"category": "security", "confidence": "LOW", "cwe": ["CWE-470: Use of Externally-Controlled Input to Select Classes or Code ('Unsafe Reflection')"], "impact": "LOW", "license": "Semgrep Rules License v1.0. For more details, visit semgrep.dev/legal/rules-license", "likelihood": "LOW", "owasp": ["A03:2021 - Injection"], "references": ["https://owasp.org/Top10/A03_2021-Injection"], "semgrep.dev": {"rule": {"origin": "community", "r_id": 9993, "rule_id": "DbUW1W", "rv_id": 945704, "url": "https://semgrep.dev/playground/r/3ZTOP7Q/java.lang.security.audit.unsafe-reflection.unsafe-reflection", "version_id": "3ZTOP7Q"}}, "shortlink": "https://sg.run/R8X8", "source": "https://semgrep.dev/r/java.lang.security.audit.unsafe-reflection.unsafe-reflection", "source-rule-url": "https://owasp.org/www-community/vulnerabilities/Unsafe_use_of_Reflection", "subcategory": ["audit"], "technology": ["java"], "vulnerability_class": ["Improper Authorization"]}, "metavars": {"$CLASS": {"abstract_content": "className", "end": {"col": 59, "line": 185, "offset": 7192}, "start": {"col": 50, "line": 185, "offset": 7183}}}, "severity": "WARNING", "validation_state": "NO_VALIDATOR"}, "path": "/workspace/core/src/main/java/io/micronaut/core/io/service/SoftServiceLoader.java", "start": {"col": 36, "line": 185, "offset": 7169}}, {"check_id": "java.lang.security.audit.unsafe-reflection.unsafe-reflection", "end": {"col": 104, "line": 253, "offset": 9814}, "extra": {"engine_kind": "OSS", "fingerprint": "a1e165083df88ba529cab19b2774607d0f44930b7f35f98576ec7bd52029ddd7d869c9894bc53d8b0a15396aaa6c5e5fd69bdd17009d96b998b00c4b10d09303_0", "is_ignored": false, "lines": "                        final Class<S> loadedClass = (Class<S>) Class.forName(name, false, classLoader);", "message": "If an attacker can supply values that the application then uses to determine which class to instantiate or which method to invoke, the potential exists for the attacker to create control flow paths through the application that were not intended by the application developers. This attack vector may allow the attacker to bypass authentication or access control checks or otherwise cause the application to behave in an unexpected manner.", "metadata": {"category": "security", "confidence": "LOW", "cwe": ["CWE-470: Use of Externally-Controlled Input to Select Classes or Code ('Unsafe Reflection')"], "impact": "LOW", "license": "Semgrep Rules License v1.0. For more details, visit semgrep.dev/legal/rules-license", "likelihood": "LOW", "owasp": ["A03:2021 - Injection"], "references": ["https://owasp.org/Top10/A03_2021-Injection"], "semgrep.dev": {"rule": {"origin": "community", "r_id": 9993, "rule_id": "DbUW1W", "rv_id": 945704, "url": "https://semgrep.dev/playground/r/3ZTOP7Q/java.lang.security.audit.unsafe-reflection.unsafe-reflection", "version_id": "3ZTOP7Q"}}, "shortlink": "https://sg.run/R8X8", "source": "https://semgrep.dev/r/java.lang.security.audit.unsafe-reflection.unsafe-reflection", "source-rule-url": "https://owasp.org/www-community/vulnerabilities/Unsafe_use_of_Reflection", "subcategory": ["audit"], "technology": ["java"], "vulnerability_class": ["Improper Authorization"]}, "metavars": {"$CLASS": {"abstract_content": "name", "end": {"col": 83, "line": 253, "offset": 9793}, "start": {"col": 79, "line": 253, "offset": 9789}}}, "severity": "WARNING", "validation_state": "NO_VALIDATOR"}, "path": "/workspace/core/src/main/java/io/micronaut/core/io/service/SoftServiceLoader.java", "start": {"col": 65, "line": 253, "offset": 9775}}, {"check_id": "java.lang.security.audit.crypto.unencrypted-socket.unencrypted-socket", "end": {"col": 42, "line": 89, "offset": 2760}, "extra": {"engine_kind": "OSS", "fingerprint": "91546b4cf6d52f3932a114a1322d07b562fd7ee85b206190699866abf82ac32cba1eed7d2181eab25f223cbf2e1caa71f611192adcb8084da078361b2d0f0227_0", "is_ignored": false, "lines": "        try (Socket socket = new Socket()) {", "message": "Detected use of a Java socket that is not encrypted. As a result, the traffic could be read by an attacker intercepting the network traffic. Use an SSLSocket created by 'SSLSocketFactory' or 'SSLServerSocketFactory' instead.", "metadata": {"asvs": {"control_id": "6.2.5 Insecure Algorithm", "control_url": "https://github.com/OWASP/ASVS/blob/master/4.0/en/0x14-V6-Cryptography.md#v62-algorithms", "section": "V6 Stored Cryptography Verification Requirements", "version": "4"}, "category": "security", "confidence": "HIGH", "cwe": ["CWE-319: Cleartext Transmission of Sensitive Information"], "functional-categories": ["net::search::crypto-config::java.net"], "impact": "MEDIUM", "license": "Semgrep Rules License v1.0. For more details, visit semgrep.dev/legal/rules-license", "likelihood": "MEDIUM", "owasp": ["A03:2017 - Sensitive Data Exposure", "A02:2021 - Cryptographic Failures"], "references": ["https://owasp.org/Top10/A02_2021-Cryptographic_Failures"], "semgrep.dev": {"rule": {"origin": "community", "r_id": 9197, "rule_id": "BYUN3X", "rv_id": 945666, "url": "https://semgrep.dev/playground/r/RGTAgw9/java.lang.security.audit.crypto.unencrypted-socket.unencrypted-socket", "version_id": "RGTAgw9"}}, "shortlink": "https://sg.run/W8zA", "source": "https://semgrep.dev/r/java.lang.security.audit.crypto.unencrypted-socket.unencrypted-socket", "source-rule-url": "https://find-sec-bugs.github.io/bugs.htm#UNENCRYPTED_SOCKET", "subcategory": ["vuln"], "technology": ["java"], "vulnerability_class": ["Mishandled Sensitive Information"]}, "metavars": {}, "severity": "WARNING", "validation_state": "NO_VALIDATOR"}, "path": "/workspace/core/src/main/java/io/micronaut/core/io/socket/SocketUtils.java", "start": {"col": 30, "line": 89, "offset": 2748}}, {"check_id": "java.lang.security.audit.unsafe-reflection.unsafe-reflection", "end": {"col": 71, "line": 311, "offset": 12221}, "extra": {"engine_kind": "OSS", "fingerprint": "26ed8aaec0c4f4c30414fbeed0f86c2f133bcfad406fdb22774eb47b41510fa54a2aab29c7da8afda511a9b7c68ae86ac85b38d009268e63c19b89560a3a5e33_0", "is_ignored": false, "lines": "                Class<?> type = Class.forName(name, true, classLoader);", "message": "If an attacker can supply values that the application then uses to determine which class to instantiate or which method to invoke, the potential exists for the attacker to create control flow paths through the application that were not intended by the application developers. This attack vector may allow the attacker to bypass authentication or access control checks or otherwise cause the application to behave in an unexpected manner.", "metadata": {"category": "security", "confidence": "LOW", "cwe": ["CWE-470: Use of Externally-Controlled Input to Select Classes or Code ('Unsafe Reflection')"], "impact": "LOW", "license": "Semgrep Rules License v1.0. For more details, visit semgrep.dev/legal/rules-license", "likelihood": "LOW", "owasp": ["A03:2021 - Injection"], "references": ["https://owasp.org/Top10/A03_2021-Injection"], "semgrep.dev": {"rule": {"origin": "community", "r_id": 9993, "rule_id": "DbUW1W", "rv_id": 945704, "url": "https://semgrep.dev/playground/r/3ZTOP7Q/java.lang.security.audit.unsafe-reflection.unsafe-reflection", "version_id": "3ZTOP7Q"}}, "shortlink": "https://sg.run/R8X8", "source": "https://semgrep.dev/r/java.lang.security.audit.unsafe-reflection.unsafe-reflection", "source-rule-url": "https://owasp.org/www-community/vulnerabilities/Unsafe_use_of_Reflection", "subcategory": ["audit"], "technology": ["java"], "vulnerability_class": ["Improper Authorization"]}, "metavars": {"$CLASS": {"abstract_content": "name", "end": {"col": 51, "line": 311, "offset": 12201}, "start": {"col": 47, "line": 311, "offset": 12197}}}, "severity": "WARNING", "validation_state": "NO_VALIDATOR"}, "path": "/workspace/core/src/main/java/io/micronaut/core/reflect/ClassUtils.java", "start": {"col": 33, "line": 311, "offset": 12183}}, {"check_id": "java.lang.security.audit.unsafe-reflection.unsafe-reflection", "end": {"col": 92, "line": 54, "offset": 1953}, "extra": {"engine_kind": "OSS", "fingerprint": "99f5784e65bbeb009dbe829c3b731feaa85fe3c8574fcf25b5a53212eb73faf11cdfeaaafe3a7d5b5e9ee401d94450b3fc1df801fd2cb5b5864600a0da9a6bb4_0", "is_ignored": false, "lines": "                        class1 = Class.forName(type1.replace('/', '.'), false, classLoader);", "message": "If an attacker can supply values that the application then uses to determine which class to instantiate or which method to invoke, the potential exists for the attacker to create control flow paths through the application that were not intended by the application developers. This attack vector may allow the attacker to bypass authentication or access control checks or otherwise cause the application to behave in an unexpected manner.", "metadata": {"category": "security", "confidence": "LOW", "cwe": ["CWE-470: Use of Externally-Controlled Input to Select Classes or Code ('Unsafe Reflection')"], "impact": "LOW", "license": "Semgrep Rules License v1.0. For more details, visit semgrep.dev/legal/rules-license", "likelihood": "LOW", "owasp": ["A03:2021 - Injection"], "references": ["https://owasp.org/Top10/A03_2021-Injection"], "semgrep.dev": {"rule": {"origin": "community", "r_id": 9993, "rule_id": "DbUW1W", "rv_id": 945704, "url": "https://semgrep.dev/playground/r/3ZTOP7Q/java.lang.security.audit.unsafe-reflection.unsafe-reflection", "version_id": "3ZTOP7Q"}}, "shortlink": "https://sg.run/R8X8", "source": "https://semgrep.dev/r/java.lang.security.audit.unsafe-reflection.unsafe-reflection", "source-rule-url": "https://owasp.org/www-community/vulnerabilities/Unsafe_use_of_Reflection", "subcategory": ["audit"], "technology": ["java"], "vulnerability_class": ["Improper Authorization"]}, "metavars": {"$CLASS": {"abstract_content": "type1.replace('/''.')", "end": {"col": 71, "line": 54, "offset": 1932}, "start": {"col": 48, "line": 54, "offset": 1909}}}, "severity": "WARNING", "validation_state": "NO_VALIDATOR"}, "path": "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/ByteCodeWriterUtils.java", "start": {"col": 34, "line": 54, "offset": 1895}}, {"check_id": "java.lang.security.audit.unsafe-reflection.unsafe-reflection", "end": {"col": 92, "line": 60, "offset": 2273}, "extra": {"engine_kind": "OSS", "fingerprint": "d504eabef8f01c386201cd719fbf54b3dd9c8efa41c5968bef9984e49fc23715df23b4b50af3588631522adf07d78fa22679c174f10d7b1c0836acded8e21c98_0", "is_ignored": false, "lines": "                        class2 = Class.forName(type2.replace('/', '.'), false, classLoader);", "message": "If an attacker can supply values that the application then uses to determine which class to instantiate or which method to invoke, the potential exists for the attacker to create control flow paths through the application that were not intended by the application developers. This attack vector may allow the attacker to bypass authentication or access control checks or otherwise cause the application to behave in an unexpected manner.", "metadata": {"category": "security", "confidence": "LOW", "cwe": ["CWE-470: Use of Externally-Controlled Input to Select Classes or Code ('Unsafe Reflection')"], "impact": "LOW", "license": "Semgrep Rules License v1.0. For more details, visit semgrep.dev/legal/rules-license", "likelihood": "LOW", "owasp": ["A03:2021 - Injection"], "references": ["https://owasp.org/Top10/A03_2021-Injection"], "semgrep.dev": {"rule": {"origin": "community", "r_id": 9993, "rule_id": "DbUW1W", "rv_id": 945704, "url": "https://semgrep.dev/playground/r/3ZTOP7Q/java.lang.security.audit.unsafe-reflection.unsafe-reflection", "version_id": "3ZTOP7Q"}}, "shortlink": "https://sg.run/R8X8", "source": "https://semgrep.dev/r/java.lang.security.audit.unsafe-reflection.unsafe-reflection", "source-rule-url": "https://owasp.org/www-community/vulnerabilities/Unsafe_use_of_Reflection", "subcategory": ["audit"], "technology": ["java"], "vulnerability_class": ["Improper Authorization"]}, "metavars": {"$CLASS": {"abstract_content": "type2.replace('/''.')", "end": {"col": 71, "line": 60, "offset": 2252}, "start": {"col": 48, "line": 60, "offset": 2229}}}, "severity": "WARNING", "validation_state": "NO_VALIDATOR"}, "path": "/workspace/core-processor/src/main/java/io/micronaut/inject/writer/ByteCodeWriterUtils.java", "start": {"col": 34, "line": 60, "offset": 2215}}, {"check_id": "java.lang.security.audit.crypto.ssl.defaulthttpclient-is-deprecated.defaulthttpclient-is-deprecated", "end": {"col": 43, "line": 297, "offset": 10951}, "extra": {"engine_kind": "OSS", "fingerprint": "bff386c7e735d85bfe1a69c2352c949ad2b419486bddba56402ebbd55b38bd6a2d321f660b252cf0e7cb0f343dad489e9e6661dd261852a3ac85d298740d40cc_0", "fix_regex": {"regex": "DefaultHttpClient", "replacement": "HttpClientBuilder"}, "is_ignored": false, "lines": "        return new DefaultHttpClient(this);", "message": "DefaultHttpClient is deprecated. Further, it does not support connections using TLS1.2, which makes using DefaultHttpClient a security hazard. Use HttpClientBuilder instead.", "metadata": {"asvs": {"control_id": "9.1.3 Weak TLS", "control_url": "https://github.com/OWASP/ASVS/blob/master/4.0/en/0x17-V9-Communications.md#v91-client-communications-security-requirements", "section": "V9 Communications Verification Requirements", "version": "4"}, "category": "security", "confidence": "LOW", "cwe": ["CWE-326: Inadequate Encryption Strength"], "impact": "LOW", "license": "Semgrep Rules License v1.0. For more details, visit semgrep.dev/legal/rules-license", "likelihood": "LOW", "owasp": ["A03:2017 - Sensitive Data Exposure", "A02:2021 - Cryptographic Failures"], "references": ["https://owasp.org/Top10/A02_2021-Cryptographic_Failures"], "semgrep.dev": {"rule": {"origin": "community", "r_id": 9202, "rule_id": "qNUj8b", "rv_id": 945663, "url": "https://semgrep.dev/playground/r/JdTDyZk/java.lang.security.audit.crypto.ssl.defaulthttpclient-is-deprecated.defaulthttpclient-is-deprecated", "version_id": "JdTDyZk"}}, "shortlink": "https://sg.run/J9Gj", "source": "https://semgrep.dev/r/java.lang.security.audit.crypto.ssl.defaulthttpclient-is-deprecated.defaulthttpclient-is-deprecated", "source-rule-url": "https://find-sec-bugs.github.io/bugs.htm#DEFAULT_HTTP_CLIENT", "subcategory": ["audit"], "technology": ["java"], "vulnerability_class": ["Cryptographic Issues"]}, "metavars": {}, "severity": "WARNING", "validation_state": "NO_VALIDATOR"}, "path": "/workspace/http-client/src/main/java/io/micronaut/http/client/netty/DefaultHttpClientBuilder.java", "start": {"col": 9, "line": 297, "offset": 10917}}, {"check_id": "java.lang.security.audit.crypto.ssl.insecure-trust-manager.insecure-trust-manager", "end": {"col": 10, "line": 108, "offset": 4358}, "extra": {"engine_kind": "OSS", "fingerprint": "e094fcfefc30fadc78b857749f9c80d64f0662a83dbeea4b4bc1b1ce903377eec8d157b46be43ca620969c7f0472e47188493b5be5511263b3905d1eea0eff1c_0", "is_ignored": false, "lines": "        @Override\n        public void checkClientTrusted(X509Certificate[] chain, String authType) throws CertificateException {\n            // trust everything\n        }", "message": "Detected empty trust manager implementations. This is dangerous because it accepts any certificate, enabling man-in-the-middle attacks. Consider using a KeyStore and TrustManagerFactory instead. See https://stackoverflow.com/questions/2642777/trusting-all-certificates-using-httpclient-over-https for more information.", "metadata": {"asvs": {"control_id": "9.2.1 Weak TLS", "control_url": "https://github.com/OWASP/ASVS/blob/master/4.0/en/0x17-V9-Communications.md#v92-server-communications-security-requirements", "section": "V9 Communications Verification Requirements", "version": "4"}, "category": "security", "confidence": "LOW", "cwe": ["CWE-295: Improper Certificate Validation"], "impact": "LOW", "license": "Semgrep Rules License v1.0. For more details, visit semgrep.dev/legal/rules-license", "likelihood": "LOW", "owasp": ["A03:2017 - Sensitive Data Exposure", "A07:2021 - Identification and Authentication Failures"], "references": ["https://stackoverflow.com/questions/2642777/trusting-all-certificates-using-httpclient-over-https"], "semgrep.dev": {"rule": {"origin": "community", "r_id": 9204, "rule_id": "YGUR9A", "rv_id": 945665, "url": "https://semgrep.dev/playground/r/GxTP7WY/java.lang.security.audit.crypto.ssl.insecure-trust-manager.insecure-trust-manager", "version_id": "GxTP7WY"}}, "shortlink": "https://sg.run/GePy", "source": "https://semgrep.dev/r/java.lang.security.audit.crypto.ssl.insecure-trust-manager.insecure-trust-manager", "source-rule-url": "https://find-sec-bugs.github.io/bugs.htm#WEAK_TRUST_MANAGER", "subcategory": ["audit"], "technology": ["java"], "vulnerability_class": ["Improper Authentication"]}, "metavars": {"$CLASS": {"abstract_content": "TrustAllTrustManager", "end": {"col": 46, "line": 103, "offset": 4156}, "start": {"col": 26, "line": 103, "offset": 4136}}}, "severity": "WARNING", "validation_state": "NO_VALIDATOR"}, "path": "/workspace/http-client-jdk/src/main/java/io/micronaut/http/client/jdk/JdkClientSslBuilder.java", "start": {"col": 9, "line": 105, "offset": 4196}}, {"check_id": "java.lang.security.audit.crypto.ssl.insecure-trust-manager.insecure-trust-manager", "end": {"col": 10, "line": 113, "offset": 4530}, "extra": {"engine_kind": "OSS", "fingerprint": "e094fcfefc30fadc78b857749f9c80d64f0662a83dbeea4b4bc1b1ce903377eec8d157b46be43ca620969c7f0472e47188493b5be5511263b3905d1eea0eff1c_1", "is_ignored": false, "lines": "        @Override\n        public void checkServerTrusted(X509Certificate[] chain, String authType) throws CertificateException {\n            // trust everything\n        }", "message": "Detected empty trust manager implementations. This is dangerous because it accepts any certificate, enabling man-in-the-middle attacks. Consider using a KeyStore and TrustManagerFactory instead. See https://stackoverflow.com/questions/2642777/trusting-all-certificates-using-httpclient-over-https for more information.", "metadata": {"asvs": {"control_id": "9.2.1 Weak TLS", "control_url": "https://github.com/OWASP/ASVS/blob/master/4.0/en/0x17-V9-Communications.md#v92-server-communications-security-requirements", "section": "V9 Communications Verification Requirements", "version": "4"}, "category": "security", "confidence": "LOW", "cwe": ["CWE-295: Improper Certificate Validation"], "impact": "LOW", "license": "Semgrep Rules License v1.0. For more details, visit semgrep.dev/legal/rules-license", "likelihood": "LOW", "owasp": ["A03:2017 - Sensitive Data Exposure", "A07:2021 - Identification and Authentication Failures"], "references": ["https://stackoverflow.com/questions/2642777/trusting-all-certificates-using-httpclient-over-https"], "semgrep.dev": {"rule": {"origin": "community", "r_id": 9204, "rule_id": "YGUR9A", "rv_id": 945665, "url": "https://semgrep.dev/playground/r/GxTP7WY/java.lang.security.audit.crypto.ssl.insecure-trust-manager.insecure-trust-manager", "version_id": "GxTP7WY"}}, "shortlink": "https://sg.run/GePy", "source": "https://semgrep.dev/r/java.lang.security.audit.crypto.ssl.insecure-trust-manager.insecure-trust-manager", "source-rule-url": "https://find-sec-bugs.github.io/bugs.htm#WEAK_TRUST_MANAGER", "subcategory": ["audit"], "technology": ["java"], "vulnerability_class": ["Improper Authentication"]}, "metavars": {"$CLASS": {"abstract_content": "TrustAllTrustManager", "end": {"col": 46, "line": 103, "offset": 4156}, "start": {"col": 26, "line": 103, "offset": 4136}}}, "severity": "WARNING", "validation_state": "NO_VALIDATOR"}, "path": "/workspace/http-client-jdk/src/main/java/io/micronaut/http/client/jdk/JdkClientSslBuilder.java", "start": {"col": 9, "line": 110, "offset": 4368}}, {"check_id": "javascript.lang.security.detect-insecure-websocket.detect-insecure-websocket", "end": {"col": 44, "line": 247, "offset": 10558}, "extra": {"engine_kind": "OSS", "fingerprint": "c72a47b94813f77121d01448761b6de75776f175262c49d38793ea50d44853825ee1a1ed1eab85b1e2248e29e0432bd3321ba365247584b5fcb957b4dd8fa7b6_0", "is_ignored": false, "lines": "            || hostString.startsWith(\"ws://127.\")", "message": "Insecure WebSocket Detected. WebSocket Secure (wss) should be used for all WebSocket connections.", "metadata": {"asvs": {"control_id": "13.5.1 Insecure WebSocket", "control_url": "https://github.com/OWASP/ASVS/blob/master/4.0/en/0x21-V13-API.md#v135-websocket-security-requirements", "section": "V13: API and Web Service Verification Requirements", "version": "4"}, "category": "security", "confidence": "LOW", "cwe": ["CWE-319: Cleartext Transmission of Sensitive Information"], "impact": "MEDIUM", "license": "Semgrep Rules License v1.0. For more details, visit semgrep.dev/legal/rules-license", "likelihood": "LOW", "owasp": ["A03:2017 - Sensitive Data Exposure", "A02:2021 - Cryptographic Failures"], "references": ["https://owasp.org/Top10/A02_2021-Cryptographic_Failures"], "semgrep.dev": {"rule": {"origin": "community", "r_id": 10048, "rule_id": "AbUWeE", "rv_id": 945890, "url": "https://semgrep.dev/playground/r/NdTqk0E/javascript.lang.security.detect-insecure-websocket.detect-insecure-websocket", "version_id": "NdTqk0E"}}, "shortlink": "https://sg.run/GWyz", "source": "https://semgrep.dev/r/javascript.lang.security.detect-insecure-websocket.detect-insecure-websocket", "subcategory": ["audit"], "technology": ["regex"], "vulnerability_class": ["Mishandled Sensitive Information"]}, "metavars": {}, "severity": "ERROR", "validation_state": "NO_VALIDATOR"}, "path": "/workspace/http-server/src/main/java/io/micronaut/http/server/cors/CorsFilter.java", "start": {"col": 39, "line": 247, "offset": 10553}}, {"check_id": "javascript.lang.security.detect-insecure-websocket.detect-insecure-websocket", "end": {"col": 57, "line": 86, "offset": 3725}, "extra": {"engine_kind": "OSS", "fingerprint": "413619f4e29523b00a8a218772ffe55ccf73682ba6f700ddba8fec94bb43ce7f592896b42f10d57f317a294a9420eb967ee29888a53981749b9ae7e0aaadf6c4_0", "is_ignored": false, "lines": "    public static final String SCHEME_WEBSOCKET = \"ws://\";", "message": "Insecure WebSocket Detected. WebSocket Secure (wss) should be used for all WebSocket connections.", "metadata": {"asvs": {"control_id": "13.5.1 Insecure WebSocket", "control_url": "https://github.com/OWASP/ASVS/blob/master/4.0/en/0x21-V13-API.md#v135-websocket-security-requirements", "section": "V13: API and Web Service Verification Requirements", "version": "4"}, "category": "security", "confidence": "LOW", "cwe": ["CWE-319: Cleartext Transmission of Sensitive Information"], "impact": "MEDIUM", "license": "Semgrep Rules License v1.0. For more details, visit semgrep.dev/legal/rules-license", "likelihood": "LOW", "owasp": ["A03:2017 - Sensitive Data Exposure", "A02:2021 - Cryptographic Failures"], "references": ["https://owasp.org/Top10/A02_2021-Cryptographic_Failures"], "semgrep.dev": {"rule": {"origin": "community", "r_id": 10048, "rule_id": "AbUWeE", "rv_id": 945890, "url": "https://semgrep.dev/playground/r/NdTqk0E/javascript.lang.security.detect-insecure-websocket.detect-insecure-websocket", "version_id": "NdTqk0E"}}, "shortlink": "https://sg.run/GWyz", "source": "https://semgrep.dev/r/javascript.lang.security.detect-insecure-websocket.detect-insecure-websocket", "subcategory": ["audit"], "technology": ["regex"], "vulnerability_class": ["Mishandled Sensitive Information"]}, "metavars": {}, "severity": "ERROR", "validation_state": "NO_VALIDATOR"}, "path": "/workspace/http-server-netty/src/main/java/io/micronaut/http/server/netty/websocket/NettyServerWebSocketUpgradeHandler.java", "start": {"col": 52, "line": 86, "offset": 3720}}], "skipped_rules": [], "version": "1.45.0"}
```

**AI Recommendation:**
Implement secure coding practice: validate inputs, use prepared statements, apply least privilege


**Total Occurrences:**
This issue appears in **1 file** with **2 total occurrences** across your codebase.

📥 **[Download IDE auto-fix for all 2 occurrences →](#ide-fixes)**

---

2. 🔴 **Generic › secrets › security › detected-jwt-token › detected-jwt-token** (generic.secrets.security.detected-jwt-token.detected-jwt-token)
   - Severity: CRITICAL
   - Category: Code Quality
   - Occurrences: 1 issues across 1 files
   - Priority Score: 130

**What's Wrong:**
This rule checks for generic.secrets.security.detected-jwt-token.detected-jwt-token violations in your code.

**Example (src/main/docs/guide/security/authenticationStrategies/jwt/reader/bearerToken.adoc:34):**
```
    32 | GET /protectedResource HTTP/1.1
    33 | Host: micronaut.example
>   34 | Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjE0MjI5OTU5MjIsInN1YiI6ImppbWkiLCJyb2xlcyI6WyJST0xFX0FETUlOIiwiUk9MRV9VU0VSIl0sImlhdCI6MTQyMjk5MjMyMn0.rA7A2Gwt14LaYMpxNRtrCdO24RGrfHtZXY9fIjV8x8o
    35 | ----
```

**AI Recommendation:**
Implement secure coding practice: validate inputs, use prepared statements, apply least privilege


**Total Occurrences:**
This issue appears in **1 file** with **1 total occurrence** across your codebase.

📥 **[Download IDE auto-fix for all 1 occurrences →](#ide-fixes)**

---

3. 🔴 **C V E-2019-15052** (CVE-2019-15052)
   - Severity: CRITICAL
   - Category: Code Quality
   - Occurrences: 1 issues across 1 files
   - Priority Score: 130

**What's Wrong:**
This rule checks for cve-2019-15052 violations in your code.

**Example (gradle-wrapper.jar:1):**
```
// Could not extract code snippet: ENOENT: no such file or directory, open '/tmp/test-repo-1761676530795/gradle-wrapper.jar'```

**AI Recommendation:**
Step-by-step solution with OWASP references (focus on HOW to fix, not repeating problem):
1. Upgrade Gradle to version 5.6 or later to mitigate the vulnerability.
2. Review and update your build scripts to ensure that sensitive credentials are not exposed in URLs.
3. Configure Gradle to use secure connections (HTTPS) for all repositories and dependencies.
4. Implement proper authentication handling to avoid sending credentials to unauthorized hosts.
References: OWASP Dependency Check, OWASP Secure Coding Practices


**Total Occurrences:**
This issue appears in **1 file** with **1 total occurrence** across your codebase.

📥 **[Download IDE auto-fix for all 1 occurrences →](#ide-fixes)**

---

4. 🔴 **C V E-2021-42392** (CVE-2021-42392)
   - Severity: CRITICAL
   - Category: Code Quality
   - Occurrences: 1 issues across 1 files
   - Priority Score: 130

**What's Wrong:**
This rule checks for cve-2021-42392 violations in your code.

**Example (h2.jar:1):**
```
// Could not extract code snippet: ENOENT: no such file or directory, open '/tmp/test-repo-1761676530795/h2.jar'```

**AI Recommendation:**
Implement secure coding practice: validate inputs, use prepared statements, apply least privilege


**Total Occurrences:**
This issue appears in **1 file** with **1 total occurrence** across your codebase.

📥 **[Download IDE auto-fix for all 1 occurrences →](#ide-fixes)**

---

5. 🔴 **C V E-2022-23221** (CVE-2022-23221)
   - Severity: CRITICAL
   - Category: Code Quality
   - Occurrences: 1 issues across 1 files
   - Priority Score: 130

**What's Wrong:**
This rule checks for cve-2022-23221 violations in your code.

**Example (h2.jar:1):**
```
// Could not extract code snippet: ENOENT: no such file or directory, open '/tmp/test-repo-1761676530795/h2.jar'```

**AI Recommendation:**
Implement secure coding practice: validate inputs, use prepared statements, apply least privilege


**Total Occurrences:**
This issue appears in **1 file** with **1 total occurrence** across your codebase.

📥 **[Download IDE auto-fix for all 1 occurrences →](#ide-fixes)**

---

6. 🟠 **Java › lang › security › audit › crypto › ssl › defaulthttpclient-is-deprecated › defaulthttpclient-is-deprecated** (java.lang.security.audit.crypto.ssl.defaulthttpclient-is-deprecated.defaulthttpclient-is-deprecated)
   - Severity: HIGH
   - Category: Code Quality
   - Occurrences: 5 issues across 5 files
   - Priority Score: 110

**What's Wrong:**
This rule checks for java.lang.security.audit.crypto.ssl.defaulthttpclient-is-deprecated.defaulthttpclient-is-deprecated violations in your code.

**Example (function-client/src/main/java/io/micronaut/function/client/http/HttpFunctionExecutor.java:77):**
```java
    75 |             HttpClientFilter... filters) {
    76 |         super();
>   77 |         this.httpClient = new DefaultHttpClient(
    78 |             LoadBalancer.empty(),
    79 |             configuration,
```

**AI Recommendation:**
Implement secure coding practice: validate inputs, use prepared statements, apply least privilege


**Total Occurrences:**
This issue appears in **5 files** with **5 total occurrences** across your codebase.

📥 **[Download IDE auto-fix for all 5 occurrences →](#ide-fixes)**

---

7. 🟠 **Java › lang › security › audit › unsafe-reflection › unsafe-reflection** (java.lang.security.audit.unsafe-reflection.unsafe-reflection)
   - Severity: HIGH
   - Category: Code Quality
   - Occurrences: 3 issues across 3 files
   - Priority Score: 106

**What's Wrong:**
This rule checks for java.lang.security.audit.unsafe-reflection.unsafe-reflection violations in your code.

**Example (cli/src/main/groovy/io/micronaut/cli/console/logging/MicronautConsole.java:502):**
```java
   500 |             try {
   501 |                 @SuppressWarnings("unchecked")
>  502 |                 Class<? extends MicronautConsole> klass = (Class<? extends MicronautConsole>) Class.forName(className);
   503 |                 return klass.newInstance();
   504 |             } catch (Exception e) {
```

**AI Recommendation:**
Step-by-step solution with OWASP references (focus on HOW to fix, not repeating problem):
1. Validate and sanitize all user inputs that are used to determine class instantiation or method invocation.
2. Use a whitelist of allowed classes and methods to prevent unauthorized access.
3. Implement strict access control checks to ensure that only authorized users can perform certain actions.
4. Use security frameworks or libraries that provide built-in protection against such vulnerabilities.

OWASP References: https://owasp.org/www-community/attacks/Insecure_Direct_Object_References, https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload


**Total Occurrences:**
This issue appears in **3 files** with **3 total occurrences** across your codebase.

📥 **[Download IDE auto-fix for all 3 occurrences →](#ide-fixes)**

---

8. 🟠 **Problem-based-packs › insecure-transport › java-stdlib › httpurlconnection-http-request › httpurlconnection-http-request** (problem-based-packs.insecure-transport.java-stdlib.httpurlconnection-http-request.httpurlconnection-http-request)
   - Severity: HIGH
   - Category: Code Quality
   - Occurrences: 1 issues across 1 files
   - Priority Score: 90

**What's Wrong:**
This rule checks for problem-based-packs.insecure-transport.java-stdlib.httpurlconnection-http-request.httpurlconnection-http-request violations in your code.

**Example (inject/src/main/java/io/micronaut/context/env/DefaultEnvironment.java:702):**
```java
   700 |     private static boolean isGoogleCompute() {
   701 |         try {
>  702 |             URL url = new URL("http://metadata.google.internal");
   703 |             HttpURLConnection con = (HttpURLConnection) url.openConnection();
   704 |             con.setReadTimeout(500);
```

**AI Recommendation:**
1. Update the URL used in the HttpURLConnection to use HTTPS instead of HTTP. 2. Validate and enforce secure communication protocols (e.g., TLS 1.2 or higher) in the code. 3. Use a secure HTTP client library (e.g., Apache HttpClient or OkHttp) that supports secure connections by default. Reference: OWASP ASVS v4.0 - V2.2.1 (Ensure all communication is encrypted).


**Total Occurrences:**
This issue appears in **1 file** with **1 total occurrence** across your codebase.

📥 **[Download IDE auto-fix for all 1 occurrences →](#ide-fixes)**

---

9. 🟠 **External Script Missing Integrity Check** (html.security.audit.missing-integrity.missing-integrity)
   - Severity: HIGH
   - Category: Security
   - Occurrences: 1 issues across 1 files
   - Priority Score: 90

**What's Wrong:**
External scripts loaded via CDN without Subresource Integrity (SRI) verification.

**Example (src/main/docs/resources/style/layout.html:11):**
```html
     9 |     <link rel="stylesheet" href="${resourcesPath}/css/pdf.css" type="text/css" media="print" title="PDF" charset="utf-8" />
    10 |     <script src="${resourcesPath}/js/docs.js"></script>
>   11 |     <script src="https://cdnjs.cloudflare.com/ajax/libs/clipboard.js/1.5.13/clipboard.min.js"></script>
    12 |     <script type="text/javascript">
    13 |         function addJsClass(el) {
```

**AI Recommendation:**
Add the 'integrity' attribute to the tag with the base64-encoded cryptographic hash of the external resource. Use a secure source (e.g., SHA-256) for the hash. Refer to OWASP's Secure Coding Practices for SRI implementation.


**Total Occurrences:**
This issue appears in **1 file** with **1 total occurrence** across your codebase.

📥 **[Download IDE auto-fix for all 1 occurrences →](#ide-fixes)**

---

10. 🟠 **HTTP Link in HTML** (html.security.plaintext-http-link.plaintext-http-link)
   - Severity: HIGH
   - Category: Security
   - Occurrences: 1 issues across 1 files
   - Priority Score: 90

**What's Wrong:**
HTML contains links using HTTP instead of HTTPS.

**Example (src/main/docs/resources/style/layout.html:24):**
```html
    22 | <div id="navigation">
    23 |     <div class="navTitle">
>   24 |         <span id="logo"><a href="http://micronaut.io" title="Go to Micronaut Website"><img src="${resourcesPath}/img/micronaut-logo-white.svg" alt="Micronaut"/></a></span>
    25 |     </div>
    26 |     <div class="navLinks">
```

**AI Recommendation:**
Update the HTTP URL to use HTTPS. Ensure the resource is available over HTTPS and update the link accordingly. Refer to OWASP's 'Transport Layer Protection' guidelines (https://owasp.org/www-project-cheat-sheets/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html) for secure communication practices.


**Total Occurrences:**
This issue appears in **1 file** with **1 total occurrence** across your codebase.

📥 **[Download IDE auto-fix for all 1 occurrences →](#ide-fixes)**

---

... and 35 more issue groups

📥 **[Download complete fix manifest for all 13389 issues →](#ide-fixes)**


---

**📘 Priority Score Calculation**

The Priority Score helps you focus on the most impactful issues first. It combines three factors:

1. **Severity Weight** (0-100 points):
   - Critical: 100 points (security vulnerabilities, system crashes)
   - High: 60 points (data loss, performance degradation)
   - Medium: 0 points (not blocking)
   - Low: 0 points (not blocking)

2. **Category Weight** (0-30 points):
   - Security: +30 points (highest risk)
   - Performance: +15 points (affects UX)
   - Architecture: +10 points (technical debt)
   - Code Quality/Dependencies: +5 points (maintainability)

3. **File Spread** (0-20 points):
   - log₂(files) × 10 (capped at 20)
   - 1 file = 0 points
   - 2 files = 10 points
   - 4 files = 20 points (max)
   - Rationale: Issues spread across many files require more effort to fix

**Formula**: `Priority = Severity + Category + File Spread`

**Example**: A critical security issue in 4 files = 100 + 30 + 20 = **150 points**


---



### 📈 Trends & Recommendations

**Recommendations for Leadership:**

🚀 **Quick Win**: Use the attached manifest file to automatically fix 26,720 issues (100%) - saving significant development time!

1. **Immediate Action**: 6 critical issues require senior developer review before deployment
2. **Security Training**: Consider security training for the team (28 security issues found)
3. **Code Review Process**: High issue count (23552 new) suggests need for more thorough pre-commit review
4. **Automation Opportunity**: 100% of issues auto-fixable - consider pre-commit hooks


## 🔴 Critical Issues (Immediate Action Required)

### 🔴 Javascript Lang Security Detect Insecure Websocket

**Severity**: CRITICAL | **Tool**: semgrep | **Found in**: 2 files | **Category**: NEW

---

#### 📋 What is this issue?

This issue was detected by semgrep as a critical severity problem. Rule: javascript.lang.security.detect-insecure-websocket.detect-insecure-websocket

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate semgrep best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### ⚠️ Risk Assessment

**Overall Risk**: 🔴 **CRITICAL RISK**

Immediate action required - may lead to security breaches, data loss, or system failures

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `semgrep-results-base.json` (Line 1)

**Code**:

```json
>    1 | {"errors": [{"code": 3, "level": "warn", "message": "Syntax error at line /workspace/.github/workflows/release.yml:67:\n When parsing a snippet as Bash for metavariable-pattern in rule 'yaml.github-ac...
```

#### 🔧 How to Fix

Implement secure coding practice: validate inputs, use prepared statements, apply least privilege

**Recommended Code**:

```json
1: // ⚠️ AI-generated fix not available - Manual review required
2: // Issue: Insecure WebSocket Detected. WebSocket Secure (wss) should be used for all WebSocket connections.
3: // See Security documentation for fix patterns
4: // Context: semgrep-results-base.json line 1
```

**Best Practices to Follow**:

- Review security best practices documentation
- Consult with team lead for critical Security issues
- Apply industry-standard solutions for this issue type

#### 📎 All Occurrences

This issue appears in **2 files** across your codebase.

View complete list: [group-javascript-lang-security-detect-insecure-websocket-detect-insecure-websocket-critical-semgrep-locations.json](attachments/group-javascript-lang-security-detect-insecure-websocket-detect-insecure-websocket-critical-semgrep-locations.json)

---


### 🔴 Generic Secrets Security Detected Jwt Token

**Severity**: CRITICAL | **Tool**: semgrep | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

This issue was detected by semgrep as a critical severity problem. Rule: generic.secrets.security.detected-jwt-token.detected-jwt-token

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate semgrep best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### ⚠️ Risk Assessment

**Overall Risk**: 🔴 **CRITICAL RISK**

Immediate action required - may lead to security breaches, data loss, or system failures

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `src/main/docs/guide/security/authenticationStrategies/jwt/reader/bearerToken.adoc` (Line 34)

**Code**:

```text
    31 | ----
    32 | GET /protectedResource HTTP/1.1
    33 | Host: micronaut.example
>   34 | Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjE0MjI5OTU5MjIsInN1YiI6ImppbWkiLCJyb2xlcyI6WyJST0xFX0FETUlOIiwiUk9MRV9VU0VSIl0sImlhdCI6MTQyMjk5MjMyMn0.rA7A2Gwt14LaYMpxNRtrCdO24RGrfHtZXY9fIjV8x8o
    35 | ----
```

#### 🔧 How to Fix

Implement secure coding practice: validate inputs, use prepared statements, apply least privilege

**Recommended Code**:

```text
34: // ⚠️ AI-generated fix not available - Manual review required
35: // Issue: JWT token detected
36: // See Security documentation for fix patterns
37: // Context: bearerToken.adoc line 34
```

**Best Practices to Follow**:

- Review security best practices documentation
- Consult with team lead for critical Security issues
- Apply industry-standard solutions for this issue type

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

View complete list: [group-generic-secrets-security-detected-jwt-token-detected-jwt-token-critical-semgrep-locations.json](attachments/group-generic-secrets-security-detected-jwt-token-detected-jwt-token-critical-semgrep-locations.json)

---


### 🔴 CVE 2019 15052

**Severity**: CRITICAL | **Tool**: dependency-check | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

Known security vulnerability CVE-2019-15052 in dependency. This vulnerability was publicly disclosed in 2019 and has a known exploit.

#### 🎯 Why does it matter?

Attackers actively scan for known CVEs in web applications. Public exploits exist, making this vulnerability easy to exploit at scale.

#### 🔍 Common causes:

- Using outdated dependency versions
- Not regularly updating dependencies
- Lack of automated dependency scanning in CI/CD
- Delayed security patch application

#### ⚠️ Impact if not fixed:

Critical security risk with publicly available exploits. Could lead to remote code execution, data theft, or system compromise. Compliance frameworks (SOC2, ISO 27001) require timely patching of known vulnerabilities.

#### ⚠️ Risk Assessment

**Overall Risk**: 🔴 **CRITICAL RISK**

Immediate action required - may lead to security breaches, data loss, or system failures

**Category**: Dependencies  
**Focus**: Managing third-party libraries and known vulnerabilities

#### 📍 Representative Example

**Location**: `gradle/wrapper/gradle-wrapper.jar` (Line 1)

**Code**:

```text
>    1 | PK     A            	   META-INF/ PK     A (M��?   T      META-INF/MANIFEST.MF�M��LK-.�K-*��ϳR0�3����-�I�M�+I,
     2 | �d��Z)�%��b�µ���r�r PK     A               org/ PK     A               org/gradle/ PK     A               org/gradle/wrapper/ PK     A �zZ��  �	  -   org/gradle/wrapper...
     3 | �	�@c5�žv���2$����ڗ����Sz���?B;W�op��s�ٿ�;#����g ^�O2Bx[�a�KX�pA� .�X�%���˒�e\�U���
     4 | ����&Ẅ)�X�pCƻ�H���X�p+�����|y�/w�Pe�#+!�Ǽ�C(H�8��='���
```

#### 🔧 How to Fix

Step-by-step solution with OWASP references (focus on HOW to fix, not repeating problem):
1. Upgrade Gradle to version 5.6 or later to mitigate the vulnerability.
2. Review and update your build scripts to ensure that sensitive credentials are not exposed in URLs.
3. Configure Gradle to use secure connections (HTTPS) for all repositories and dependencies.
4. Implement proper authentication handling to avoid sending credentials to unauthorized hosts.
References: OWASP Dependency Check, OWASP Secure Coding Practices

**Recommended Code**:

```text
Before:
// No specific code snippet provided
After:
// Ensure Gradle version is updated in gradle-wrapper.properties
#Mon Dec 01 00:00:00 UTC 2019
distributionUrl=https\://services.gradle.org/distributions/gradle-5.6-bin.zip
```

**Best Practices to Follow**:

- Keep Gradle and all dependencies up to date
- Use HTTPS for all network communications
- Avoid hardcoding credentials in build scripts
- Implement proper authentication and authorization checks

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

View complete list: [group-cve-2019-15052-critical-dependency-check-locations.json](attachments/group-cve-2019-15052-critical-dependency-check-locations.json)

---


### 🔴 CVE 2021 42392

**Severity**: CRITICAL | **Tool**: dependency-check | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

Known security vulnerability CVE-2021-42392 in dependency. This vulnerability was publicly disclosed in 2021 and has a known exploit.

#### 🎯 Why does it matter?

Attackers actively scan for known CVEs in web applications. Public exploits exist, making this vulnerability easy to exploit at scale.

#### 🔍 Common causes:

- Using outdated dependency versions
- Not regularly updating dependencies
- Lack of automated dependency scanning in CI/CD
- Delayed security patch application

#### ⚠️ Impact if not fixed:

Critical security risk with publicly available exploits. Could lead to remote code execution, data theft, or system compromise. Compliance frameworks (SOC2, ISO 27001) require timely patching of known vulnerabilities.

#### ⚠️ Risk Assessment

**Overall Risk**: 🔴 **CRITICAL RISK**

Immediate action required - may lead to security breaches, data loss, or system failures

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `jdbc/src/test/resources/h2.jar` (Line 1)

**Code**:

```text
>    1 | PK  px�J              META-INF/MANIFEST.MF��  ���n�0��z
     2 | !���K�u���nHڠis�Ic�E*$%�o_R�%o�{���������6�#)ͤ��Mhx_��SB �m�/f8u�/-���ɿ}&���y��Ƥ�z}4���~�H&ez��3h�k{W�q�-~rMo��"4W���6��y���0��w�J�*�N�;d"�rԺ�Kշ}���k�J�%'�.bN��Ȱ�T,3��ux�XNj��w...
     3 | c��:�0�h@�3�b�/>�L_�S�.O���6�jgЀ���˕@1��x�XF���x%&b/󜑚ܣ�6/�	U4�:v���2�~�T�nX�Y��yT��h�L�RMhZ��j0y�´&��}VujM8w�_ v����qnhla]1N7�`Ɉ�\�<����}=e��H��՜��!�2٪[�g�ڝv�{gõ1��Q+��-�ƻ��{�ils��쒱%...
     4 |   PK  px�J            !   META-INF/services/java.sql.Driver�/J��0�s)�,K- PKk$�      PK  px�J               org/h2/api/Aggregate.classe��J�0��3��Mݦ(����JdBa0���bw�!�m&�j^� >�x*R...
```

#### 🔧 How to Fix

Implement secure coding practice: validate inputs, use prepared statements, apply least privilege

**Recommended Code**:

```text
1: // ⚠️ AI-generated fix not available - Manual review required
2: // Issue: The org.h2.util.JdbcUtils.getConnection method of the H2 database takes as parameters the class name of the driver and URL of the database. An attacker may pass a JNDI driver name and a URL leading to a LDAP or RMI servers, causing remote code execution. This can be exploited through various attack vectors, most notably through the H2 Console which leads to unauthenticated remote code execution.
3: // See Security documentation for fix patterns
4: // Context: h2.jar line 1
```

**Best Practices to Follow**:

- Review security best practices documentation
- Consult with team lead for critical Security issues
- Apply industry-standard solutions for this issue type

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

View complete list: [group-cve-2021-42392-critical-dependency-check-locations.json](attachments/group-cve-2021-42392-critical-dependency-check-locations.json)

---


### 🔴 CVE 2022 23221

**Severity**: CRITICAL | **Tool**: dependency-check | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

Known security vulnerability CVE-2022-23221 in dependency. This vulnerability was publicly disclosed in 2022 and has a known exploit.

#### 🎯 Why does it matter?

Attackers actively scan for known CVEs in web applications. Public exploits exist, making this vulnerability easy to exploit at scale.

#### 🔍 Common causes:

- Using outdated dependency versions
- Not regularly updating dependencies
- Lack of automated dependency scanning in CI/CD
- Delayed security patch application

#### ⚠️ Impact if not fixed:

Critical security risk with publicly available exploits. Could lead to remote code execution, data theft, or system compromise. Compliance frameworks (SOC2, ISO 27001) require timely patching of known vulnerabilities.

#### ⚠️ Risk Assessment

**Overall Risk**: 🔴 **CRITICAL RISK**

Immediate action required - may lead to security breaches, data loss, or system failures

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `jdbc/src/test/resources/h2.jar` (Line 1)

**Code**:

```text
>    1 | PK  px�J              META-INF/MANIFEST.MF��  ���n�0��z
     2 | !���K�u���nHڠis�Ic�E*$%�o_R�%o�{���������6�#)ͤ��Mhx_��SB �m�/f8u�/-���ɿ}&���y��Ƥ�z}4���~�H&ez��3h�k{W�q�-~rMo��"4W���6��y���0��w�J�*�N�;d"�rԺ�Kշ}���k�J�%'�.bN��Ȱ�T,3��ux�XNj��w...
     3 | c��:�0�h@�3�b�/>�L_�S�.O���6�jgЀ���˕@1��x�XF���x%&b/󜑚ܣ�6/�	U4�:v���2�~�T�nX�Y��yT��h�L�RMhZ��j0y�´&��}VujM8w�_ v����qnhla]1N7�`Ɉ�\�<����}=e��H��՜��!�2٪[�g�ڝv�{gõ1��Q+��-�ƻ��{�ils��쒱%...
     4 |   PK  px�J            !   META-INF/services/java.sql.Driver�/J��0�s)�,K- PKk$�      PK  px�J               org/h2/api/Aggregate.classe��J�0��3��Mݦ(����JdBa0���bw�!�m&�j^� >�x*R...
```

#### 🔧 How to Fix

Implement secure coding practice: validate inputs, use prepared statements, apply least privilege

**Recommended Code**:

```text
1: // ⚠️ AI-generated fix not available - Manual review required
2: // Issue: H2 Console before 2.1.210 allows remote attackers to execute arbitrary code via a jdbc:h2:mem JDBC URL containing the IGNORE_UNKNOWN_SETTINGS=TRUE;FORBID_CREATION=FALSE;INIT=RUNSCRIPT substring, a different vulnerability than CVE-2021-42392.
3: // See Security documentation for fix patterns
4: // Context: h2.jar line 1
```

**Best Practices to Follow**:

- Review security best practices documentation
- Consult with team lead for critical Security issues
- Apply industry-standard solutions for this issue type

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

View complete list: [group-cve-2022-23221-critical-dependency-check-locations.json](attachments/group-cve-2022-23221-critical-dependency-check-locations.json)

---



## 🟠 High Priority Issues

### 🟠 Com Puppycrawl Tools Checkstyle Checks FinalParametersCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 7333 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-finalparameterscheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.FinalParametersCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `validation/src/main/java/io/micronaut/validation/ValidatingInterceptor.java` (Line 57)

**Code**:

```java
    54 |      *
    55 |      * @param validatorFactory Factory returning initialized {@code Validator} instances
    56 |      */
>   57 |     public ValidatingInterceptor(Optional<ValidatorFactory> validatorFactory) {
    58 | 
    59 |         executableValidator = validatorFactory
    60 |                 .map(factory -> factory.getValidator().forExecutables())
```

#### 🔧 How to Fix

Improve code quality: follow naming conventions, add documentation, reduce complexity

**Recommended Code**:

```java
57: // ⚠️ AI-generated fix not available - Manual review required
58: // Issue: Parameter validatorFactory should be final.
59: // See Code Quality documentation for fix patterns
60: // Context: ValidatingInterceptor.java line 57
```

**Best Practices to Follow**:

- Review codequality best practices documentation
- Consult with team lead for high Code Quality issues
- Apply industry-standard solutions for this issue type

#### 📎 All Occurrences

This issue appears in **7333 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-finalparameterscheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-finalparameterscheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 7333 occurrences with one click!

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Javadoc JavadocVariableCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 2798 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-javadoc-javadocvariablecheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.javadoc.JavadocVariableCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `validation/src/main/java/io/micronaut/validation/ValidatingInterceptor.java` (Line 48)

**Code**:

```java
    45 |      */
    46 |     public static final int POSITION = InterceptPhase.VALIDATE.getPosition();
    47 | 
>   48 |     private static final Logger LOG = LoggerFactory.getLogger(ValidatingInterceptor.class);
    49 | 
    50 |     private final ExecutableValidator executableValidator;
    51 | 
```

#### 🔧 How to Fix

Add a Javadoc comment to the method or class to describe its purpose, parameters, return value, and any exceptions it throws.

**Recommended Code**:

```java
Before:
public class ValidatingInterceptor {
    public void intercept() {
        // method implementation
    }
}

After:
/**
 * Intercepts the request and performs validation.
 * This method checks if the request meets the required validation criteria.
 */
public class ValidatingInterceptor {
    /**
     * Performs the validation logic for the request.
     * 
     * @throws ValidationException if the request is invalid
     */
    public void intercept() throws ValidationException {
        // method implementation
    }
}
```

**Best Practices to Follow**:

- Use Javadoc to document all public and protected methods and classes.
- Include a description of the method's purpose, parameters, return value, and exceptions.
- Keep Javadoc concise but informative to improve code readability and maintainability.

#### 📎 All Occurrences

This issue appears in **2798 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-javadoc-javadocvariablecheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-javadoc-javadocvariablecheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 2798 occurrences with one click!

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Design DesignForExtensionCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 2193 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-design-designforextensioncheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.design.DesignForExtensionCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Architecture  
**Focus**: Improving system design, maintainability, and extensibility

#### 📍 Representative Example

**Location**: `validation/src/main/java/io/micronaut/validation/ValidatingInterceptor.java` (Line 68)

**Code**:

```java
    65 |         }
    66 |     }
    67 | 
>   68 |     @Override
    69 |     public int getOrder() {
    70 |         return POSITION;
    71 |     }
```

#### 🔧 How to Fix

Mark the class as final if it's not intended for subclassing, or add Javadoc to the 'getOrder' method explaining how to safely extend it. Alternatively, make the method static/final/abstract/empty to prevent overriding.

**Recommended Code**:

```java
Before:
public class ValidatingInterceptor {
    public int getOrder() {
        return 0;
    }
}

After (marking class as final):
public final class ValidatingInterceptor {
    public int getOrder() {
        return 0;
    }
}

OR

After (adding Javadoc):
public class ValidatingInterceptor {
    /**
     * Returns the order value for this interceptor.
     * Subclasses should override this method to provide their own ordering logic.
     * @return the order value
     */
    public int getOrder() {
        return 0;
    }
}
```

**Best Practices to Follow**:

- Use Javadoc to document methods that are intended to be overridden
- Mark classes as final if they are not designed for extension
- Ensure method design aligns with class design intent to avoid misuse

#### 📎 All Occurrences

This issue appears in **2193 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-design-designforextensioncheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-design-designforextensioncheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 2193 occurrences with one click!

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Coding HiddenFieldCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 1647 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-coding-hiddenfieldcheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.coding.HiddenFieldCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `aop/src/main/java/io/micronaut/aop/chain/InterceptorChain.java` (Line 81)

**Code**:

```java
    78 |      * @param method result method
    79 |      * @param originalParameters parameters
    80 |      */
>   81 |     public InterceptorChain(Interceptor<B, R>[] interceptors,
    82 |                             B target,
    83 |                             ExecutableMethod<B, R> method,
    84 |                             Object... originalParameters) {
```

#### 🔧 How to Fix

Rename the local variable to avoid shadowing the field 'interceptors'. Choose a descriptive name that clearly indicates its purpose.

**Recommended Code**:

```java
Before:
private final List<Interceptor> interceptors;

public void someMethod() {
    List<Interceptor> interceptors = new ArrayList<>();
    // method body
}

After:
private final List<Interceptor> interceptors;

public void someMethod() {
    List<Interceptor> methodInterceptors = new ArrayList<>();
    // method body
}
```

**Best Practices to Follow**:

- Avoid shadowing fields
- Use descriptive variable names
- Maintain clear code structure

#### 📎 All Occurrences

This issue appears in **1647 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-coding-hiddenfieldcheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-coding-hiddenfieldcheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 1647 occurrences with one click!

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Design VisibilityModifierCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 733 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-design-visibilitymodifiercheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.design.VisibilityModifierCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Architecture  
**Focus**: Improving system design, maintainability, and extensibility

#### 📍 Representative Example

**Location**: `aop/src/main/java/io/micronaut/aop/chain/InterceptorChain.java` (Line 64)

**Code**:

```java
    61 | public class InterceptorChain<B, R> implements InvocationContext<B, R> {
    62 |     private static final Logger LOG = LoggerFactory.getLogger(InterceptorChain.class);
    63 | 
>   64 |     protected final Interceptor<B, R>[] interceptors;
    65 |     protected final B target;
    66 |     protected final ExecutableMethod<B, R> executionHandle;
    67 |     protected final MutableConvertibleValues attributes = MutableConvertibleValues.of(new ConcurrentHashMap<>());
```

#### 🔧 How to Fix

Improve code quality: follow naming conventions, add documentation, reduce complexity

**Recommended Code**:

```java
64: // ⚠️ AI-generated fix not available - Manual review required
65: // Issue: Variable &apos;interceptors&apos; must be private and have accessor methods.
66: // See Code Quality documentation for fix patterns
67: // Context: InterceptorChain.java line 64
```

**Best Practices to Follow**:

- Review codequality best practices documentation
- Consult with team lead for high Code Quality issues
- Apply industry-standard solutions for this issue type

#### 📎 All Occurrences

This issue appears in **733 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-design-visibilitymodifiercheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-design-visibilitymodifiercheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 733 occurrences with one click!

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Coding MagicNumberCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 263 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-coding-magicnumbercheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.coding.MagicNumberCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `validation/src/test/groovy/io/micronaut/validation/Foo.java` (Line 29)

**Code**:

```java
    26 | @Singleton
    27 | @Validated
    28 | public class Foo {
>   29 |     public String testMe(@Digits(integer = 3, fraction = 2) String number) {
    30 |         return '$' + number;
    31 |     }
    32 | }
```

#### 🔧 How to Fix

Replace the magic number '3' with a named constant to improve readability and maintainability.

**Recommended Code**:

```java
Before:
int result = calculate(3);

After:
private static final int MAX_RETRIES = 3;
int result = calculate(MAX_RETRIES);
```

**Best Practices to Follow**:

- Use named constants instead of magic numbers for clarity
- Centralize configuration values for easier maintenance
- Improve code readability by giving meaningful names to constants

#### 📎 All Occurrences

This issue appears in **263 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-coding-magicnumbercheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-coding-magicnumbercheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 263 occurrences with one click!

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Whitespace OperatorWrapCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 158 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-whitespace-operatorwrapcheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.whitespace.OperatorWrapCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `core/src/main/java/io/micronaut/core/type/DefaultArgument.java` (Line 162)

**Code**:

```java
   159 |         if (o == null) {
   160 |             return false;
   161 |         }
>  162 |         return Objects.equals(type, o.getType()) &&
   163 |             Objects.equals(typeParameters, o.getTypeVariables());
   164 |     }
   165 | 
```

#### 🔧 How to Fix

Place the '&&' operator on a new line to improve readability and adhere to code formatting standards.

**Recommended Code**:

```java
if (condition1
    && condition2) {
    // logic
}
```

**Best Practices to Follow**:

- Use consistent and readable line breaks for logical operators.
- Follow code formatting standards to enhance code readability.
- Ensure operators are clearly separated for better code comprehension.

#### 📎 All Occurrences

This issue appears in **158 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-whitespace-operatorwrapcheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-whitespace-operatorwrapcheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 158 occurrences with one click!

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Javadoc JavadocPackageCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 117 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-javadoc-javadocpackagecheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.javadoc.JavadocPackageCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `validation/src/test/groovy/io/micronaut/validation/Foo.java` (Line 1)

**Code**:

```java
>    1 | /*
     2 |  * Copyright 2017-2018 original authors
     3 |  *
     4 |  * Licensed under the Apache License, Version 2.0 (the "License");
```

#### 🔧 How to Fix

Create a package-info.java file in the package directory to define package-level annotations and documentation.

**Recommended Code**:

```java
Before: No package-info.java file exists.
After: Create a package-info.java file with package-level annotations and documentation, for example:

/**
 * This package contains validation test classes for the application.
 */
package io.micronaut.validation;
```

**Best Practices to Follow**:

- Use package-info.java to document package purpose and define package-level annotations
- Keep package documentation concise and meaningful
- Ensure package structure aligns with modular and maintainable design

#### 📎 All Occurrences

This issue appears in **117 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-javadoc-javadocpackagecheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-javadoc-javadocpackagecheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 117 occurrences with one click!

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks NewlineAtEndOfFileCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 35 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-newlineatendoffilecheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.NewlineAtEndOfFileCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `validation/src/test/groovy/io/micronaut/validation/Foo.java` (Line 1)

**Code**:

```java
>    1 | /*
     2 |  * Copyright 2017-2018 original authors
     3 |  *
     4 |  * Licensed under the Apache License, Version 2.0 (the "License");
```

#### 🔧 How to Fix

Ensure the file ends with a newline character by adding an empty line at the end of the file.

**Best Practices to Follow**:

- Always end files with a newline to comply with coding standards and avoid tooling issues.
- Use consistent line endings (LF for Unix-based systems, CRLF for Windows) to prevent version control conflicts.
- Automate code formatting with tools like Prettier or Checkstyle to enforce newline conventions.

#### 📎 All Occurrences

This issue appears in **35 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-newlineatendoffilecheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-newlineatendoffilecheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 35 occurrences with one click!

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Design HideUtilityClassConstructorCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 34 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-design-hideutilityclassconstructorcheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.design.HideUtilityClassConstructorCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Architecture  
**Focus**: Improving system design, maintainability, and extensibility

#### 📍 Representative Example

**Location**: `core/src/main/java/io/micronaut/core/annotation/AnnotationUtil.java` (Line 44)

**Code**:

```java
    41 |  * @author Graeme Rocher
    42 |  * @since 1.0
    43 |  */
>   44 | public class AnnotationUtil {
    45 | 
    46 |     /**
    47 |      * Constant for Kotlin metadata.
```

#### 🔧 How to Fix

Add a private constructor to the utility class to prevent instantiation.

**Recommended Code**:

```java
public class AnnotationUtil {
    private AnnotationUtil() {
        throw new UnsupportedOperationException("Utility class cannot be instantiated");
    }
    // existing methods
}
```

**Best Practices to Follow**:

- Prevent instantiation of utility classes by using a private constructor
- Throw an exception in the constructor to enforce immutability and prevent misuse
- Ensure consistency with standard Java utility class patterns

#### 📎 All Occurrences

This issue appears in **34 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-design-hideutilityclassconstructorcheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-design-hideutilityclassconstructorcheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 34 occurrences with one click!

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Javadoc JavadocMethodCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 34 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-javadoc-javadocmethodcheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.javadoc.JavadocMethodCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `core/src/main/java/io/micronaut/core/beans/SimpleBeanInfo.java` (Line 287)

**Code**:

```java
   284 |      * were specified for single property.
   285 |      */
   286 |     @SuppressWarnings("unchecked")
>  287 |     private void fixGetSet(HashMap<String, HashMap> propertyTable) {
   288 | 
   289 |         if (propertyTable == null) {
   290 |             return;
```

#### 🔧 How to Fix

Add the missing @param tag for the 'propertyTable' parameter in the Javadoc comment of the method.

**Recommended Code**:

```java
Before:
/**
 * Method description.
 */
public void myMethod(Map<String, Object> propertyTable) {
 // method body
}

After:
/**
 * Method description.
 *
 * @param propertyTable the property table to use
 */
public void myMethod(Map<String, Object> propertyTable) {
 // method body
}
```

**Best Practices to Follow**:

- Use Javadoc to document all method parameters for clarity and maintainability
- Ensure all public and protected methods have complete and accurate Javadoc comments
- Follow standard Javadoc conventions for parameter documentation

#### 📎 All Occurrences

This issue appears in **34 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-javadoc-javadocmethodcheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-javadoc-javadocmethodcheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 34 occurrences with one click!

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Sizes ParameterNumberCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 32 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-sizes-parameternumbercheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.sizes.ParameterNumberCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `aop/src/main/java/io/micronaut/aop/writer/AopProxyWriter.java` (Line 355)

**Code**:

```java
   352 |      * @param genericTypes               The generic types of each argument. Can be null.
   353 |      * @param annotationMetadata         metadata
   354 |      */
>  355 |     public void visitAroundMethod(Object declaringType,
   356 |                                   Object returnType,
   357 |                                   Object genericReturnType,
   358 |                                   Map<String, Object> returnTypeGenericTypes,
```

#### 🔧 How to Fix

Refactor the method by grouping related parameters into objects or using a builder pattern to reduce the number of parameters and improve readability.

**Recommended Code**:

```java
Before:
public void method(String param1, String param2, String param3, String param4, String param5, String param6, String param7, String param8, String param9) {
    // method logic
}

After:
public class MethodParams {
    private String param1;
    private String param2;
    private String param3;
    private String param4;
    private String param5;
    private String param6;
    private String param7;
    private String param8;
    private String param9;

    // constructor, getters, and setters
}

public void method(MethodParams params) {
    // method logic
}
```

**Best Practices to Follow**:

- Group related parameters into a single object to reduce method parameter count.
- Use builder pattern for complex object creation to improve readability and maintainability.
- Keep method signatures concise and focused on a single responsibility.

#### 📎 All Occurrences

This issue appears in **32 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-sizes-parameternumbercheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-sizes-parameternumbercheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 32 occurrences with one click!

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Modifier RedundantModifierCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 29 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-modifier-redundantmodifiercheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.modifier.RedundantModifierCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `core/src/main/java/io/micronaut/core/convert/DefaultConversionService.java` (Line 800)

**Code**:

```java
   797 |             this(source, target, null);
   798 |         }
   799 | 
>  800 |         public ConvertiblePair(Class source, Class target, Class<? extends Annotation> formattingAnnotation) {
   801 |             this.source = source;
   802 |             this.target = target;
   803 |             this.formattingAnnotation = formattingAnnotation;
```

#### 🔧 How to Fix

Remove the redundant 'public' modifier from the method or class declaration as it is already implied by the context or not necessary for inner classes or interfaces.

**Recommended Code**:

```java
Before:
public void myMethod() { ... }

After:
void myMethod() { ... }
```

**Best Practices to Follow**:

- Avoid redundant modifiers to keep code concise and readable
- Follow language defaults to reduce unnecessary boilerplate
- Ensure consistency with codebase conventions

#### 📎 All Occurrences

This issue appears in **29 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-modifier-redundantmodifiercheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-modifier-redundantmodifiercheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 29 occurrences with one click!

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Whitespace ParenPadCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 23 files | **Category**: EXISTING_REST | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-whitespace-parenpadcheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.whitespace.ParenPadCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `http-client/src/test/groovy/io/micronaut/http/client/docs/basics/HelloController.java` (Line 44)

**Code**:

```java
    41 |     // tag::nonblocking[]
    42 |     @Get("/hello/{name}")
    43 |     Maybe<String> hello(String name) { // <1>
>   44 |         return httpClient.retrieve( GET("/endpoint/hello/" + name) )
    45 |                          .firstElement(); // <2>
    46 |     }
    47 |     // end::nonblocking[]
```

#### 🔧 How to Fix

Remove the whitespace following the opening parenthesis in the method call.

**Recommended Code**:

```java
Before: someMethod( arg1, arg2);
After: someMethod(arg1, arg2);
```

**Best Practices to Follow**:

- consistentSpacing
- codeFormatting
- readability

#### 📎 All Occurrences

This issue appears in **23 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-whitespace-parenpadcheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-whitespace-parenpadcheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 23 occurrences with one click!

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Blocks LeftCurlyCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 13 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-blocks-leftcurlycheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.blocks.LeftCurlyCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `router/src/test/groovy/io/micronaut/context/router/RouteBuilderTests.java` (Line 139)

**Code**:

```java
   136 |             return "Hello " + message;
   137 |         }
   138 | 
>  139 |         String show(Long id) { return "Book " + id; }
   140 |         String index() { return "dummy"; }
   141 |         String save() { return "dummy"; }
   142 |         String delete(Long id) { return "dummy"; }
```

#### 🔧 How to Fix

Add a line break after the '{' to improve code readability and adhere to code formatting standards.

**Recommended Code**:

```java
Before:
if (condition) { // Missing line break after '{'
    // code
}

After:
if (condition) {
    // code
}
```

**Best Practices to Follow**:

- Follow code formatting standards for consistent code structure
- Use line breaks after opening braces for improved readability
- Ensure code is aligned with team and project conventions

#### 📎 All Occurrences

This issue appears in **13 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-blocks-leftcurlycheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-blocks-leftcurlycheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 13 occurrences with one click!

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Javadoc JavadocTypeCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 11 files | **Category**: EXISTING_REST | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-javadoc-javadoctypecheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.javadoc.JavadocTypeCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `inject-java/src/test/groovy/io/micronaut/aop/factory/InterfaceClass.java` (Line 24)

**Code**:

```java
    21 |  * @author Graeme Rocher
    22 |  * @since 1.0
    23 |  */
>   24 | public interface InterfaceClass<A> {
    25 | 
    26 | 
    27 |     String test(String name);
```

#### 🔧 How to Fix

Improve code quality: follow naming conventions, add documentation, reduce complexity

**Recommended Code**:

```java
24: // ⚠️ AI-generated fix not available - Manual review required
25: // Issue: Type Javadoc comment is missing @param &lt;A&gt; tag.
26: // See Code Quality documentation for fix patterns
27: // Context: InterfaceClass.java line 24
```

**Best Practices to Follow**:

- Review codequality best practices documentation
- Consult with team lead for high Code Quality issues
- Apply industry-standard solutions for this issue type

#### 📎 All Occurrences

This issue appears in **11 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-javadoc-javadoctypecheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-javadoc-javadoctypecheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 11 occurrences with one click!

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Naming ConstantNameCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 10 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-naming-constantnamecheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.naming.ConstantNameCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `core/src/main/java/io/micronaut/core/beans/Introspector.java` (Line 34)

**Code**:

```java
    31 |     private static final int DEFAULT_CAPACITY = 128;
    32 | 
    33 |     @SuppressWarnings({"unchecked", "ConstantName"})
>   34 |     private static final Cache<Class<?>, BeanInfo> theCache = Caffeine.newBuilder()
    35 |                                                                       .maximumSize(DEFAULT_CAPACITY)
    36 |                                                                       .build();
    37 | 
```

#### 🔧 How to Fix

Rename the variable 'theCache' to follow the naming pattern by using uppercase letters and optionally underscores for constants or static fields.

**Recommended Code**:

```java
BEFORE: private static final Map<String, Object> theCache = new HashMap<>();
AFTER: private static final Map<String, Object> THE_CACHE = new HashMap<>();
```

**Best Practices to Follow**:

- Follow naming conventions for constants and static fields
- Use descriptive and consistent naming patterns
- Ensure code adheres to team or project style guides

#### 📎 All Occurrences

This issue appears in **10 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-naming-constantnamecheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-naming-constantnamecheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 10 occurrences with one click!

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Naming StaticVariableNameCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 9 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-naming-staticvariablenamecheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.naming.StaticVariableNameCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `inject-groovy/src/test/groovy/io/micronaut/inject/visitor/AllClassesVisitor.java` (Line 26)

**Code**:

```java
    23 | 
    24 | public class AllClassesVisitor implements TypeElementVisitor<Object, Get> {
    25 | 
>   26 |     public static List<String> VISITED_ELEMENTS = new ArrayList<>();
    27 | 
    28 |     @Override
    29 |     public void visitClass(ClassElement element, VisitorContext context) {
```

#### 🔧 How to Fix

Improve code quality: follow naming conventions, add documentation, reduce complexity

**Recommended Code**:

```java
26: // ⚠️ AI-generated fix not available - Manual review required
27: // Issue: Name &apos;VISITED_ELEMENTS&apos; must match pattern &apos;^[a-z][a-zA-Z0-9]*$&apos;.
28: // See Code Quality documentation for fix patterns
29: // Context: AllClassesVisitor.java line 26
```

**Best Practices to Follow**:

- Review codequality best practices documentation
- Consult with team lead for high Code Quality issues
- Apply industry-standard solutions for this issue type

#### 📎 All Occurrences

This issue appears in **9 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-naming-staticvariablenamecheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-naming-staticvariablenamecheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 9 occurrences with one click!

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Design InterfaceIsTypeCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 8 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-design-interfaceistypecheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.design.InterfaceIsTypeCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Architecture  
**Focus**: Improving system design, maintainability, and extensibility

#### 📍 Representative Example

**Location**: `inject/src/main/java/io/micronaut/inject/processing/ProcessedTypes.java` (Line 25)

**Code**:

```java
    22 |  * @author graemerocher
    23 |  * @since 1.0
    24 |  */
>   25 | public interface ProcessedTypes {
    26 | 
    27 |     /**
    28 |      * Constant for {@link javax.annotation.PostConstruct} annotation.
```

#### 🔧 How to Fix

Improve code quality: follow naming conventions, add documentation, reduce complexity

**Recommended Code**:

```java
25: // ⚠️ AI-generated fix not available - Manual review required
26: // Issue: interfaces should describe a type and hence have methods.
27: // See Code Quality documentation for fix patterns
28: // Context: ProcessedTypes.java line 25
```

**Best Practices to Follow**:

- Review codequality best practices documentation
- Consult with team lead for high Code Quality issues
- Apply industry-standard solutions for this issue type

#### 📎 All Occurrences

This issue appears in **8 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-design-interfaceistypecheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-design-interfaceistypecheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 8 occurrences with one click!

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Sizes MethodLengthCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 7 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-sizes-methodlengthcheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.sizes.MethodLengthCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `aop/src/main/java/io/micronaut/aop/writer/AopProxyWriter.java` (Line 533)

**Code**:

```java
   530 |     /**
   531 |      * Finalizes the proxy. This method should be called before writing the proxy to disk with {@link #writeTo(File)}
   532 |      */
>  533 |     @Override
   534 |     public void visitBeanDefinitionEnd() {
   535 |         if (constructorArgumentTypes == null) {
   536 |             throw new IllegalStateException("The method visitBeanDefinitionConstructor(..) should be called at least once");
```

#### 🔧 How to Fix

Improve code quality: follow naming conventions, add documentation, reduce complexity

**Recommended Code**:

```java
533: // ⚠️ AI-generated fix not available - Manual review required
534: // Issue: Method visitBeanDefinitionEnd length is 277 lines (max allowed is 150).
535: // See Code Quality documentation for fix patterns
536: // Context: AopProxyWriter.java line 533
```

**Best Practices to Follow**:

- Review codequality best practices documentation
- Consult with team lead for high Code Quality issues
- Apply industry-standard solutions for this issue type

#### 📎 All Occurrences

This issue appears in **7 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-sizes-methodlengthcheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-sizes-methodlengthcheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 7 occurrences with one click!

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Blocks RightCurlyCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 7 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-blocks-rightcurlycheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.blocks.RightCurlyCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `http-server-netty/src/test/groovy/io/micronaut/http/server/netty/interceptor/TestSecurityFilter.java` (Line 50)

**Code**:

```java
    47 |         Assert.that(!request.getAttributes().contains("second"));
    48 |         if(request.getParameters().get("username") == null) {
    49 |             return Publishers.just(HttpResponse.status(HttpStatus.FORBIDDEN));
>   50 |         }
    51 |         else {
    52 |             request.getAttributes().put("authenticated", true);
    53 |             return Publishers.then(
```

#### 🔧 How to Fix

Improve code quality: follow naming conventions, add documentation, reduce complexity

**Recommended Code**:

```java
50: // ⚠️ AI-generated fix not available - Manual review required
51: // Issue: &apos;}&apos; at column 9 should be on the same line as the next part of a multi-block statement (one that directly contains multiple blocks: if/else-if/else, do/while or try/catch/finally).
52: // See Code Quality documentation for fix patterns
53: // Context: TestSecurityFilter.java line 50
```

**Best Practices to Follow**:

- Review codequality best practices documentation
- Consult with team lead for high Code Quality issues
- Apply industry-standard solutions for this issue type

#### 📎 All Occurrences

This issue appears in **7 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-blocks-rightcurlycheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-blocks-rightcurlycheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 7 occurrences with one click!

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks TodoCommentCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 6 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-todocommentcheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.TodoCommentCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `core/src/main/java/io/micronaut/core/io/scan/ClassPathAnnotationScanner.java` (Line 151)

**Code**:

```java
   148 |                         if (LOG.isDebugEnabled()) {
   149 |                             LOG.debug("Ignoring JAR URI entry [" + url + "]. No JarURLConnection found.");
   150 |                         }
>  151 |                         // TODO: future support for servlet containers
   152 |                     }
   153 | 
   154 |                 }
```

#### 🔧 How to Fix

Replace the TODO comment with a proper task tracking reference or implement the functionality if it's ready to be addressed.

**Best Practices to Follow**:

- Avoid using TODO comments for long-term task tracking; use issue tracking systems instead.
- Replace TODOs with actionable items or completed code when ready.
- Ensure comments are meaningful and add context to the code.

#### 📎 All Occurrences

This issue appears in **6 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-todocommentcheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-todocommentcheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 6 occurrences with one click!

---


### 🟠 Crypto Ssl Defaulthttpclient Is Deprecated

**Severity**: HIGH | **Tool**: semgrep | **Found in**: 5 files | **Category**: NEW

---

#### 📋 What is this issue?

Using weak or deprecated cryptographic algorithms (Rule: java.lang.security.audit.crypto.ssl.defaulthttpclient-is-deprecated.defaulthttpclient-is-deprecated) that can be broken with modern computing power.

#### 🎯 Why does it matter?

Modern hardware and cloud computing make it trivial to break weak encryption (DES, MD5, SHA1) in minutes to hours.

#### 🔍 Common causes:

- Using outdated cryptographic libraries
- Copy-pasted code from old examples
- Lack of cryptography expertise
- Not following current security standards (NIST, OWASP)

#### ⚠️ Impact if not fixed:

Data confidentiality breach, password cracking, authentication bypass, compliance violations (PCI-DSS requires AES-256), and regulatory fines.

#### ⚠️ Risk Assessment

**Overall Risk**: 🔴 **CRITICAL RISK**

Immediate action required - may lead to security breaches, data loss, or system failures

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `function-client/src/main/java/io/micronaut/function/client/http/HttpFunctionExecutor.java` (Line 77)

**Code**:

```java
    74 |             AnnotationMetadataResolver annotationMetadataResolver,
    75 |             HttpClientFilter... filters) {
    76 |         super();
>   77 |         this.httpClient = new DefaultHttpClient(
    78 |             LoadBalancer.empty(),
    79 |             configuration,
    80 |             threadFactory,
```

#### 🔧 How to Fix

Implement secure coding practice: validate inputs, use prepared statements, apply least privilege

**Recommended Code**:

```java
77: // ⚠️ AI-generated fix not available - Manual review required
78: // Issue: DefaultHttpClient is deprecated. Further, it does not support connections using TLS1.2, which makes using DefaultHttpClient a security hazard. Use HttpClientBuilder instead.
79: // See Security documentation for fix patterns
80: // Context: HttpFunctionExecutor.java line 77
```

**Best Practices to Follow**:

- Review security best practices documentation
- Consult with team lead for high Security issues
- Apply industry-standard solutions for this issue type

#### 📎 All Occurrences

This issue appears in **5 files** across your codebase.

View complete list: [group-java-lang-security-audit-crypto-ssl-defaulthttpclient-is-deprecated-defaulthttpclient-is-deprecated-high-semgrep-locations.json](attachments/group-java-lang-security-audit-crypto-ssl-defaulthttpclient-is-deprecated-defaulthttpclient-is-deprecated-high-semgrep-locations.json)

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Naming MemberNameCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 5 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-naming-membernamecheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.naming.MemberNameCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `http-client/src/main/java/io/micronaut/http/client/interceptor/HttpClientIntroductionAdvice.java` (Line 106)

**Code**:

```java
   103 |      */
   104 |     private static final MediaType[] DEFAULT_ACCEPT_TYPES = {MediaType.APPLICATION_JSON_TYPE};
   105 | 
>  106 |     final int HEADERS_INITIAL_CAPACITY = 3;
   107 |     private final BeanContext beanContext;
   108 |     private final Map<Integer, ClientRegistration> clients = new ConcurrentHashMap<>();
   109 |     private final ReactiveClientResultTransformer[] transformers;
```

#### 🔧 How to Fix

Rename the constant 'HEADERS_INITIAL_CAPACITY' to follow the naming pattern by using lowercase for the initial character and camelCase for the rest of the identifier.

**Recommended Code**:

```java
Before: private static final int HEADERS_INITIAL_CAPACITY = 10;
After: private static final int headersInitialCapacity = 10;
```

**Best Practices to Follow**:

- Follow naming conventions for constants and variables
- Use descriptive and consistent naming patterns
- Ensure code adheres to team/project-specific style guides

#### 📎 All Occurrences

This issue appears in **5 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-naming-membernamecheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-naming-membernamecheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 5 occurrences with one click!

---


### 🟠 Unsafe Reflection Usage

**Severity**: HIGH | **Tool**: semgrep | **Found in**: 3 files | **Category**: NEW

---

#### 📋 What is this issue?

Application uses reflection with user-controlled class names or method names, allowing arbitrary code execution.

#### 🎯 Why does it matter?

Attackers can instantiate arbitrary classes or invoke dangerous methods, bypassing security restrictions and executing malicious code.

#### 🔍 Common causes:

- Using Class.forName() with user input
- Dynamic method invocation with untrusted data
- Deserialization with arbitrary class loading
- Plugin systems without class whitelisting

#### ⚠️ Impact if not fixed:

Remote code execution, privilege escalation, security manager bypass, and complete application compromise. OWASP Top 10 A03:2021 (Injection).

#### ⚠️ Risk Assessment

**Overall Risk**: 🔴 **CRITICAL RISK**

Immediate action required - may lead to security breaches, data loss, or system failures

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `cli/src/main/groovy/io/micronaut/cli/console/logging/MicronautConsole.java` (Line 502)

**Code**:

```java
   499 |         if (className != null) {
   500 |             try {
   501 |                 @SuppressWarnings("unchecked")
>  502 |                 Class<? extends MicronautConsole> klass = (Class<? extends MicronautConsole>) Class.forName(className);
   503 |                 return klass.newInstance();
   504 |             } catch (Exception e) {
   505 |                 e.printStackTrace();
```

#### 🔧 How to Fix

Step-by-step solution with OWASP references (focus on HOW to fix, not repeating problem):
1. Validate and sanitize all user inputs that are used to determine class instantiation or method invocation.
2. Use a whitelist of allowed classes and methods to prevent unauthorized access.
3. Implement strict access control checks to ensure that only authorized users can perform certain actions.
4. Use security frameworks or libraries that provide built-in protection against such vulnerabilities.

OWASP References: https://owasp.org/www-community/attacks/Insecure_Direct_Object_References, https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload

**Recommended Code**:

```java
Before:
String className = userInput;
Class<?> clazz = Class.forName(className);
Object instance = clazz.newInstance();

After:
List<String> allowedClasses = Arrays.asList("com.example.AllowedClass1", "com.example.AllowedClass2");
if (allowedClasses.contains(userInput)) {
    Class<?> clazz = Class.forName(userInput);
    Object instance = clazz.newInstance();
} else {
    throw new IllegalArgumentException("Unauthorized class");
}
```

**Best Practices to Follow**:

- Validate and sanitize all user inputs
- Use a whitelist of allowed classes and methods
- Implement strict access control checks
- Use security frameworks or libraries

#### 📎 All Occurrences

This issue appears in **3 files** across your codebase.

View complete list: [group-java-lang-security-audit-unsafe-reflection-unsafe-reflection-high-semgrep-locations.json](attachments/group-java-lang-security-audit-unsafe-reflection-unsafe-reflection-high-semgrep-locations.json)

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Blocks EmptyBlockCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 3 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-blocks-emptyblockcheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.blocks.EmptyBlockCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `inject-java/src/test/java/org/atinject/tck/auto/Tck.java` (Line 113)

**Code**:

```java
   110 |         Convertible.localConvertible.set((Convertible) car);
   111 |         try {
   112 |             TestSuite suite = new TestSuite(Convertible.Tests.class);
>  113 |             if (supportsStatic) {
   114 | //                suite.addTestSuite(Convertible.StaticTests.class);
   115 |             }
   116 |             if (supportsPrivate) {
```

#### 🔧 How to Fix

Improve code quality: follow naming conventions, add documentation, reduce complexity

**Recommended Code**:

```java
113: // ⚠️ AI-generated fix not available - Manual review required
114: // Issue: Must have at least one statement.
115: // See Code Quality documentation for fix patterns
116: // Context: Tck.java line 113
```

**Best Practices to Follow**:

- Review codequality best practices documentation
- Consult with team lead for high Code Quality issues
- Apply industry-standard solutions for this issue type

#### 📎 All Occurrences

This issue appears in **3 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-blocks-emptyblockcheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-blocks-emptyblockcheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 3 occurrences with one click!

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Sizes FileLengthCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 3 files | **Category**: EXISTING_REST | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-sizes-filelengthcheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.sizes.FileLengthCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `inject/src/main/java/io/micronaut/context/DefaultBeanContext.java` (Line 1)

**Code**:

```java
>    1 | /*
     2 |  * Copyright 2017-2018 original authors
     3 |  *
     4 |  * Licensed under the Apache License, Version 2.0 (the "License");
```

#### 🔧 How to Fix

Split the class into smaller, focused classes based on responsibility. Extract methods and inner classes into separate files as needed.

**Recommended Code**:

```java
Before:
public class DefaultBeanContext { ... // 2,240 lines of code }

After:
public class DefaultBeanContext {
    private final BeanRegistrationManager registrationManager;
    private final DependencyResolver dependencyResolver;

    public DefaultBeanContext() {
        this.registrationManager = new BeanRegistrationManager();
        this.dependencyResolver = new DependencyResolver();
    }

    // Only core methods remain here
}

// New file: BeanRegistrationManager.java
public class BeanRegistrationManager {
    // Extracted methods related to bean registration
}

// New file: DependencyResolver.java
public class DependencyResolver {
    // Extracted methods related to dependency resolution
}
```

**Best Practices to Follow**:

- Follow the Single Responsibility Principle by dividing large classes into smaller ones.
- Use modular design to improve readability and maintainability.
- Keep class lengths under the defined limit (e.g., 2,000 lines) for better code management.

#### 📎 All Occurrences

This issue appears in **3 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-sizes-filelengthcheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-sizes-filelengthcheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 3 occurrences with one click!

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Design FinalClassCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 2 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-design-finalclasscheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.design.FinalClassCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Architecture  
**Focus**: Improving system design, maintainability, and extensibility

#### 📍 Representative Example

**Location**: `inject-java/src/test/java/org/atinject/tck/auto/Tck.java` (Line 83)

**Code**:

```java
    80 |  * java -cp javax.inject-tck.jar:junit.jar:myinjector.jar \
    81 |  *     junit.textui.TestRunner MyTck</pre>
    82 |  */
>   83 | public class Tck {
    84 | 
    85 |     private Tck() {}
    86 | 
```

#### 🔧 How to Fix

Improve code quality: follow naming conventions, add documentation, reduce complexity

**Recommended Code**:

```java
83: // ⚠️ AI-generated fix not available - Manual review required
84: // Issue: Class Tck should be declared as final.
85: // See Code Quality documentation for fix patterns
86: // Context: Tck.java line 83
```

**Best Practices to Follow**:

- Review codequality best practices documentation
- Consult with team lead for high Code Quality issues
- Apply industry-standard solutions for this issue type

#### 📎 All Occurrences

This issue appears in **2 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-design-finalclasscheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-design-finalclasscheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 2 occurrences with one click!

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Coding MultipleVariableDeclarationsCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 2 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-coding-multiplevariabledeclarationscheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.coding.MultipleVariableDeclarationsCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `runtime/src/main/java/io/micronaut/scheduling/cron/CronExpression.java` (Line 148)

**Code**:

```java
   145 |         DAY_OF_WEEK(1, 7,
   146 |                 Arrays.asList("MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"));
   147 | 
>  148 |         final int from, to;
   149 |         final List<String> names;
   150 | 
   151 |         /**
```

#### 🔧 How to Fix

Split variable declarations into individual statements to adhere to clean code conventions and improve readability.

**Recommended Code**:

```java
Before:
int x = 10, y = 20, z = 30;

After:
int x = 10;
int y = 20;
int z = 30;
```

**Best Practices to Follow**:

- Declare one variable per statement for clarity and maintainability.
- Improve code readability by reducing cognitive load.
- Avoid potential issues with shared scope and initialization order.

#### 📎 All Occurrences

This issue appears in **2 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-coding-multiplevariabledeclarationscheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-coding-multiplevariabledeclarationscheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 2 occurrences with one click!

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Whitespace EmptyForIteratorPadCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 2 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-whitespace-emptyforiteratorpadcheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.whitespace.EmptyForIteratorPadCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `cli/src/main/groovy/io/micronaut/cli/io/support/PathMatchingResourcePatternResolver.java` (Line 419)

**Code**:

```java
   416 |                 rootEntryPath = rootEntryPath + "/";
   417 |             }
   418 |             Set<Resource> result = new LinkedHashSet<Resource>(8);
>  419 |             for (Enumeration<JarEntry> entries = jarFile.entries(); entries.hasMoreElements(); ) {
   420 |                 JarEntry entry = entries.nextElement();
   421 |                 String entryPath = entry.getName();
   422 |                 if (entryPath.startsWith(rootEntryPath)) {
```

#### 🔧 How to Fix

Remove whitespace after the semicolon to adhere to code formatting standards.

**Recommended Code**:

```java
Before: `if (condition); 
    doSomething();

After: `if (condition);
    doSomething();
```

**Best Practices to Follow**:

- Follow consistent code formatting conventions
- Avoid unnecessary whitespace after semicolons
- Use code linters to enforce style rules

#### 📎 All Occurrences

This issue appears in **2 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-whitespace-emptyforiteratorpadcheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-whitespace-emptyforiteratorpadcheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 2 occurrences with one click!

---


### 🟠 Broken Double-Checked Locking

**Severity**: HIGH | **Tool**: pmd | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

Using broken double-checked locking pattern for lazy initialization.

#### 🎯 Why does it matter?

Without proper volatile keyword, this pattern is broken due to Java Memory Model allowing instruction reordering.

#### 🔍 Common causes:

- Using outdated Java patterns (pre-Java 5)
- Copy-pasted singleton code
- Not understanding Java Memory Model
- Trying to optimize initialization

#### ⚠️ Impact if not fixed:

Subtle race conditions leading to partially-constructed objects, random crashes, and data corruption that's extremely hard to debug.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `configurations/netflix-ribbon/src/main/java/io/micronaut/configurations/ribbon/AbstractRibbonClientConfig.java` (Line 249)

**Code**:

```java
   246 |         return getNameSpace() + "." + property;
   247 |     }
   248 | 
>  249 |     private VipAddressResolver getVipAddressResolver() {
   250 |         if (resolver == null) {
   251 |             synchronized (this) {
   252 |                 if (resolver == null) {
```

#### 🔧 How to Fix

Improve code quality: follow naming conventions, add documentation, reduce complexity

**Recommended Code**:

```java
249: // ⚠️ AI-generated fix not available - Manual review required
250: // Issue: Double checked locking is not thread safe in Java.
251: // See Code Quality documentation for fix patterns
252: // Context: AbstractRibbonClientConfig.java line 249
```

**Best Practices to Follow**:

- Review codequality best practices documentation
- Consult with team lead for high Code Quality issues
- Apply industry-standard solutions for this issue type

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

View complete list: [group-doublecheckedlocking-high-pmd-locations.json](attachments/group-doublecheckedlocking-high-pmd-locations.json)

---


### 🟠 Problem Based Packs Insecure Transport Java Stdlib Httpurlconnection Http Request

**Severity**: HIGH | **Tool**: semgrep | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

This issue was detected by semgrep as a high severity problem. Rule: problem-based-packs.insecure-transport.java-stdlib.httpurlconnection-http-request.httpurlconnection-http-request

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate semgrep best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### ⚠️ Risk Assessment

**Overall Risk**: 🔴 **CRITICAL RISK**

Immediate action required - may lead to security breaches, data loss, or system failures

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `inject/src/main/java/io/micronaut/context/env/DefaultEnvironment.java` (Line 702)

**Code**:

```java
   699 |     @SuppressWarnings("MagicNumber")
   700 |     private static boolean isGoogleCompute() {
   701 |         try {
>  702 |             URL url = new URL("http://metadata.google.internal");
   703 |             HttpURLConnection con = (HttpURLConnection) url.openConnection();
   704 |             con.setReadTimeout(500);
   705 |             con.setConnectTimeout(500);
```

#### 🔧 How to Fix

1. Update the URL used in the HttpURLConnection to use HTTPS instead of HTTP. 2. Validate and enforce secure communication protocols (e.g., TLS 1.2 or higher) in the code. 3. Use a secure HTTP client library (e.g., Apache HttpClient or OkHttp) that supports secure connections by default. Reference: OWASP ASVS v4.0 - V2.2.1 (Ensure all communication is encrypted).

**Recommended Code**:

```java
Before: URL url = new URL("http://example.com");
After: URL url = new URL("https://example.com");
```

**Best Practices to Follow**:

- Always use HTTPS for all network communication to ensure data is encrypted in transit.
- Validate SSL/TLS certificates using a trusted certificate authority to prevent man-in-the-middle attacks.
- Use secure HTTP client libraries that enforce secure defaults and handle certificate validation automatically.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

View complete list: [group-problem-based-packs-insecure-transport-java-stdlib-httpurlconnection-http-request-httpurlconnection-http-request-high-semgrep-locations.json](attachments/group-problem-based-packs-insecure-transport-java-stdlib-httpurlconnection-http-request-httpurlconnection-http-request-high-semgrep-locations.json)

---


### 🟠 Html Security Audit Missing Integrity

**Severity**: HIGH | **Tool**: semgrep | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

This issue was detected by semgrep as a high severity problem. Rule: html.security.audit.missing-integrity.missing-integrity

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate semgrep best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### ⚠️ Risk Assessment

**Overall Risk**: 🔴 **CRITICAL RISK**

Immediate action required - may lead to security breaches, data loss, or system failures

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `src/main/docs/resources/style/layout.html` (Line 11)

**Code**:

```text
     8 |     <link rel="stylesheet" href="${resourcesPath}/css/custom.css" type="text/css" media="screen, print" title="Style" charset="utf-8" />
     9 |     <link rel="stylesheet" href="${resourcesPath}/css/pdf.css" type="text/css" media="print" title="PDF" charset="utf-8" />
    10 |     <script src="${resourcesPath}/js/docs.js"></script>
>   11 |     <script src="https://cdnjs.cloudflare.com/ajax/libs/clipboard.js/1.5.13/clipboard.min.js"></script>
    12 |     <script type="text/javascript">
    13 |         function addJsClass(el) {
    14 |             var classes = document.body.className.split(" ");
```

#### 🔧 How to Fix

Add the 'integrity' attribute to the tag with the base64-encoded cryptographic hash of the external resource. Use a secure source (e.g., SHA-256) for the hash. Refer to OWASP's Secure Coding Practices for SRI implementation.

**Recommended Code**:

```text
Before: <script src="https://example.com/external.js"></script>
After: <script src="https://example.com/external.js" integrity="sha256-abc123...xyz=" crossorigin="anonymous"></script>
```

**Best Practices to Follow**:

- Always use Subresource Integrity (SRI) for external resources.
- Use HTTPS for all external resources to prevent tampering in transit.
- Regularly update and verify the integrity hashes of external resources.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

View complete list: [group-html-security-audit-missing-integrity-missing-integrity-high-semgrep-locations.json](attachments/group-html-security-audit-missing-integrity-missing-integrity-high-semgrep-locations.json)

---


### 🟠 Html Security Plaintext Http Link

**Severity**: HIGH | **Tool**: semgrep | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

This issue was detected by semgrep as a high severity problem. Rule: html.security.plaintext-http-link.plaintext-http-link

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate semgrep best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### ⚠️ Risk Assessment

**Overall Risk**: 🔴 **CRITICAL RISK**

Immediate action required - may lead to security breaches, data loss, or system failures

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `src/main/docs/resources/style/layout.html` (Line 24)

**Code**:

```text
    21 | <body class="body" onload="addJsClass();">
    22 | <div id="navigation">
    23 |     <div class="navTitle">
>   24 |         <span id="logo"><a href="http://micronaut.io" title="Go to Micronaut Website"><img src="${resourcesPath}/img/micronaut-logo-white.svg" alt="Micronaut"/></a></span>
    25 |     </div>
    26 |     <div class="navLinks">
    27 |         <ul>
```

#### 🔧 How to Fix

Update the HTTP URL to use HTTPS. Ensure the resource is available over HTTPS and update the link accordingly. Refer to OWASP's 'Transport Layer Protection' guidelines (https://owasp.org/www-project-cheat-sheets/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html) for secure communication practices.

**Recommended Code**:

```text
Before: <link href="http://example.com/style.css" rel="stylesheet">
After: <link href="https://example.com/style.css" rel="stylesheet">
```

**Best Practices to Follow**:

- Always use HTTPS for all external resources to ensure encrypted communication.
- Verify that the external resource supports HTTPS before linking to it.
- Implement HSTS (HTTP Strict Transport Security) headers on your web server to enforce secure connections.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

View complete list: [group-html-security-plaintext-http-link-plaintext-http-link-high-semgrep-locations.json](attachments/group-html-security-plaintext-http-link-plaintext-http-link-high-semgrep-locations.json)

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Blocks NeedBracesCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 1 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-blocks-needbracescheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.blocks.NeedBracesCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `inject-java/src/test/groovy/io/micronaut/aop/introduction/StubIntroducer.java` (Line 43)

**Code**:

```java
    40 |     @Override
    41 |     public Object intercept(MethodInvocationContext<Object, Object> context) {
    42 |         Iterator<MutableArgumentValue<?>> iterator = context.getParameters().values().iterator();
>   43 |         if(iterator.hasNext())
    44 |             return iterator.next().getValue();
    45 |         return null;
    46 |     }
```

#### 🔧 How to Fix

Wrap the single statement inside the 'if' block with curly braces to ensure clarity and prevent potential logical errors.

**Recommended Code**:

```java
Before:
if (condition)
    statement;

After:
if (condition) {
    statement;
}
```

**Best Practices to Follow**:

- Always use curly braces for 'if' constructs to improve readability and avoid errors.
- Follow consistent code formatting conventions.
- Write self-documenting code for better maintainability.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-blocks-needbracescheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-blocks-needbracescheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 1 occurrences with one click!

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Javadoc InvalidJavadocPositionCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 1 files | **Category**: EXISTING_REST | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-javadoc-invalidjavadocpositioncheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.javadoc.InvalidJavadocPositionCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `inject-java/src/test/groovy/io/micronaut/inject/annotation/TestCachePuts.java` (Line 18)

**Code**:

```java
    15 |  */
    16 | package io.micronaut.inject.annotation;
    17 | 
>   18 | /**
    19 |  * @author Graeme Rocher
    20 |  * @since 1.0
    21 |  */
```

#### 🔧 How to Fix

Move the Javadoc comment to immediately precede the method or class it is documenting. Ensure the comment is placed above the declaration, not inline or after the code.

**Recommended Code**:

```java
/*
 * Javadoc comment describing the purpose of the method or class.
 */
public class TestCachePuts {
    // Class implementation
}
```

**Best Practices to Follow**:

- Place Javadoc comments directly above the method or class they describe
- Use clear and concise documentation for public and protected members
- Follow standard Javadoc formatting and conventions for consistency

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-javadoc-invalidjavadocpositioncheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-javadoc-invalidjavadocpositioncheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 1 occurrences with one click!

---


### 🟠 Com Puppycrawl Tools Checkstyle Checks Javadoc JavadocStyleCheck

**Severity**: HIGH | **Tool**: checkstyle | **Found in**: 1 files | **Category**: EXISTING_REST | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-javadoc-javadocstylecheck-high-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a high severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.javadoc.JavadocStyleCheck

#### 🎯 Why does it matter?

This pattern can lead to security vulnerabilities, bugs, or system failures.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

Could lead to security breaches, data loss, system instability, or production outages. Requires immediate attention.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `inject-java/src/test/groovy/io/micronaut/inject/bind/TestAuthorBinder.java` (Line 26)

**Code**:

```java
    23 | import java.net.URI;
    24 | import java.util.Optional;
    25 | 
>   26 | /**
    27 |  * Example of compile time generated binder
    28 |  *
    29 |  * @author Graeme Rocher
```

#### 🔧 How to Fix

Ensure the first sentence in the Javadoc ends with a period to comply with documentation conventions.

**Recommended Code**:

```java
Before:
/**
 * This is an example of a Javadoc comment without a period.
 */

After:
/**
 * This is an example of a Javadoc comment without a period.
 */
```

**Best Practices to Follow**:

- Always end the first sentence of Javadoc with a period for clarity and consistency.
- Use concise and descriptive Javadoc comments to explain the purpose and usage of classes, methods, and fields.
- Follow standard Javadoc conventions to ensure maintainability and readability for other developers.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-javadoc-javadocstylecheck-high-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-javadoc-javadocstylecheck-high-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 1 occurrences with one click!

---


### 🟠 CVE 2023 35947

**Severity**: HIGH | **Tool**: dependency-check | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

Known security vulnerability CVE-2023-35947 in dependency. This vulnerability was publicly disclosed in 2023 and has a known exploit.

#### 🎯 Why does it matter?

Attackers actively scan for known CVEs in web applications. Public exploits exist, making this vulnerability easy to exploit at scale.

#### 🔍 Common causes:

- Using outdated dependency versions
- Not regularly updating dependencies
- Lack of automated dependency scanning in CI/CD
- Delayed security patch application

#### ⚠️ Impact if not fixed:

High security risk with publicly available exploits. Could lead to remote code execution, data theft, or system compromise. Compliance frameworks (SOC2, ISO 27001) require timely patching of known vulnerabilities.

#### ⚠️ Risk Assessment

**Overall Risk**: 🔴 **CRITICAL RISK**

Immediate action required - may lead to security breaches, data loss, or system failures

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `gradle/wrapper/gradle-wrapper.jar` (Line 1)

**Code**:

```text
>    1 | PK     A            	   META-INF/ PK     A (M��?   T      META-INF/MANIFEST.MF�M��LK-.�K-*��ϳR0�3����-�I�M�+I,
     2 | �d��Z)�%��b�µ���r�r PK     A               org/ PK     A               org/gradle/ PK     A               org/gradle/wrapper/ PK     A �zZ��  �	  -   org/gradle/wrapper...
     3 | �	�@c5�žv���2$����ڗ����Sz���?B;W�op��s�ٿ�;#����g ^�O2Bx[�a�KX�pA� .�X�%���˒�e\�U���
     4 | ����&Ẅ)�X�pCƻ�H���X�p+�����|y�/w�Pe�#+!�Ǽ�C(H�8��='���
```

#### 🔧 How to Fix

Implement secure coding practice: validate inputs, use prepared statements, apply least privilege

**Recommended Code**:

```text
1: // ⚠️ AI-generated fix not available - Manual review required
2: // Issue: Gradle is a build tool with a focus on build automation and support for multi-language development. In affected versions when unpacking Tar archives, Gradle did not check that files could be written outside of the unpack location. This could lead to important files being overwritten anywhere the Gradle process has write permissions. For a build reading Tar entries from a Tar archive, this issue could allow Gradle to disclose information from sensitive files through an arbitrary file read. To exploit this behavior, an attacker needs to either control the source of an archive already used by the build or modify the build to interact with a malicious archive. It is unlikely that this would go unnoticed. A fix has been released in Gradle 7.6.2 and 8.2 to protect against this vulnerability. Starting from these versions, Gradle will refuse to handle Tar archives which contain path traversal elements in a Tar entry name. Users are advised to upgrade. There are no known workarounds for this vulnerability.

### Impact

This is a path traversal vulnerability when Gradle deals with Tar archives, often referenced as TarSlip, a variant of ZipSlip.

* When unpacking Tar archives, Gradle did not check that files could be written outside of the unpack location. This could lead to important files being overwritten anywhere the Gradle process has write permissions.
* For a build reading Tar entries from a Tar archive, this issue could allow Gradle to disclose information from sensitive files through an arbitrary file read.

To exploit this behavior, an attacker needs to either control the source of an archive already used by the build or modify the build to interact with a malicious archive. It is unlikely that this would go unnoticed.

Gradle uses Tar archives for its [Build Cache](https://docs.gradle.org/current/userguide/build_cache.html). These archives are safe when created by Gradle. But if an attacker had control of a remote build cache server, they could inject malicious build cache entries that leverage this vulnerability. This attack vector could also be exploited if a man-in-the-middle can be performed between the remote cache and the build.

### Patches

A fix has been released in Gradle 7.6.2 and 8.2 to protect against this vulnerability. Starting from these versions, Gradle will refuse to handle Tar archives which contain path traversal elements in a Tar entry name.

It is recommended that users upgrade to a patched version.

### Workarounds

There is no workaround.

* If your build deals with Tar archives that you do not fully trust, you need to inspect them to confirm they do not attempt to leverage this vulnerability.
* If you use the Gradle remote build cache, make sure only trusted parties have write access to it and that connections to the remote cache are properly secured.

### References

* [CWE-22: Improper Limitation of a Pathname to a Restricted Directory ('Path Traversal')](https://cwe.mitre.org/data/definitions/22.html)
* [Gradle Build Cache](https://docs.gradle.org/current/userguide/build_cache.html)
* [ZipSlip](https://security.snyk.io/research/zip-slip-vulnerability)
3: // See Security documentation for fix patterns
4: // Context: gradle-wrapper.jar line 1
```

**Best Practices to Follow**:

- Review security best practices documentation
- Consult with team lead for high Security issues
- Apply industry-standard solutions for this issue type

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

View complete list: [group-cve-2023-35947-high-dependency-check-locations.json](attachments/group-cve-2023-35947-high-dependency-check-locations.json)

---


### 🟠 CVE 2021 29428

**Severity**: HIGH | **Tool**: dependency-check | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

Known security vulnerability CVE-2021-29428 in dependency. This vulnerability was publicly disclosed in 2021 and has a known exploit.

#### 🎯 Why does it matter?

Attackers actively scan for known CVEs in web applications. Public exploits exist, making this vulnerability easy to exploit at scale.

#### 🔍 Common causes:

- Using outdated dependency versions
- Not regularly updating dependencies
- Lack of automated dependency scanning in CI/CD
- Delayed security patch application

#### ⚠️ Impact if not fixed:

High security risk with publicly available exploits. Could lead to remote code execution, data theft, or system compromise. Compliance frameworks (SOC2, ISO 27001) require timely patching of known vulnerabilities.

#### ⚠️ Risk Assessment

**Overall Risk**: 🔴 **CRITICAL RISK**

Immediate action required - may lead to security breaches, data loss, or system failures

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `gradle/wrapper/gradle-wrapper.jar` (Line 1)

**Code**:

```text
>    1 | PK     A            	   META-INF/ PK     A (M��?   T      META-INF/MANIFEST.MF�M��LK-.�K-*��ϳR0�3����-�I�M�+I,
     2 | �d��Z)�%��b�µ���r�r PK     A               org/ PK     A               org/gradle/ PK     A               org/gradle/wrapper/ PK     A �zZ��  �	  -   org/gradle/wrapper...
     3 | �	�@c5�žv���2$����ڗ����Sz���?B;W�op��s�ٿ�;#����g ^�O2Bx[�a�KX�pA� .�X�%���˒�e\�U���
     4 | ����&Ẅ)�X�pCƻ�H���X�p+�����|y�/w�Pe�#+!�Ǽ�C(H�8��='���
```

#### 🔧 How to Fix

Upgrade Gradle to version 7.0 or later to apply the official patch. If upgrading is not possible, set the sticky bit on the system temporary directory using `chmod +t /tmp` (or the relevant directory). As an alternative, configure the `java.io.tmpdir` system property to a directory with restricted permissions accessible only by the build user.

**Recommended Code**:

```text
Before:
// No specific code change required, but Gradle version < 7.0 is vulnerable.

After:
// Upgrade Gradle to 7.0 or later in gradle-wrapper.properties:
distributionUrl=https\://services.gradle.org/distributions/gradle-7.0-bin.zip

// Or configure the system property in the build script:
-Djava.io.tmpdir=/custom/tmpdir
```

**Best Practices to Follow**:

- Always use the latest stable version of tools and dependencies to benefit from security patches.
- Ensure system directories used for temporary files have appropriate permissions (e.g., sticky bit).
- Regularly scan dependencies for known vulnerabilities using tools like OWASP Dependency-Check.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

View complete list: [group-cve-2021-29428-high-dependency-check-locations.json](attachments/group-cve-2021-29428-high-dependency-check-locations.json)

---


### 🟠 CVE 2020 11979

**Severity**: HIGH | **Tool**: dependency-check | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

Known security vulnerability CVE-2020-11979 in dependency. This vulnerability was publicly disclosed in 2020 and has a known exploit.

#### 🎯 Why does it matter?

Attackers actively scan for known CVEs in web applications. Public exploits exist, making this vulnerability easy to exploit at scale.

#### 🔍 Common causes:

- Using outdated dependency versions
- Not regularly updating dependencies
- Lack of automated dependency scanning in CI/CD
- Delayed security patch application

#### ⚠️ Impact if not fixed:

High security risk with publicly available exploits. Could lead to remote code execution, data theft, or system compromise. Compliance frameworks (SOC2, ISO 27001) require timely patching of known vulnerabilities.

#### ⚠️ Risk Assessment

**Overall Risk**: 🔴 **CRITICAL RISK**

Immediate action required - may lead to security breaches, data loss, or system failures

**Category**: Dependencies  
**Focus**: Managing third-party libraries and known vulnerabilities

#### 📍 Representative Example

**Location**: `gradle/wrapper/gradle-wrapper.jar` (Line 1)

**Code**:

```text
>    1 | PK     A            	   META-INF/ PK     A (M��?   T      META-INF/MANIFEST.MF�M��LK-.�K-*��ϳR0�3����-�I�M�+I,
     2 | �d��Z)�%��b�µ���r�r PK     A               org/ PK     A               org/gradle/ PK     A               org/gradle/wrapper/ PK     A �zZ��  �	  -   org/gradle/wrapper...
     3 | �	�@c5�žv���2$����ڗ����Sz���?B;W�op��s�ٿ�;#����g ^�O2Bx[�a�KX�pA� .�X�%���˒�e\�U���
     4 | ����&Ẅ)�X�pCƻ�H���X�p+�����|y�/w�Pe�#+!�Ǽ�C(H�8��='���
```

#### 🔧 How to Fix

Implement secure coding practice: validate inputs, use prepared statements, apply least privilege

**Recommended Code**:

```text
1: // ⚠️ AI-generated fix not available - Manual review required
2: // Issue: As mitigation for CVE-2020-1945 Apache Ant 1.10.8 changed the permissions of temporary files it created so that only the current user was allowed to access them. Unfortunately the fixcrlf task deleted the temporary file and created a new one without said protection, effectively nullifying the effort. This would still allow an attacker to inject modified source files into the build process.
3: // See Security documentation for fix patterns
4: // Context: gradle-wrapper.jar line 1
```

**Best Practices to Follow**:

- Review security best practices documentation
- Consult with team lead for high Security issues
- Apply industry-standard solutions for this issue type

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

View complete list: [group-cve-2020-11979-high-dependency-check-locations.json](attachments/group-cve-2020-11979-high-dependency-check-locations.json)

---


### 🟠 CVE 2021 32751

**Severity**: HIGH | **Tool**: dependency-check | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

Known security vulnerability CVE-2021-32751 in dependency. This vulnerability was publicly disclosed in 2021 and has a known exploit.

#### 🎯 Why does it matter?

Attackers actively scan for known CVEs in web applications. Public exploits exist, making this vulnerability easy to exploit at scale.

#### 🔍 Common causes:

- Using outdated dependency versions
- Not regularly updating dependencies
- Lack of automated dependency scanning in CI/CD
- Delayed security patch application

#### ⚠️ Impact if not fixed:

High security risk with publicly available exploits. Could lead to remote code execution, data theft, or system compromise. Compliance frameworks (SOC2, ISO 27001) require timely patching of known vulnerabilities.

#### ⚠️ Risk Assessment

**Overall Risk**: 🔴 **CRITICAL RISK**

Immediate action required - may lead to security breaches, data loss, or system failures

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `gradle/wrapper/gradle-wrapper.jar` (Line 1)

**Code**:

```text
>    1 | PK     A            	   META-INF/ PK     A (M��?   T      META-INF/MANIFEST.MF�M��LK-.�K-*��ϳR0�3����-�I�M�+I,
     2 | �d��Z)�%��b�µ���r�r PK     A               org/ PK     A               org/gradle/ PK     A               org/gradle/wrapper/ PK     A �zZ��  �	  -   org/gradle/wrapper...
     3 | �	�@c5�žv���2$����ڗ����Sz���?B;W�op��s�ٿ�;#����g ^�O2Bx[�a�KX�pA� .�X�%���˒�e\�U���
     4 | ����&Ẅ)�X�pCƻ�H���X�p+�����|y�/w�Pe�#+!�Ǽ�C(H�8��='���
```

#### 🔧 How to Fix

Implement secure coding practice: validate inputs, use prepared statements, apply least privilege

**Recommended Code**:

```text
1: // ⚠️ AI-generated fix not available - Manual review required
2: // Issue: Gradle is a build tool with a focus on build automation. In versions prior to 7.2, start scripts generated by the `application` plugin and the `gradlew` script are both vulnerable to arbitrary code execution when an attacker is able to change environment variables for the user running the script. This may impact those who use `gradlew` on Unix-like systems or use the scripts generated by Gradle in thieir application on Unix-like systems. For this vulnerability to be exploitable, an attacker needs to be able to set the value of particular environment variables and have those environment variables be seen by the vulnerable scripts. This issue has been patched in Gradle 7.2 by removing the use of `eval` and requiring the use of the `bash` shell. There are a few workarounds available. For CI/CD systems using the Gradle build tool, one may ensure that untrusted users are unable to change environment variables for the user that executes `gradlew`. If one is unable to upgrade to Gradle 7.2, one may generate a new `gradlew` script with Gradle 7.2 and use it for older versions of Gradle. Fpplications using start scripts generated by Gradle, one may ensure that untrusted users are unable to change environment variables for the user that executes the start script. A vulnerable start script could be manually patched to remove the use of `eval` or the use of environment variables that affect the application's command-line. If the application is simple enough, one may be able to avoid the use of the start scripts by running the application directly with Java command.
3: // See Security documentation for fix patterns
4: // Context: gradle-wrapper.jar line 1
```

**Best Practices to Follow**:

- Review security best practices documentation
- Consult with team lead for high Security issues
- Apply industry-standard solutions for this issue type

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

View complete list: [group-cve-2021-32751-high-dependency-check-locations.json](attachments/group-cve-2021-32751-high-dependency-check-locations.json)

---


### 🟠 CVE 2022 45868

**Severity**: HIGH | **Tool**: dependency-check | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

Known security vulnerability CVE-2022-45868 in dependency. This vulnerability was publicly disclosed in 2022 and has a known exploit.

#### 🎯 Why does it matter?

Attackers actively scan for known CVEs in web applications. Public exploits exist, making this vulnerability easy to exploit at scale.

#### 🔍 Common causes:

- Using outdated dependency versions
- Not regularly updating dependencies
- Lack of automated dependency scanning in CI/CD
- Delayed security patch application

#### ⚠️ Impact if not fixed:

High security risk with publicly available exploits. Could lead to remote code execution, data theft, or system compromise. Compliance frameworks (SOC2, ISO 27001) require timely patching of known vulnerabilities.

#### ⚠️ Risk Assessment

**Overall Risk**: 🔴 **CRITICAL RISK**

Immediate action required - may lead to security breaches, data loss, or system failures

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `jdbc/src/test/resources/h2.jar` (Line 1)

**Code**:

```text
>    1 | PK  px�J              META-INF/MANIFEST.MF��  ���n�0��z
     2 | !���K�u���nHڠis�Ic�E*$%�o_R�%o�{���������6�#)ͤ��Mhx_��SB �m�/f8u�/-���ɿ}&���y��Ƥ�z}4���~�H&ez��3h�k{W�q�-~rMo��"4W���6��y���0��w�J�*�N�;d"�rԺ�Kշ}���k�J�%'�.bN��Ȱ�T,3��ux�XNj��w...
     3 | c��:�0�h@�3�b�/>�L_�S�.O���6�jgЀ���˕@1��x�XF���x%&b/󜑚ܣ�6/�	U4�:v���2�~�T�nX�Y��yT��h�L�RMhZ��j0y�´&��}VujM8w�_ v����qnhla]1N7�`Ɉ�\�<����}=e��H��՜��!�2٪[�g�ڝv�{gõ1��Q+��-�ƻ��{�ils��쒱%...
     4 |   PK  px�J            !   META-INF/services/java.sql.Driver�/J��0�s)�,K- PKk$�      PK  px�J               org/h2/api/Aggregate.classe��J�0��3��Mݦ(����JdBa0���bw�!�m&�j^� >�x*R...
```

#### 🔧 How to Fix

Implement secure coding practice: validate inputs, use prepared statements, apply least privilege

**Recommended Code**:

```text
1: // ⚠️ AI-generated fix not available - Manual review required
2: // Issue: The web-based admin console in H2 Database Engine before 2.2.220 can be started via the CLI with the argument -webAdminPassword, which allows the user to specify the password in cleartext for the web admin console. Consequently, a local user (or an attacker that has obtained local access through some means) would be able to discover the password by listing processes and their arguments. NOTE: the vendor states "This is not a vulnerability of H2 Console ... Passwords should never be passed on the command line and every qualified DBA or system administrator is expected to know that." Nonetheless, the issue was fixed in 2.2.220.
3: // See Security documentation for fix patterns
4: // Context: h2.jar line 1
```

**Best Practices to Follow**:

- Review security best practices documentation
- Consult with team lead for high Security issues
- Apply industry-standard solutions for this issue type

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

View complete list: [group-cve-2022-45868-high-dependency-check-locations.json](attachments/group-cve-2022-45868-high-dependency-check-locations.json)

---



## 🟡 Medium Priority Issues

### 🟡 Nested If Statements That Can Be Combined

**Severity**: MEDIUM | **Tool**: pmd | **Found in**: 49 files | **Category**: NEW

---

#### 📋 What is this issue?

This issue was detected by pmd as a medium severity problem. Rule: CollapsibleIfStatements

#### 🎯 Why does it matter?

This pattern can lead to technical debt, maintenance issues, or code quality degradation.

#### 🔍 Common causes:

- Code patterns that violate pmd best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

May reduce code quality, increase maintenance costs, and accumulate technical debt over time.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `aop/src/test/groovy/io/micronaut/aop/TraceInterceptor.java` (Line 42)

**Code**:

```java
    39 |     @Override
    40 |     public Object intercept(InvocationContext context) {
    41 |         if (LOG.isTraceEnabled()) {
>   42 |             if (context instanceof MethodExecutionHandle) {
    43 |                 MethodExecutionHandle handle = (MethodExecutionHandle) context;
    44 | 
    45 |                 Collection<MutableArgumentValue<?>> values = context.getParameters().values();
```

#### 🔧 How to Fix

Refactor nested if statements into a single condition using logical operators for clarity and conciseness.

**Recommended Code**:

```java
Before:
if (condition1) {
    if (condition2) {
        // do something
    }
}

After:
if (condition1 && condition2) {
    // do something
}
```

**Best Practices to Follow**:

- Avoid deep nesting for better readability
- Use logical operators to combine conditions
- Keep code flat and simple for maintainability

#### 📎 All Occurrences

This issue appears in **49 files** across your codebase.

View complete list: [group-collapsibleifstatements-medium-pmd-locations.json](attachments/group-collapsibleifstatements-medium-pmd-locations.json)

---


### 🟡 Break/Continue as Last Statement in Loop

**Severity**: MEDIUM | **Tool**: pmd | **Found in**: 3 files | **Category**: NEW

---

#### 📋 What is this issue?

This issue was detected by pmd as a medium severity problem. Rule: AvoidBranchingStatementAsLastInLoop

#### 🎯 Why does it matter?

This pattern can lead to technical debt, maintenance issues, or code quality degradation.

#### 🔍 Common causes:

- Code patterns that violate pmd best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

May reduce code quality, increase maintenance costs, and accumulate technical debt over time.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `cli/src/main/groovy/io/micronaut/cli/io/support/AntPathMatcher.java` (Line 211)

**Code**:

```java
   208 |                     }
   209 |                 }
   210 |                 foundIdx = pathIdxStart + i;
>  211 |                 break;
   212 |             }
   213 | 
   214 |             if (foundIdx == -1) {
```

#### 🔧 How to Fix

Refactor the loop to ensure that the branching statement is not the last statement, by reordering the logic or adding a clear exit condition or action after the branching statement.

**Recommended Code**:

```java
Before:
for (int i = 0; i < items.length; i++) {
    if (items[i] == target) {
        break;
    }
}

After:
for (int i = 0; i < items.length; i++) {
    if (items[i] == target) {
        foundIndex = i;
        break;
    }
}
```

**Best Practices to Follow**:

- Avoid placing branching statements like break or continue as the last statement in a loop to maintain clarity and avoid confusion.
- Ensure that the loop has a clear purpose and exit condition that is easy to understand at a glance.
- Use meaningful variable names and add comments if necessary to explain the logic of the loop.

#### 📎 All Occurrences

This issue appears in **3 files** across your codebase.

View complete list: [group-avoidbranchingstatementaslastinloop-medium-pmd-locations.json](attachments/group-avoidbranchingstatementaslastinloop-medium-pmd-locations.json)

---


### 🟡 SimplifiedTernary

**Severity**: MEDIUM | **Tool**: pmd | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

This issue was detected by pmd as a medium severity problem. Rule: SimplifiedTernary

#### 🎯 Why does it matter?

This pattern can lead to technical debt, maintenance issues, or code quality degradation.

#### 🔍 Common causes:

- Code patterns that violate pmd best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

May reduce code quality, increase maintenance costs, and accumulate technical debt over time.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `cli/src/main/groovy/io/micronaut/cli/console/logging/MicronautConsole.java` (Line 302)

**Code**:

```java
   299 | 
   300 |     private boolean readPropOrTrue(String prop) {
   301 |         String property = System.getProperty(prop);
>  302 |         return property == null ? true : Boolean.valueOf(property);
   303 |     }
   304 | 
   305 |     /**
```

#### 🔧 How to Fix

Replace ternary operator with logical operator for clarity and conciseness.

**Recommended Code**:

```java
Before: result = condition ? valueIfTrue : valueIfFalse;
After: result = condition && valueIfTrue; // or condition || valueIfTrue based on logic
```

**Best Practices to Follow**:

- Use logical operators when ternary is used for boolean simplification
- Prioritize readability over brevity
- Ensure the logic remains clear and maintainable

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

View complete list: [group-simplifiedternary-medium-pmd-locations.json](attachments/group-simplifiedternary-medium-pmd-locations.json)

---


### 🟡 AvoidUsingHardCodedIP

**Severity**: MEDIUM | **Tool**: pmd | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

This issue was detected by pmd as a medium severity problem. Rule: AvoidUsingHardCodedIP

#### 🎯 Why does it matter?

This pattern can lead to technical debt, maintenance issues, or code quality degradation.

#### 🔍 Common causes:

- Code patterns that violate pmd best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

May reduce code quality, increase maintenance costs, and accumulate technical debt over time.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `security/src/main/java/io/micronaut/security/config/SecurityConfigurationProperties.java` (Line 35)

**Code**:

```java
    32 | public class SecurityConfigurationProperties implements SecurityConfiguration {
    33 | 
    34 |     public static final String PREFIX = "micronaut.security";
>   35 |     public static final String ANYWHERE = "0.0.0.0";
    36 | 
    37 |     protected boolean enabled = false;
    38 |     protected List<InterceptUrlMapPattern> interceptUrlMap = new ArrayList<>();
```

#### 🔧 How to Fix

Improve code quality: follow naming conventions, add documentation, reduce complexity

**Recommended Code**:

```java
35: // ⚠️ AI-generated fix not available - Manual review required
36: // Issue: Do not hard code the IP address 
37: // See Code Quality documentation for fix patterns
38: // Context: SecurityConfigurationProperties.java line 35
```

**Best Practices to Follow**:

- Review codequality best practices documentation
- Consult with team lead for medium Code Quality issues
- Apply industry-standard solutions for this issue type

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

View complete list: [group-avoidusinghardcodedip-medium-pmd-locations.json](attachments/group-avoidusinghardcodedip-medium-pmd-locations.json)

---


### 🟡 CVE 2023 44387

**Severity**: MEDIUM | **Tool**: dependency-check | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

Known security vulnerability CVE-2023-44387 in dependency. This vulnerability was publicly disclosed in 2023 and has a known exploit.

#### 🎯 Why does it matter?

Attackers actively scan for known CVEs in web applications. Public exploits exist, making this vulnerability easy to exploit at scale.

#### 🔍 Common causes:

- Using outdated dependency versions
- Not regularly updating dependencies
- Lack of automated dependency scanning in CI/CD
- Delayed security patch application

#### ⚠️ Impact if not fixed:

High security risk with publicly available exploits. Could lead to remote code execution, data theft, or system compromise. Compliance frameworks (SOC2, ISO 27001) require timely patching of known vulnerabilities.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `gradle/wrapper/gradle-wrapper.jar` (Line 1)

**Code**:

```text
>    1 | PK     A            	   META-INF/ PK     A (M��?   T      META-INF/MANIFEST.MF�M��LK-.�K-*��ϳR0�3����-�I�M�+I,
     2 | �d��Z)�%��b�µ���r�r PK     A               org/ PK     A               org/gradle/ PK     A               org/gradle/wrapper/ PK     A �zZ��  �	  -   org/gradle/wrapper...
     3 | �	�@c5�žv���2$����ڗ����Sz���?B;W�op��s�ٿ�;#����g ^�O2Bx[�a�KX�pA� .�X�%���˒�e\�U���
     4 | ����&Ẅ)�X�pCƻ�H���X�p+�����|y�/w�Pe�#+!�Ǽ�C(H�8��='���
```

#### 🔧 How to Fix

Upgrade Gradle to version 7.6.3 or 8.4 and above to ensure that symlinked files' permissions are correctly applied during copy or archive operations. This follows OWASP guidelines for secure build automation and artifact handling (OWASP ASVS 4.2.2).

**Recommended Code**:

```text
Before: Using Gradle versions < 7.6.3 or < 8.4.
After: Update Gradle wrapper to version 7.6.3 or 8.4 and above in gradle-wrapper.properties:

distributionUrl=https\://services.gradle.org/distributions/gradle-8.4-bin.zip
```

**Best Practices to Follow**:

- Always use the latest stable versions of build tools to benefit from security patches.
- Validate and sanitize all file permissions and metadata during build and deployment processes.
- Regularly audit build artifacts and ensure they are not exposing unintended permissions or configurations.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

View complete list: [group-cve-2023-44387-medium-dependency-check-locations.json](attachments/group-cve-2023-44387-medium-dependency-check-locations.json)

---


### 🟡 CVE 2019 11065

**Severity**: MEDIUM | **Tool**: dependency-check | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

Known security vulnerability CVE-2019-11065 in dependency. This vulnerability was publicly disclosed in 2019 and has a known exploit.

#### 🎯 Why does it matter?

Attackers actively scan for known CVEs in web applications. Public exploits exist, making this vulnerability easy to exploit at scale.

#### 🔍 Common causes:

- Using outdated dependency versions
- Not regularly updating dependencies
- Lack of automated dependency scanning in CI/CD
- Delayed security patch application

#### ⚠️ Impact if not fixed:

High security risk with publicly available exploits. Could lead to remote code execution, data theft, or system compromise. Compliance frameworks (SOC2, ISO 27001) require timely patching of known vulnerabilities.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Dependencies  
**Focus**: Managing third-party libraries and known vulnerabilities

#### 📍 Representative Example

**Location**: `gradle/wrapper/gradle-wrapper.jar` (Line 1)

**Code**:

```text
>    1 | PK     A            	   META-INF/ PK     A (M��?   T      META-INF/MANIFEST.MF�M��LK-.�K-*��ϳR0�3����-�I�M�+I,
     2 | �d��Z)�%��b�µ���r�r PK     A               org/ PK     A               org/gradle/ PK     A               org/gradle/wrapper/ PK     A �zZ��  �	  -   org/gradle/wrapper...
     3 | �	�@c5�žv���2$����ڗ����Sz���?B;W�op��s�ٿ�;#����g ^�O2Bx[�a�KX�pA� .�X�%���˒�e\�U���
     4 | ����&Ẅ)�X�pCƻ�H���X�p+�����|y�/w�Pe�#+!�Ǽ�C(H�8��='���
```

#### 🔧 How to Fix

Implement secure coding practice: validate inputs, use prepared statements, apply least privilege

**Recommended Code**:

```text
1: // ⚠️ AI-generated fix not available - Manual review required
2: // Issue: Gradle versions from 1.4 to 5.3.1 use an insecure HTTP URL to download dependencies when the built-in JavaScript or CoffeeScript Gradle plugins are used. Dependency artifacts could have been maliciously compromised by a MITM attack against the ajax.googleapis.com web site.
3: // See Security documentation for fix patterns
4: // Context: gradle-wrapper.jar line 1
```

**Best Practices to Follow**:

- Review security best practices documentation
- Consult with team lead for medium Security issues
- Apply industry-standard solutions for this issue type

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

View complete list: [group-cve-2019-11065-medium-dependency-check-locations.json](attachments/group-cve-2019-11065-medium-dependency-check-locations.json)

---


### 🟡 CVE 2019 16370

**Severity**: MEDIUM | **Tool**: dependency-check | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

Known security vulnerability CVE-2019-16370 in dependency. This vulnerability was publicly disclosed in 2019 and has a known exploit.

#### 🎯 Why does it matter?

Attackers actively scan for known CVEs in web applications. Public exploits exist, making this vulnerability easy to exploit at scale.

#### 🔍 Common causes:

- Using outdated dependency versions
- Not regularly updating dependencies
- Lack of automated dependency scanning in CI/CD
- Delayed security patch application

#### ⚠️ Impact if not fixed:

High security risk with publicly available exploits. Could lead to remote code execution, data theft, or system compromise. Compliance frameworks (SOC2, ISO 27001) require timely patching of known vulnerabilities.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Dependencies  
**Focus**: Managing third-party libraries and known vulnerabilities

#### 📍 Representative Example

**Location**: `gradle/wrapper/gradle-wrapper.jar` (Line 1)

**Code**:

```text
>    1 | PK     A            	   META-INF/ PK     A (M��?   T      META-INF/MANIFEST.MF�M��LK-.�K-*��ϳR0�3����-�I�M�+I,
     2 | �d��Z)�%��b�µ���r�r PK     A               org/ PK     A               org/gradle/ PK     A               org/gradle/wrapper/ PK     A �zZ��  �	  -   org/gradle/wrapper...
     3 | �	�@c5�žv���2$����ڗ����Sz���?B;W�op��s�ٿ�;#����g ^�O2Bx[�a�KX�pA� .�X�%���˒�e\�U���
     4 | ����&Ẅ)�X�pCƻ�H���X�p+�����|y�/w�Pe�#+!�Ǽ�C(H�8��='���
```

#### 🔧 How to Fix

Implement secure coding practice: validate inputs, use prepared statements, apply least privilege

**Recommended Code**:

```text
1: // ⚠️ AI-generated fix not available - Manual review required
2: // Issue: The PGP signing plugin in Gradle before 6.0 relies on the SHA-1 algorithm, which might allow an attacker to replace an artifact with a different one that has the same SHA-1 message digest, a related issue to CVE-2005-4900.
3: // See Security documentation for fix patterns
4: // Context: gradle-wrapper.jar line 1
```

**Best Practices to Follow**:

- Review security best practices documentation
- Consult with team lead for medium Security issues
- Apply industry-standard solutions for this issue type

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

View complete list: [group-cve-2019-16370-medium-dependency-check-locations.json](attachments/group-cve-2019-16370-medium-dependency-check-locations.json)

---


### 🟡 CVE 2021 29429

**Severity**: MEDIUM | **Tool**: dependency-check | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

Known security vulnerability CVE-2021-29429 in dependency. This vulnerability was publicly disclosed in 2021 and has a known exploit.

#### 🎯 Why does it matter?

Attackers actively scan for known CVEs in web applications. Public exploits exist, making this vulnerability easy to exploit at scale.

#### 🔍 Common causes:

- Using outdated dependency versions
- Not regularly updating dependencies
- Lack of automated dependency scanning in CI/CD
- Delayed security patch application

#### ⚠️ Impact if not fixed:

High security risk with publicly available exploits. Could lead to remote code execution, data theft, or system compromise. Compliance frameworks (SOC2, ISO 27001) require timely patching of known vulnerabilities.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Dependencies  
**Focus**: Managing third-party libraries and known vulnerabilities

#### 📍 Representative Example

**Location**: `gradle/wrapper/gradle-wrapper.jar` (Line 1)

**Code**:

```text
>    1 | PK     A            	   META-INF/ PK     A (M��?   T      META-INF/MANIFEST.MF�M��LK-.�K-*��ϳR0�3����-�I�M�+I,
     2 | �d��Z)�%��b�µ���r�r PK     A               org/ PK     A               org/gradle/ PK     A               org/gradle/wrapper/ PK     A �zZ��  �	  -   org/gradle/wrapper...
     3 | �	�@c5�žv���2$����ڗ����Sz���?B;W�op��s�ٿ�;#����g ^�O2Bx[�a�KX�pA� .�X�%���˒�e\�U���
     4 | ����&Ẅ)�X�pCƻ�H���X�p+�����|y�/w�Pe�#+!�Ǽ�C(H�8��='���
```

#### 🔧 How to Fix

Implement secure coding practice: validate inputs, use prepared statements, apply least privilege

**Recommended Code**:

```text
1: // ⚠️ AI-generated fix not available - Manual review required
2: // Issue: In Gradle before version 7.0, files created with open permissions in the system temporary directory can allow an attacker to access information downloaded by Gradle. Some builds could be vulnerable to a local information disclosure. Remote files accessed through TextResourceFactory are downloaded into the system temporary directory first. Sensitive information contained in these files can be exposed to other local users on the same system. If you do not use the `TextResourceFactory` API, you are not vulnerable. As of Gradle 7.0, uses of the system temporary directory have been moved to the Gradle User Home directory. By default, this directory is restricted to the user running the build. As a workaround, set a more restrictive umask that removes read access to other users. When files are created in the system temporary directory, they will not be accessible to other users. If you are unable to change your system's umask, you can move the Java temporary directory by setting the System Property `java.io.tmpdir`. The new path needs to limit permissions to the build user only.
3: // See Security documentation for fix patterns
4: // Context: gradle-wrapper.jar line 1
```

**Best Practices to Follow**:

- Review security best practices documentation
- Consult with team lead for medium Security issues
- Apply industry-standard solutions for this issue type

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

View complete list: [group-cve-2021-29429-medium-dependency-check-locations.json](attachments/group-cve-2021-29429-medium-dependency-check-locations.json)

---


### 🟡 CVE 2023 35946

**Severity**: MEDIUM | **Tool**: dependency-check | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

Known security vulnerability CVE-2023-35946 in dependency. This vulnerability was publicly disclosed in 2023 and has a known exploit.

#### 🎯 Why does it matter?

Attackers actively scan for known CVEs in web applications. Public exploits exist, making this vulnerability easy to exploit at scale.

#### 🔍 Common causes:

- Using outdated dependency versions
- Not regularly updating dependencies
- Lack of automated dependency scanning in CI/CD
- Delayed security patch application

#### ⚠️ Impact if not fixed:

High security risk with publicly available exploits. Could lead to remote code execution, data theft, or system compromise. Compliance frameworks (SOC2, ISO 27001) require timely patching of known vulnerabilities.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `gradle/wrapper/gradle-wrapper.jar` (Line 1)

**Code**:

```text
>    1 | PK     A            	   META-INF/ PK     A (M��?   T      META-INF/MANIFEST.MF�M��LK-.�K-*��ϳR0�3����-�I�M�+I,
     2 | �d��Z)�%��b�µ���r�r PK     A               org/ PK     A               org/gradle/ PK     A               org/gradle/wrapper/ PK     A �zZ��  �	  -   org/gradle/wrapper...
     3 | �	�@c5�žv���2$����ڗ����Sz���?B;W�op��s�ٿ�;#����g ^�O2Bx[�a�KX�pA� .�X�%���˒�e\�U���
     4 | ����&Ẅ)�X�pCƻ�H���X�p+�����|y�/w�Pe�#+!�Ǽ�C(H�8��='���
```

#### 🔧 How to Fix

Implement secure coding practice: validate inputs, use prepared statements, apply least privilege

**Recommended Code**:

```text
1: // ⚠️ AI-generated fix not available - Manual review required
2: // Issue: Gradle is a build tool with a focus on build automation and support for multi-language development. When Gradle writes a dependency into its dependency cache, it uses the dependency's coordinates to compute a file location. With specially crafted dependency coordinates, Gradle can be made to write files into an unintended location. The file may be written outside the dependency cache or over another file in the dependency cache. This vulnerability could be used to poison the dependency cache or overwrite important files elsewhere on the filesystem where the Gradle process has write permissions. Exploiting this vulnerability requires an attacker to have control over a dependency repository used by the Gradle build or have the ability to modify the build's configuration. It is unlikely that this would go unnoticed. A fix has been released in Gradle 7.6.2 and 8.2 to protect against this vulnerability. Gradle will refuse to cache dependencies that have path traversal elements in their dependency coordinates. It is recommended that users upgrade to a patched version. If you are unable to upgrade to Gradle 7.6.2 or 8.2, `dependency verification` will make this vulnerability more difficult to exploit.
3: // See Security documentation for fix patterns
4: // Context: gradle-wrapper.jar line 1
```

**Best Practices to Follow**:

- Review security best practices documentation
- Consult with team lead for medium Security issues
- Apply industry-standard solutions for this issue type

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

View complete list: [group-cve-2023-35946-medium-dependency-check-locations.json](attachments/group-cve-2023-35946-medium-dependency-check-locations.json)

---


### 🟡 CVE 2023 42445

**Severity**: MEDIUM | **Tool**: dependency-check | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

Known security vulnerability CVE-2023-42445 in dependency. This vulnerability was publicly disclosed in 2023 and has a known exploit.

#### 🎯 Why does it matter?

Attackers actively scan for known CVEs in web applications. Public exploits exist, making this vulnerability easy to exploit at scale.

#### 🔍 Common causes:

- Using outdated dependency versions
- Not regularly updating dependencies
- Lack of automated dependency scanning in CI/CD
- Delayed security patch application

#### ⚠️ Impact if not fixed:

High security risk with publicly available exploits. Could lead to remote code execution, data theft, or system compromise. Compliance frameworks (SOC2, ISO 27001) require timely patching of known vulnerabilities.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `gradle/wrapper/gradle-wrapper.jar` (Line 1)

**Code**:

```text
>    1 | PK     A            	   META-INF/ PK     A (M��?   T      META-INF/MANIFEST.MF�M��LK-.�K-*��ϳR0�3����-�I�M�+I,
     2 | �d��Z)�%��b�µ���r�r PK     A               org/ PK     A               org/gradle/ PK     A               org/gradle/wrapper/ PK     A �zZ��  �	  -   org/gradle/wrapper...
     3 | �	�@c5�žv���2$����ڗ����Sz���?B;W�op��s�ٿ�;#����g ^�O2Bx[�a�KX�pA� .�X�%���˒�e\�U���
     4 | ����&Ẅ)�X�pCƻ�H���X�p+�����|y�/w�Pe�#+!�Ǽ�C(H�8��='���
```

#### 🔧 How to Fix

Update Gradle to version 7.6.3 or 8.4 to ensure XML external entities are disabled by default. If manually parsing XML, configure the XML parser to disable external entity resolution. For example, in Java, use secure XML parsing settings as outlined by OWASP (https://owasp.org/www-community/attacks/XXE_Injectio).

**Recommended Code**:

```text
Before:
XML parsing without secure configuration.

After:
DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
factory.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
factory.setXIncludeAware(false);
factory.setExpandEntityReferences(false);
DocumentBuilder builder = factory.newDocumentBuilder();
```

**Best Practices to Follow**:

- Always validate and sanitize XML input to prevent XXE attacks.
- Use secure XML parsing libraries and disable external entity resolution by default.
- Keep Gradle and all dependencies updated to the latest secure versions.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

View complete list: [group-cve-2023-42445-medium-dependency-check-locations.json](attachments/group-cve-2023-42445-medium-dependency-check-locations.json)

---



## 🟢 Low Priority Issues

### 🟢 Com Puppycrawl Tools Checkstyle Checks Sizes LineLengthCheck

**Severity**: LOW | **Tool**: checkstyle | **Found in**: 10035 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-sizes-linelengthcheck-low-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a low severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.sizes.LineLengthCheck

#### 🎯 Why does it matter?

This pattern can lead to technical debt, maintenance issues, or code quality degradation.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

May reduce code quality, increase maintenance costs, and accumulate technical debt over time.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `validation/src/main/java/io/micronaut/validation/ValidatingInterceptor.java` (Line 44)

**Code**:

```java
    41 | public class ValidatingInterceptor implements MethodInterceptor {
    42 | 
    43 |     /**
>   44 |      * The position of the interceptor. See {@link io.micronaut.core.order.Ordered}
    45 |      */
    46 |     public static final int POSITION = InterceptPhase.VALIDATE.getPosition();
    47 | 
```

#### 🔧 How to Fix

Refactor the line by breaking it into multiple lines for improved readability and to adhere to the 80-character limit.

**Recommended Code**:

```java
Before:
if (someLongConditionThatExceedsTheCharacterLimit && anotherLongConditionThatAlsoExceedsTheLimit) {
    // do something
}

After:
if (someLongConditionThatExceedsTheCharacterLimit 
    && anotherLongConditionThatAlsoExceedsTheLimit) {
    // do something
}
```

**Best Practices to Follow**:

- Keep lines within the 80-character limit for better readability.
- Break complex conditions into multiple lines for clarity.
- Use consistent indentation and formatting to maintain code structure.

#### 📎 All Occurrences

This issue appears in **10035 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-sizes-linelengthcheck-low-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-sizes-linelengthcheck-low-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 10035 occurrences with one click!

---


### 🟢 Com Puppycrawl Tools Checkstyle Checks Javadoc MissingJavadocMethodCheck

**Severity**: LOW | **Tool**: checkstyle | **Found in**: 663 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-javadoc-missingjavadocmethodcheck-low-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a low severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.javadoc.MissingJavadocMethodCheck

#### 🎯 Why does it matter?

This pattern can lead to technical debt, maintenance issues, or code quality degradation.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

May reduce code quality, increase maintenance costs, and accumulate technical debt over time.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `validation/src/test/groovy/io/micronaut/validation/Foo.java` (Line 29)

**Code**:

```java
    26 | @Singleton
    27 | @Validated
    28 | public class Foo {
>   29 |     public String testMe(@Digits(integer = 3, fraction = 2) String number) {
    30 |         return '$' + number;
    31 |     }
    32 | }
```

#### 🔧 How to Fix

Add a Javadoc comment above the method to describe its purpose, parameters, and return value.

**Recommended Code**:

```java
Before:
public boolean isValid(String input) {
    return input != null && !input.isEmpty();
}

After:
/**
 * Validates if the input string is not null or empty.
 *
 * @param input the string to validate
 * @return true if the input is valid, false otherwise
 */
public boolean isValid(String input) {
    return input != null && !input.isEmpty();
}
```

**Best Practices to Follow**:

- Provide clear and concise Javadoc comments
- Document method purpose, parameters, and return values
- Enhance code readability and maintainability

#### 📎 All Occurrences

This issue appears in **663 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-javadoc-missingjavadocmethodcheck-low-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-javadoc-missingjavadocmethodcheck-low-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 663 occurrences with one click!

---


### 🟢 Com Puppycrawl Tools Checkstyle Checks Imports RedundantImportCheck

**Severity**: LOW | **Tool**: checkstyle | **Found in**: 124 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-imports-redundantimportcheck-low-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a low severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.imports.RedundantImportCheck

#### 🎯 Why does it matter?

This pattern can lead to technical debt, maintenance issues, or code quality degradation.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

May reduce code quality, increase maintenance costs, and accumulate technical debt over time.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `validation/src/test/groovy/io/micronaut/validation/ValidatedController.java` (Line 20)

**Code**:

```java
    17 | 
    18 | import io.micronaut.http.annotation.Controller;
    19 | import io.micronaut.http.annotation.Post;
>   20 | import io.micronaut.http.annotation.Controller;
    21 | import io.micronaut.http.annotation.Post;
    22 | import javax.validation.constraints.Digits;
    23 | 
```

#### 🔧 How to Fix

Remove the duplicate import statement for 'io.micronaut.http.annotation.Controller' from line 20, keeping only one import statement for the class.

**Recommended Code**:

```java
Before:
import io.micronaut.http.annotation.Controller;
...
import io.micronaut.http.annotation.Controller;

After:
import io.micronaut.http.annotation.Controller;
...
```

**Best Practices to Follow**:

- Avoid duplicate imports to maintain clean and efficient code.
- Use an IDE or linter to automatically detect and remove redundant imports.
- Ensure imports are organized and only include necessary classes.

#### 📎 All Occurrences

This issue appears in **124 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-imports-redundantimportcheck-low-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-imports-redundantimportcheck-low-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 124 occurrences with one click!

---


### 🟢 Com Puppycrawl Tools Checkstyle Checks Whitespace WhitespaceAroundCheck

**Severity**: LOW | **Tool**: checkstyle | **Found in**: 118 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-whitespace-whitespacearoundcheck-low-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a low severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.whitespace.WhitespaceAroundCheck

#### 🎯 Why does it matter?

This pattern can lead to technical debt, maintenance issues, or code quality degradation.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

May reduce code quality, increase maintenance costs, and accumulate technical debt over time.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `function/src/test/groovy/io/micronaut/function/executor/FunctionInitializerSpec.java` (Line 54)

**Code**:

```java
    51 | 
    52 |         public static void main(String...args) throws IOException {
    53 |             MathFunction mathFunction = new MathFunction();
>   54 |             mathFunction.run(args, (context)-> mathFunction.round(context.get(float.class)));
    55 |         }
    56 |     }
    57 | }
```

#### 🔧 How to Fix

Add a space before the arrow token to follow code formatting conventions.

**Recommended Code**:

```java
Before: (input) -> System.out.println(input)
After: (input) -> System.out.println(input)
```

**Best Practices to Follow**:

- Follow consistent spacing around arrow tokens for readability
- Use code formatting tools to automate style compliance
- Adhere to language-specific style guides for clarity

#### 📎 All Occurrences

This issue appears in **118 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-whitespace-whitespacearoundcheck-low-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-whitespace-whitespacearoundcheck-low-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 118 occurrences with one click!

---


### 🟢 Com Puppycrawl Tools Checkstyle Checks Naming MethodNameCheck

**Severity**: LOW | **Tool**: checkstyle | **Found in**: 86 files | **Category**: EXISTING_REST | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-naming-methodnamecheck-low-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a low severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.naming.MethodNameCheck

#### 🎯 Why does it matter?

This pattern can lead to technical debt, maintenance issues, or code quality degradation.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

May reduce code quality, increase maintenance costs, and accumulate technical debt over time.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `http/src/main/java/io/micronaut/http/HttpRequest.java` (Line 124)

**Code**:

```java
   121 |      * @return The {@link MutableHttpRequest} instance
   122 |      * @see HttpRequestFactory
   123 |      */
>  124 |     static <T> MutableHttpRequest<T> GET(URI uri) {
   125 |         return GET(uri.toString());
   126 |     }
   127 | 
```

#### 🔧 How to Fix

Improve code quality: follow naming conventions, add documentation, reduce complexity

**Recommended Code**:

```java
124: // ⚠️ AI-generated fix not available - Manual review required
125: // Issue: Name &apos;GET&apos; must match pattern &apos;^[a-z][a-zA-Z0-9]*$&apos;.
126: // See Code Quality documentation for fix patterns
127: // Context: HttpRequest.java line 124
```

**Best Practices to Follow**:

- Review codequality best practices documentation
- Consult with team lead for low Code Quality issues
- Apply industry-standard solutions for this issue type

#### 📎 All Occurrences

This issue appears in **86 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-naming-methodnamecheck-low-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-naming-methodnamecheck-low-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 86 occurrences with one click!

---


### 🟢 Com Puppycrawl Tools Checkstyle Checks Imports AvoidStarImportCheck

**Severity**: LOW | **Tool**: checkstyle | **Found in**: 82 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-imports-avoidstarimportcheck-low-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a low severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.imports.AvoidStarImportCheck

#### 🎯 Why does it matter?

This pattern can lead to technical debt, maintenance issues, or code quality degradation.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

May reduce code quality, increase maintenance costs, and accumulate technical debt over time.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `http-client/src/test/groovy/io/micronaut/http/client/HttpGetTest.java` (Line 23)

**Code**:

```java
    20 | import io.micronaut.http.HttpResponse;
    21 | import io.micronaut.http.HttpStatus;
    22 | import io.reactivex.Flowable;
>   23 | import static org.junit.Assert.*;
    24 | 
    25 | import org.junit.Assert;
    26 | import org.junit.Test;
```

#### 🔧 How to Fix

Replace the wildcard import with explicit imports for each class used from org.junit.Assert to improve code clarity and avoid potential conflicts.

**Recommended Code**:

```java
Before:
import org.junit.Assert.*;

After:
import org.junit.Assert.assertEquals;
import org.junit.Assert.assertTrue;
```

**Best Practices to Follow**:

- Use explicit imports instead of wildcard imports to avoid ambiguity and improve code readability.
- Wildcard imports can lead to naming conflicts and make it unclear which classes are being used.
- Explicit imports make it easier to identify dependencies and maintain the code.

#### 📎 All Occurrences

This issue appears in **82 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-imports-avoidstarimportcheck-low-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-imports-avoidstarimportcheck-low-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 82 occurrences with one click!

---


### 🟢 Com Puppycrawl Tools Checkstyle Checks Whitespace WhitespaceAfterCheck

**Severity**: LOW | **Tool**: checkstyle | **Found in**: 43 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-whitespace-whitespaceaftercheck-low-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a low severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.whitespace.WhitespaceAfterCheck

#### 🎯 Why does it matter?

This pattern can lead to technical debt, maintenance issues, or code quality degradation.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

May reduce code quality, increase maintenance costs, and accumulate technical debt over time.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `function/src/test/groovy/io/micronaut/function/executor/FunctionInitializerSpec.java` (Line 52)

**Code**:

```java
    49 |             return mathService.round(input);
    50 |         }
    51 | 
>   52 |         public static void main(String...args) throws IOException {
    53 |             MathFunction mathFunction = new MathFunction();
    54 |             mathFunction.run(args, (context)-> mathFunction.round(context.get(float.class)));
    55 |         }
```

#### 🔧 How to Fix

Ensure that the string concatenation or message includes a space after the ellipsis for proper formatting and readability.

**Best Practices to Follow**:

- Use consistent spacing around punctuation for readability.
- Avoid string concatenation in logging; prefer parameterized logging where applicable.
- Ensure messages are user-friendly and clearly formatted.

#### 📎 All Occurrences

This issue appears in **43 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-whitespace-whitespaceaftercheck-low-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-whitespace-whitespaceaftercheck-low-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 43 occurrences with one click!

---


### 🟢 Com Puppycrawl Tools Checkstyle Checks Imports UnusedImportsCheck

**Severity**: LOW | **Tool**: checkstyle | **Found in**: 40 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-imports-unusedimportscheck-low-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a low severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.imports.UnusedImportsCheck

#### 🎯 Why does it matter?

This pattern can lead to technical debt, maintenance issues, or code quality degradation.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

May reduce code quality, increase maintenance costs, and accumulate technical debt over time.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `http-client/src/test/groovy/io/micronaut/http/client/HttpGetTest.java` (Line 29)

**Code**:

```java
    26 | import org.junit.Test;
    27 | import io.micronaut.context.ApplicationContext;
    28 | import io.micronaut.core.type.Argument;
>   29 | import io.micronaut.core.util.CollectionUtils;
    30 | import io.micronaut.http.HttpRequest;
    31 | import io.micronaut.http.HttpResponse;
    32 | import io.micronaut.http.HttpStatus;
```

#### 🔧 How to Fix

Remove the unused import statement for 'io.micronaut.core.util.CollectionUtils' from the import section of the file.

**Recommended Code**:

```java
Before:
import io.micronaut.core.util.CollectionUtils;

After:
// Remove the line: import io.micronaut.core.util.CollectionUtils;
```

**Best Practices to Follow**:

- Avoid unused imports to reduce clutter and improve code clarity
- Use IDE tools to automatically detect and remove unused imports
- Regularly clean up imports as part of code reviews or CI/CD processes

#### 📎 All Occurrences

This issue appears in **40 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-imports-unusedimportscheck-low-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-imports-unusedimportscheck-low-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 40 occurrences with one click!

---


### 🟢 Com Puppycrawl Tools Checkstyle Checks Naming ParameterNameCheck

**Severity**: LOW | **Tool**: checkstyle | **Found in**: 5 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-naming-parameternamecheck-low-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a low severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.naming.ParameterNameCheck

#### 🎯 Why does it matter?

This pattern can lead to technical debt, maintenance issues, or code quality degradation.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

May reduce code quality, increase maintenance costs, and accumulate technical debt over time.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `discovery-client/src/main/java/io/micronaut/discovery/consul/client/v1/HTTPCheck.java` (Line 164)

**Code**:

```java
   161 |      * @param TLSSkipVerify Skip the TLS verification
   162 |      */
   163 |     @JsonProperty("TLSSkipVerify")
>  164 |     public void setTLSSkipVerify(@SuppressWarnings("ParameterName") boolean TLSSkipVerify) {
   165 |         this.TLSSkipVerify = TLSSkipVerify;
   166 |     }
   167 | 
```

#### 🔧 How to Fix

Rename the constant 'TLSSkipVerify' to follow the naming pattern by starting with a lowercase letter, e.g., 'tlsSkipVerify'.

**Recommended Code**:

```java
Before: public static final String TLSSkipVerify = "skip_verify";
After: public static final String tlsSkipVerify = "skip_verify";
```

**Best Practices to Follow**:

- Follow naming conventions for constants and variables
- Use descriptive and consistent names
- Ensure code adheres to team/project style guidelines

#### 📎 All Occurrences

This issue appears in **5 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-naming-parameternamecheck-low-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-naming-parameternamecheck-low-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 5 occurrences with one click!

---


### 🟢 Com Puppycrawl Tools Checkstyle Checks Whitespace NoWhitespaceBeforeCheck

**Severity**: LOW | **Tool**: checkstyle | **Found in**: 2 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-whitespace-nowhitespacebeforecheck-low-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a low severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.whitespace.NoWhitespaceBeforeCheck

#### 🎯 Why does it matter?

This pattern can lead to technical debt, maintenance issues, or code quality degradation.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

May reduce code quality, increase maintenance costs, and accumulate technical debt over time.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `function/src/test/groovy/io/micronaut/function/executor/FunctionInitializerSpec.java` (Line 34)

**Code**:

```java
    31 | 
    32 |     @Test
    33 |     public void testFunctionInitializer() {
>   34 |         Assert.assertEquals(new MathFunction().round(1.6f) , 2);
    35 |     }
    36 | 
    37 |     @Singleton
```

#### 🔧 How to Fix

Remove the whitespace before the comma to adhere to standard formatting conventions.

**Recommended Code**:

```java
Before: int x , y;
After: int x, y;
```

**Best Practices to Follow**:

- Follow standard punctuation spacing conventions
- Ensure consistent formatting for readability
- Use code formatting tools to automate style compliance

#### 📎 All Occurrences

This issue appears in **2 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-whitespace-nowhitespacebeforecheck-low-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-whitespace-nowhitespacebeforecheck-low-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 2 occurrences with one click!

---


### 🟢 Com Puppycrawl Tools Checkstyle Checks Whitespace GenericWhitespaceCheck

**Severity**: LOW | **Tool**: checkstyle | **Found in**: 2 files | **Category**: EXISTING_REST | **Auto-fix**: ✅ [Available](attachments/group-com-puppycrawl-tools-checkstyle-checks-whitespace-genericwhitespacecheck-low-checkstyle-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by checkstyle as a low severity problem. Rule: com.puppycrawl.tools.checkstyle.checks.whitespace.GenericWhitespaceCheck

#### 🎯 Why does it matter?

This pattern can lead to technical debt, maintenance issues, or code quality degradation.

#### 🔍 Common causes:

- Code patterns that violate checkstyle best practices
- Legacy code that needs refactoring
- Quick implementation without following standards
- Lack of code review or static analysis integration

#### ⚠️ Impact if not fixed:

May reduce code quality, increase maintenance costs, and accumulate technical debt over time.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `inject-java/src/test/groovy/io/micronaut/aop/factory/InterfaceImpl.java` (Line 25)

**Code**:

```java
    22 |  * @author Graeme Rocher
    23 |  * @since 1.0
    24 |  */
>   25 | public class InterfaceImpl implements InterfaceClass<Object>{
    26 |     @Override
    27 |     public String test(String name) {
    28 |         return "Name is " + name;
```

#### 🔧 How to Fix

Remove the illegal character following the &apos;&gt;&apos; symbol to ensure valid syntax and proper parsing.

**Recommended Code**:

```java
Before: <someCode>&gt;illegalCharacter
After: <someCode>&gt;
```

**Best Practices to Follow**:

- Ensure correct syntax and valid character usage in code
- Use proper code formatting tools to catch illegal characters
- Validate code against style guides to maintain consistency

#### 📎 All Occurrences

This issue appears in **2 files** across your codebase.

View complete list: [group-com-puppycrawl-tools-checkstyle-checks-whitespace-genericwhitespacecheck-low-checkstyle-locations.json](attachments/group-com-puppycrawl-tools-checkstyle-checks-whitespace-genericwhitespacecheck-low-checkstyle-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 2 occurrences with one click!

---



## 🛠️ Auto-Fixing CheckStyle Issues

**Good news! All 26,720 CheckStyle issues can be fixed automatically!**

### Option 1: Using Google Java Format

```bash
# Download google-java-format
wget https://github.com/google/google-java-format/releases/download/v1.17.0/google-java-format-1.17.0-all-deps.jar

# Format all Java files
find . -name "*.java" | xargs java -jar google-java-format-1.17.0-all-deps.jar --replace

# Verify fixes
git diff --stat
```

### Option 2: Using IntelliJ IDEA

1. Open project in IntelliJ IDEA
2. Go to **Code** → **Reformat Code** (or press ⌘⌥L / Ctrl+Alt+L)
3. Check **✓ Optimize imports** and **✓ Rearrange entries**
4. Select **Whole project** scope
5. Click **Run**

### Option 3: Using Maven CheckStyle Plugin

Add to `pom.xml`:

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-checkstyle-plugin</artifactId>
  <version>3.3.0</version>
  <configuration>
    <configLocation>checkstyle.xml</configLocation>
  </configuration>
</plugin>
```

Then run:
```bash
mvn checkstyle:check  # Verify current issues
```

### Option 4: Using Spotless (Recommended for CI/CD)

Add to `pom.xml`:

```xml
<plugin>
  <groupId>com.diffplug.spotless</groupId>
  <artifactId>spotless-maven-plugin</artifactId>
  <version>2.40.0</version>
  <configuration>
    <java>
      <googleJavaFormat>
        <version>1.17.0</version>
      </googleJavaFormat>
    </java>
  </configuration>
</plugin>
```

Then run:
```bash
mvn spotless:apply  # Auto-fix all formatting
mvn spotless:check  # Verify (use in CI)
```

> 💡 **Pro Tip**: Add `mvn spotless:check` to your CI pipeline to prevent CheckStyle issues from being introduced!

---


## 💼 Business Impact Analysis

### Executive Summary
⚠️ **Critical attention required:** 13389 blocking issues must be resolved before deployment to avoid security vulnerabilities or system failures.

### Financial Impact
| Metric | Value |
|--------|-------|
| **Fix Cost** | **$2,974,545** (19830.3 hours, ~2479 developer-days at $150/hour) |
| **Potential Exploit Cost** | **$50,000 - $500,000** |
| **Cost Breakdown** | Data breach costs, compliance fines (GDPR: €20M or 4% revenue), remediation, legal fees |
| **Return on Investment** | **0x minimum return** by preventing issues now vs. fixing in production |
| **Risk-Adjusted Savings** | $-2,924,545 minimum (prevention vs. remediation) |
| **Auto-Fix Available** | 183 issues can be automatically fixed (1% of total) |

### Risk Assessment
- **Immediate Risk:** 🔴 High
  - 13389 blocking issues require attention before deployment
  - 6 critical issues need urgent resolution
  - 13383 high-severity issues should be prioritized
  
- **Future Risk:** 🟡 Medium
  - Technical debt will compound if 11260 backlog issues are not addressed
  - Code maintainability may decrease over time
  - Security vulnerabilities (28) pose ongoing risk

### Risk Matrix by Category
| Category | Blocking | Backlog | Total Issues | Risk Level |
|----------|----------|---------|--------------|------------|
| **Security** | 22 | 6 | 28 | 🔴 Critical |
| **Performance** | 0 | 0 | 0 | ⚪ None |
| **Architecture** | 0 | 0 | 0 | ⚪ None |
| **Dependencies** | 0 | 0 | 0 | ⚪ None |
| **Code Quality** | 13367 | 13408 | 26775 | 🔴 High |

**Legend:**
- **Blocking:** Critical/High severity issues in NEW or EXISTING_MODIFIED files (must fix before merge)
- **Backlog:** Medium/Low severity or pre-existing issues (can be addressed later)
- **Risk Level:** Overall impact assessment based on severity distribution

### Recommendations

1. **Immediate Action:** Resolve 13389 blocking issues before deployment
2. **Priority:** Address critical blockers first
3. **Planning:** Schedule time for 60 medium-severity issues in upcoming sprints
4. **Continuous Improvement:** Track and reduce 11200 low-severity issues over time


**Note:** Each issue group section above includes detailed business impact analysis specific to that issue type.

## 📚 Educational Resources

**Priority training for 15543 critical/high-severity issues:**

### Security (6 critical, 16 high)

**Priority:** 🔴 Immediate

**Phase 1: Security Fundamentals (Week 1-2)**
- [📚 OWASP Top 10](https://owasp.org/www-project-top-ten/) - Top security risks and mitigations
- [🔒 OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) - Quick security reference
- [🎯 CWE Top 25](https://cwe.mitre.org/top25/) - Most dangerous software weaknesses
- [📖 Secure Coding in Java](https://www.oracle.com/java/technologies/javase/seccodeguide.html) - Oracle guidelines

**Phase 2: Specific Vulnerabilities (Week 3-4)**
- [🛡️ SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [🔐 Command Injection Defense](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html)
- [🔑 Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [🎓 PortSwigger Web Security Academy](https://portswigger.net/web-security) - Interactive labs

### Code Quality (0 critical, 15521 high)

**Priority:** 🟠 High

**Phase 1: Clean Code Basics (Week 1-2)**
- [🧹 Clean Code](https://www.oreilly.com/library/view/clean-code-a/9780136083238/) - Robert C. Martin
- [📏 Refactoring Guide](https://refactoring.guru/refactoring) - Martin Fowler techniques
- [🔧 Code Smells](https://refactoring.guru/refactoring/smells) - Common anti-patterns
- [📖 The Pragmatic Programmer](https://pragprog.com/titles/tpp20/) - Best practices

**Phase 2: Advanced Topics (Week 3-4)**
- [✅ Test-Driven Development](https://www.oreilly.com/library/view/test-driven-development/0321146530/) - Kent Beck
- [🎯 Working Effectively with Legacy Code](https://www.oreilly.com/library/view/working-effectively-with/0131177052/) - Michael Feathers
- [📊 Code Quality Metrics](https://www.baeldung.com/java-static-code-analysis-tutorial) - Static analysis

### 📈 Recommended Learning Path

**Week 1-2:** Focus on immediate priority areas identified above
**Week 3-4:** Deep dive into specific patterns and advanced techniques
**Ongoing:** Integrate static analysis into CI/CD, establish code review standards

### 🎓 Additional Resources

- [📺 Pluralsight](https://www.pluralsight.com/) - Video courses on all topics
- [📚 Baeldung](https://www.baeldung.com/) - Comprehensive Java tutorials
- [🎯 Java Code Geeks](https://www.javacodegeeks.com/) - Java best practices
- [🔬 DZone Java Zone](https://dzone.com/java-jdk-development-tutorials-tools-news) - Articles and guides

**💡 Tip:** Detailed issue-specific resources are linked in each section above.

## 👥 Skills Tracking

### test-user's Performance

**Overall Score:** 63/100
**Ranking:** #1 of 13 developers
**Team Average:** 51/100

### Category Breakdown

| Category | Your Score | Team Avg | Status |
|----------|------------|----------|--------|
| 🔒 Security | 16/100 | 51/100 | ⚠️ Below Average |
| ⚡ Performance | 100/100 | 51/100 | 🌟 Excellent |
| 🏗️  Architecture | 100/100 | 51/100 | 🌟 Excellent |
| 📦 Dependencies | 100/100 | 51/100 | 🌟 Excellent |
| ✨ Code Quality | 0/100 | 51/100 | ⚠️ Below Average |

### 🎯 Focus Areas

Consider improving these categories where you're below team average:

- **Security**: Review the educational resources in the section above
- **Code Quality**: Review the educational resources in the section above

### 🏆 Top Performers

| Rank | Developer | Score | PRs Analyzed |
|------|-----------|-------|-------------|
| 1 | **test-user** | **63/100** | **1** |
| 2 | Chris Roberts | 50/100 | 1 |
| 3 | jameskleeh | 50/100 | 1 |
| 4 | Graeme Rocher | 50/100 | 1 |
| 5 | Iván López | 50/100 | 1 |

> 💡 **Note:** Scores are based on code quality in your PRs. Higher scores mean fewer issues introduced!

## 📊 Analysis Metadata

### Analysis Coverage
| Metric | Value |
|--------|-------|
| Total Repository Files | 100 |
| Lines of Code | 10,000 |
| Files Modified | 100 |
| Note | Files Modified is clamped to Total Repository Files to avoid overcount (renames/moves) |
| Lines Changed | 700 (+500/-200) |


## 💬 PR Comment Template

**Ready-to-paste comment for your pull request:**

```markdown
## ⛔ Code Quality Analysis: DECLINED

Good evening @test-user! I've completed a comprehensive analysis of your PR.

There are 13389 issues that need to be addressed. I've provided detailed fix suggestions for each. Let me know if you need any help! 🚀

### Summary
- **Total Issues:** 26803 (68 unique types)
- **Blocking Issues:** 13389 ⛔
- **Resolved Issues:** 0 
- **Analysis Time:** 136.8s

### ⛔ Blocking Issues
Please fix these before merge:
- **DoubleCheckedLocking** in `configurations/netflix-ribbon/src/main/java/io/micronaut/configurations/ribbon/AbstractRibbonClientConfig.java`:249
- **java.lang.security.audit.unsafe-reflection.unsafe-reflection** in `cli/src/main/groovy/io/micronaut/cli/console/logging/MicronautConsole.java`:502
- **java.lang.security.audit.unsafe-reflection.unsafe-reflection** in `core/src/main/java/io/micronaut/core/reflect/ClassUtils.java`:149
- **java.lang.security.audit.crypto.ssl.defaulthttpclient-is-deprecated.defaulthttpclient-is-deprecated** in `function-client/src/main/java/io/micronaut/function/client/http/HttpFunctionExecutor.java`:77
- **java.lang.security.audit.crypto.ssl.defaulthttpclient-is-deprecated.defaulthttpclient-is-deprecated** in `http-client/src/main/java/io/micronaut/http/client/HttpClient.java`:190

... and 13384 more

### 💡 Quick Stats
- Auto-fixable: 348/26803 issues (7/68 types)
- Critical: 6
- High: 15537
- Medium: 60
- Low: 11200
```

> 💡 **Tip**: Copy the markdown above and paste it as a comment on your pull request.

## 🔗 Attachments

### 🛠️ IDE Fix Files (Lazy Loading)

**🚀 Instant-start IDE integration** with lazy loading:

📦 **1 manifest file** to load in your IDE:
- [all-issues-manifest.json](attachments/all-issues-manifest.json) - **Load this file first!**

**What you get**:
- ✅ **Critical issues** embedded (instant access, zero wait time)
- ⬇️  **High/Medium/Low issues** lazy loaded in background
- 🎯 **Priority-based download** (critical → high → medium → low)
- 📊 **Progress tracking** while you fix issues

**Total auto-fixable issues**: 26,803
- 🔴 Critical: 6 (embedded, instant access)
- 🟠 High: 15537 (lazy loaded after critical)
- 🟡 Medium: 60 (lazy loaded after high)
- 🟢 Low: 11200 (lazy loaded after medium)

**How to use** (Universal IDE Integration):

**For Any IDE** (Cursor, VS Code, IntelliJ, Windsurf, etc.):

**Step 1: Load the Manifest**
1. Download `all-issues-manifest.json` from `attachments/` directory
2. Open your IDE
3. Load/import the JSON file (method varies by IDE)

**Step 2: Fix Issues with Single Command**

**Simple prompt** (one command does everything):
```
👤 You: "Create a todo list and fix all issues divided by severity groups,
        starting from critical and ending with low, with constant progress updates"

🤖 IDE: [Creates structured todo list]
        ✅ Critical issues (6) - Starting...
        ⏳ High issues (15537) - Waiting...
        ⏳ Medium issues (60) - Waiting...
        ⏳ Low issues (11,200) - Waiting...

        [Applies fixes with real-time progress]
        ✅ Critical: 2/2 fixed (100%)
        🔄 High: 5/15537 fixed (0%)...
        ⏳ Medium: Waiting for high to complete...
```

**That's it!** The IDE handles everything:
- Loads the manifest automatically
- Creates a prioritized todo list
- Fixes issues in severity order (critical → high → medium → low)
- Shows live progress updates
- Downloads next priority issues in background

**Step 3: Validate Your Fixes with CodeQual**

After committing your fixes, CodeQual will automatically re-analyze your PR to confirm the issues are resolved:

```bash
# Commit your fixes
git add .
git commit -m "fix: resolve 15543 security issues"

# Push to PR branch
git push origin your-branch

# CodeQual automatically triggers:
🤖 CodeQual: [Running analysis on new commit...]
             ✅ Before: 6 critical, 15537 high
             ✅ After:  0 critical, 0 high
             🎉 All blockers resolved! PR approved.
```

**Why CodeQual re-scan?**
- ✅ Automated validation on every commit
- 📊 Compare before/after results objectively
- 🎯 Catch any regressions or incomplete fixes
- 🏆 Earn "First Clean PR" achievement

**Why this works**:
- ⚡ **Zero wait time** - critical issues embedded for instant access
- 🎯 **Priority-first** - most important issues available immediately
- 📦 **Efficient** - high/medium/low issues lazy-loaded in background
- 🤖 **Universal format** - works with any AI-powered IDE
- 🛡️  **Human-in-the-loop** - you review before applying for safety
- 🔄 **Validation workflow** - automated before/after comparison

---

*Generated by CodeQual V9 - Grouped Report Format (Bug #34 Lazy Loading)*  
*2025-10-28T18:37:59.900Z*