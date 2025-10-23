# 🔍 Code Quality Analysis Report

## Repository Information

**Repository:** apache/kafka  
**Pull Request:** #17620  
**Analysis Date:** October 13, 2025 at 08:00 PM GMT  
**Repository Size:** 4,509 files

## Quality Decision

**Result:** ⛔ **DECLINED** (7 blocking issues)

---

## 📊 Executive Summary

### Quality Score

🏆 **100.0/100** (Grade: **A**) - Excellent

> Outstanding code quality with minimal issues

**Score Breakdown**:

**Category Scores** (Repository Health):
- 🔒 Security: 100/100
- ⚡ Performance: 100/100
- 🏗️  Architecture: 100/100
- 📦 Dependencies: 100/100
- ✨ Code Quality: 100/100

**Overall Scores**:
- 📱 **APP Score**: 100/100 (MIN of categories - "weakest link")
- 👨‍💻 **Skill Score**: 100/100 (AVERAGE of categories)

> Scores saved to Supabase for tracking trends over time


---

### Issue Summary

**Total Issues**: 9,449 (17 unique types)

**By Severity**:
- 🔴 Critical: 2 (0.0%)
- 🟠 High: 13 (0.1%)
- 🟡 Medium: 9434 (99.8%)
- 🟢 Low: 0 (0.0%)

**By Category**:
- 🆕 NEW: 1746 (introduced in this PR)
- ⚠️  EXISTING_MODIFIED: 3 (pre-existing in modified files)
- ✅ RESOLVED: 2139 (fixed by this PR)
- 📝 EXISTING_REST: 5561 (pre-existing in unchanged files)

---

### Decision & Actions

**Blocking Decision**:
- 7 blocking issues (NEW or EXISTING_MODIFIED with critical/high severity)
- ⛔ **PR REQUIRES FIXES BEFORE MERGE**

**Fix Coverage**:
- **5/17 issue groups** support auto-fix (29.4%)
- **3,807/9,449 issues** can be fixed automatically (40.3%)

**Analysis Results**:
- AI-analyzed groups: 17
- Cost-optimized analysis: 99.8% reduction
- Coverage: 100% of detected issues

## 🔴 Critical Issues (Immediate Action Required)

### 🔴 Java.lang.security.audit.command-injection-process-builder.command-injection-process-builder

**Severity**: CRITICAL | **Tool**: semgrep | **Found in**: 2 files | **Category**: EXISTING_MODIFIED

---

#### 📋 What is this issue?

This issue was detected by semgrep as a critical severity problem.

#### 🎯 Why does it matter?

Following best practices helps maintain code quality and prevents potential bugs.

#### 🔍 Common causes:

- Code patterns that don't follow best practices
- Legacy code that needs refactoring

#### ⚠️ Impact if not fixed:

Could lead to bugs, security issues, or maintenance problems.

#### ⚠️ Risk Assessment

**Risk Level**: 🔴 **CRITICAL RISK**

Immediate action required - may lead to security breaches, data loss, or system failures

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 💼 Business Impact

Security breaches can lead to data loss, legal liability, reputation damage, and financial losses. GDPR/HIPAA compliance may be affected.

**Urgency**: Fix immediately - security issues are exploitable

**Key Stakeholders**: Security Team, Compliance, Legal, Executive Leadership

#### 📋 Recommended Action Plan

**Priority**: P0 - Critical  
**Timeframe**: Fix immediately (within 24 hours)  
**Effort**: Medium (focused fix)  

**Recommendation**: Drop current work. Assemble team. Fix and deploy hotfix. Post-mortem required.

**📚 Resources**:
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- CWE Database: https://cwe.mitre.org/
- NIST Guidelines: https://www.nist.gov/cyberframework

#### 📍 Representative Example

**Location**: `trogdor/src/main/java/org/apache/kafka/trogdor/workload/ExternalCommandWorker.java` (Line 171)

#### 🔧 How to Fix

Validate and sanitize the command components in `ExternalCommandWorker.startProcess()` by implementing a whitelist of allowed commands and rejecting any user-controlled input containing shell metacharacters or path traversal sequences.

**Recommended Code**:

```java
import java.util.Set;
import java.util.HashSet;
import java.util.regex.Pattern;
```

#### 📎 All Occurrences

This issue appears in **2 files** across your codebase.

View complete list: [group-java-lang-security-audit-command-injection-process-builder-command-injection-process-builder-critical-semgrep-locations.json](attachments/group-java-lang-security-audit-command-injection-process-builder-command-injection-process-builder-critical-semgrep-locations.json)

---



## 🟠 High Priority Issues

### 🟠 Java.lang.security.audit.unsafe-reflection.unsafe-reflection

**Severity**: HIGH | **Tool**: semgrep | **Found in**: 13 files | **Category**: NEW

---

#### 📋 What is this issue?

This issue was detected by semgrep as a high severity problem.

#### 🎯 Why does it matter?

Following best practices helps maintain code quality and prevents potential bugs.

#### 🔍 Common causes:

- Code patterns that don't follow best practices
- Legacy code that needs refactoring

#### ⚠️ Impact if not fixed:

Could lead to bugs, security issues, or maintenance problems.

#### ⚠️ Risk Assessment

**Risk Level**: 🔴 **CRITICAL RISK**

Immediate action required - may lead to security breaches, data loss, or system failures

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 💼 Business Impact

Security breaches can lead to data loss, legal liability, reputation damage, and financial losses. GDPR/HIPAA compliance may be affected.

**Urgency**: Fix immediately - security issues are exploitable

**Key Stakeholders**: Security Team, Compliance, Legal, Executive Leadership

#### 📋 Recommended Action Plan

**Priority**: P0 - Critical  
**Timeframe**: Fix immediately (within 24 hours)  
**Effort**: Medium (focused fix)  

**Recommendation**: Drop current work. Assemble team. Fix and deploy hotfix. Post-mortem required.

**📚 Resources**:
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- CWE Database: https://cwe.mitre.org/
- NIST Guidelines: https://www.nist.gov/cyberframework

#### 📍 Representative Example

**Location**: `clients/src/main/java/org/apache/kafka/common/utils/Utils.java` (Line 435)

#### 🔧 How to Fix



**Recommended Code**:

```java
import java.util.Set;
import java.util.HashSet;
import java.util.Collections;
```

#### 📎 All Occurrences

This issue appears in **13 files** across your codebase.

View complete list: [group-java-lang-security-audit-unsafe-reflection-unsafe-reflection-high-semgrep-locations.json](attachments/group-java-lang-security-audit-unsafe-reflection-unsafe-reflection-high-semgrep-locations.json)

---



## 🟡 Medium Priority Issues

### 🟡 Throwing Generic Exception Types

**Severity**: MEDIUM | **Tool**: PMD | **Found in**: 5326 files | **Category**: NEW

---

#### 📋 What is this issue?

Code is throwing generic exception types like Exception, RuntimeException, or Throwable instead of specific exception classes.

#### 🎯 Why does it matter?

Generic exceptions make it harder to handle errors properly and provide poor debugging information.

#### 🔍 Common causes:

- Quick error handling without proper exception design
- Lack of custom exception classes
- Copy-pasted error handling code

#### ⚠️ Impact if not fixed:

Makes debugging difficult, poor error handling, and reduces code maintainability.

#### 📊 Risk Assessment

**Risk Level**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Reliability  
**Focus**: Preventing bugs, crashes, and unexpected behavior

#### 💼 Business Impact

Reliability issues cause system downtime, data corruption, and user frustration. Critical for SLAs and customer trust.

**Urgency**: Include in quality improvement cycle

**Key Stakeholders**: QA Team, Support Team, Product Team, End Users

#### 📋 Recommended Action Plan

**Priority**: P2 - Medium  
**Timeframe**: Plan for next sprint or two  
**Effort**: High (batch fix recommended)  

**Recommendation**: Add to backlog, batch fix in refactoring sprint, use linter rules to prevent recurrence

**📚 Resources**:
- Effective Java by Joshua Bloch
- Java Concurrency in Practice
- Error Handling Best Practices

#### 📍 Representative Example

**Location**: `/workspace/clients/src/main/java/org/apache/kafka/clients/admin/DescribeConfigsResult.java` (Line 64)

#### 🔧 How to Fix

1. **Improvement:** Replace `new RuntimeException()` with a more specific exception like `new KafkaClientException("Failed to describe configs: " + e.getMessage(), e)`.

**Recommended Code**:

```java
import org.apache.kafka.common.KafkaException;
   import org.apache.kafka.common.errors.KafkaClientException;
```

#### 📎 All Occurrences

This issue appears in **5326 files** across your codebase.

View complete list: [group-avoidthrowingrawexceptiontypes-medium-pmd-locations.json](attachments/group-avoidthrowingrawexceptiontypes-medium-pmd-locations.json)

---


### 🟡 Unguarded Log Statements

**Severity**: MEDIUM | **Tool**: PMD | **Found in**: 2369 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-guardlogstatement-medium-pmd-cursor-fix.json)

---

#### 📋 What is this issue?

Log statements that perform expensive operations (like string concatenation) without checking if the log level is enabled first.

#### 🎯 Why does it matter?

Unnecessary string operations impact performance even when logging is disabled.

#### 🔍 Common causes:

- Inline string concatenation in log calls
- Not using parameterized logging
- Lack of awareness of logging performance impact

#### ⚠️ Impact if not fixed:

Degraded application performance, especially in high-throughput scenarios.

#### ✨ Risk Assessment

**Risk Level**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Performance  
**Focus**: Optimizing speed, resource usage, and scalability

#### 💼 Business Impact

Performance issues lead to poor user experience, higher infrastructure costs, and potential revenue loss from slow response times.

**Urgency**: Plan for optimization sprint

**Key Stakeholders**: DevOps, Product Team, Infrastructure, End Users

#### 📋 Recommended Action Plan

**Priority**: P3 - Low  
**Timeframe**: Address in quality improvement cycle  
**Effort**: Low (good for new contributors)  

**Recommendation**: Good first issue for onboarding, fix during code cleanup sprints, enable automated formatting/linting

**📚 Resources**:
- Java Performance Tuning: https://www.oracle.com/technical-resources/
- JVM Performance: https://docs.oracle.com/javase/8/docs/technotes/guides/vm/
- Profiling Tools: JProfiler, YourKit, VisualVM

#### 📍 Representative Example

**Location**: `/workspace/clients/src/main/java/org/apache/kafka/clients/NetworkClient.java` (Line 364)

#### 🔧 How to Fix

1.  Improvement: Surround `log.debug` call with `log.isDebugEnabled()` guard.

**Recommended Code**:

```java
if (log.isDebugEnabled()) {
        log.debug("Completed connection to node {}. Ready to send requests.", node.id());
    }
```

#### 📎 All Occurrences

This issue appears in **2369 files** across your codebase.

View complete list: [group-guardlogstatement-medium-pmd-locations.json](attachments/group-guardlogstatement-medium-pmd-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 2369 occurrences with one click!

---


### 🟡 Using System.out.println for Logging

**Severity**: MEDIUM | **Tool**: PMD | **Found in**: 741 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-systemprintln-medium-pmd-cursor-fix.json)

---

#### 📋 What is this issue?

Using System.out.println() or System.err.println() for output instead of a proper logging framework.

#### 🎯 Why does it matter?

System.out doesn't provide log levels, timestamps, or the ability to control output in production.

#### 🔍 Common causes:

- Debug statements left in production code
- Quick testing without proper logging setup
- Lack of logging framework knowledge

#### ⚠️ Impact if not fixed:

Poor production monitoring, no log level control, difficult to debug production issues.

#### ✨ Risk Assessment

**Risk Level**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 💼 Business Impact

Code quality issues slow down development, increase bug rates, and make onboarding new developers more difficult.

**Urgency**: Continuous improvement opportunity

**Key Stakeholders**: Development Team, Code Reviewers, Tech Leads

#### 📋 Recommended Action Plan

**Priority**: P3 - Low  
**Timeframe**: Address in quality improvement cycle  
**Effort**: Low (good for new contributors)  

**Recommendation**: Good first issue for onboarding, fix during code cleanup sprints, enable automated formatting/linting

**📚 Resources**:
- Clean Code by Robert C. Martin
- Refactoring by Martin Fowler
- Team Coding Standards Document

#### 📍 Representative Example

**Location**: `/workspace/clients/src/main/java/org/apache/kafka/clients/admin/AdminClientConfig.java` (Line 300)

#### 🔧 How to Fix

1.  **Improvement:** Replace `System.out.println` with a logger. Use `log.debug` or `log.info` depending on the severity and intent of the message.

**Recommended Code**:

```java
import org.slf4j.Logger;
    import org.slf4j.LoggerFactory;
```

#### 📎 All Occurrences

This issue appears in **741 files** across your codebase.

View complete list: [group-systemprintln-medium-pmd-locations.json](attachments/group-systemprintln-medium-pmd-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 741 occurrences with one click!

---


### 🟡 Using Volatile Variables

**Severity**: MEDIUM | **Tool**: PMD | **Found in**: 361 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-avoidusingvolatile-medium-pmd-cursor-fix.json)

---

#### 📋 What is this issue?

Using the volatile keyword for thread synchronization.

#### 🎯 Why does it matter?

Volatile is a low-level primitive that's easy to misuse. Modern Java has better concurrency tools.

#### 🔍 Common causes:

- Premature optimization
- Misunderstanding of Java memory model
- Using outdated concurrency patterns

#### ⚠️ Impact if not fixed:

Potential race conditions, hard-to-debug concurrency bugs, or unnecessary performance overhead.

#### ✨ Risk Assessment

**Risk Level**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 💼 Business Impact

Code quality issues slow down development, increase bug rates, and make onboarding new developers more difficult.

**Urgency**: Continuous improvement opportunity

**Key Stakeholders**: Development Team, Code Reviewers, Tech Leads

#### 📋 Recommended Action Plan

**Priority**: P3 - Low  
**Timeframe**: Address in quality improvement cycle  
**Effort**: Low (good for new contributors)  

**Recommendation**: Good first issue for onboarding, fix during code cleanup sprints, enable automated formatting/linting

**📚 Resources**:
- Clean Code by Robert C. Martin
- Refactoring by Martin Fowler
- Team Coding Standards Document

#### 📍 Representative Example

**Location**: `/workspace/clients/src/main/java/org/apache/kafka/clients/admin/KafkaAdminClient.java` (Line 1143)

#### 🔧 How to Fix

1. **Improvement:** Replace `volatile` with `AtomicBoolean` for `running` flag.

**Recommended Code**:

```java
import java.util.concurrent.atomic.AtomicBoolean;
```

#### 📎 All Occurrences

This issue appears in **361 files** across your codebase.

View complete list: [group-avoidusingvolatile-medium-pmd-locations.json](attachments/group-avoidusingvolatile-medium-pmd-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 361 occurrences with one click!

---


### 🟡 Utility Class Not Marked Final

**Severity**: MEDIUM | **Tool**: PMD | **Found in**: 210 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-classwithonlyprivateconstructorsshouldbefinal-medium-pmd-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by PMD as a medium severity problem.

#### 🎯 Why does it matter?

Following best practices helps maintain code quality and prevents potential bugs.

#### 🔍 Common causes:

- Code patterns that don't follow best practices
- Legacy code that needs refactoring

#### ⚠️ Impact if not fixed:

May reduce code quality and maintainability over time.

#### ✨ Risk Assessment

**Risk Level**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 💼 Business Impact

Code quality issues slow down development, increase bug rates, and make onboarding new developers more difficult.

**Urgency**: Continuous improvement opportunity

**Key Stakeholders**: Development Team, Code Reviewers, Tech Leads

#### 📋 Recommended Action Plan

**Priority**: P3 - Low  
**Timeframe**: Address in quality improvement cycle  
**Effort**: Low (good for new contributors)  

**Recommendation**: Good first issue for onboarding, fix during code cleanup sprints, enable automated formatting/linting

**📚 Resources**:
- Clean Code by Robert C. Martin
- Refactoring by Martin Fowler
- Team Coding Standards Document

#### 📍 Representative Example

**Location**: `/workspace/clients/src/main/java/org/apache/kafka/clients/admin/NewPartitions.java` (Line 31)

#### 🔧 How to Fix

1.  Improvement: Declare `NewPartitions` class as `final`.

**Recommended Code**:

```java
package org.apache.kafka.clients.admin;

    public final class NewPartitions {
        private final int totalCount;
        private final NewPartitionAssignment assignment;

        private NewPartitions(int totalCount, NewPartitionAssignment assignment) {
            this.totalCount = totalCount;
            this.assignment = assignment;
        }

        public static NewPartitions increaseTo(int totalCount) {
            return new NewPartitions(totalCount, null);
        }

        public static NewPartitions assign(int totalCount, NewPartitionAssignment assignment) {
            return new NewPartitions(totalCount, assignment);
        }

        public int totalCount() {
            return totalCount;
        }

        public NewPartitionAssignment assignment() {
            return assignment;
        }
    }
```

#### 📎 All Occurrences

This issue appears in **210 files** across your codebase.

View complete list: [group-classwithonlyprivateconstructorsshouldbefinal-medium-pmd-locations.json](attachments/group-classwithonlyprivateconstructorsshouldbefinal-medium-pmd-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 210 occurrences with one click!

---


### 🟡 Reassigning Method Parameters

**Severity**: MEDIUM | **Tool**: PMD | **Found in**: 187 files | **Category**: NEW

---

#### 📋 What is this issue?

This issue was detected by PMD as a medium severity problem.

#### 🎯 Why does it matter?

Following best practices helps maintain code quality and prevents potential bugs.

#### 🔍 Common causes:

- Code patterns that don't follow best practices
- Legacy code that needs refactoring

#### ⚠️ Impact if not fixed:

May reduce code quality and maintainability over time.

#### ✨ Risk Assessment

**Risk Level**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 💼 Business Impact

Code quality issues slow down development, increase bug rates, and make onboarding new developers more difficult.

**Urgency**: Continuous improvement opportunity

**Key Stakeholders**: Development Team, Code Reviewers, Tech Leads

#### 📋 Recommended Action Plan

**Priority**: P3 - Low  
**Timeframe**: Address in quality improvement cycle  
**Effort**: Low (good for new contributors)  

**Recommendation**: Good first issue for onboarding, fix during code cleanup sprints, enable automated formatting/linting

**📚 Resources**:
- Clean Code by Robert C. Martin
- Refactoring by Martin Fowler
- Team Coding Standards Document

#### 📍 Representative Example

**Location**: `/workspace/clients/src/main/java/org/apache/kafka/clients/consumer/internals/Acknowledgements.java` (Line 211)

#### 🔧 How to Fix

1.  Improvement: Introduce a new local variable `nextBatch` to hold the updated value instead of reassigning `currentBatch`.

**Recommended Code**:

```java
// Original line: currentBatch = new Batch(currentBatch.topicPartition, currentBatch.baseOffset, currentBatch.lastOffset, currentBatch.sizeInBytes + sizeInBytes, currentBatch.records);
    Batch nextBatch = new Batch(currentBatch.topicPartition, currentBatch.baseOffset, currentBatch.lastOffset, currentBatch.sizeInBytes + sizeInBytes, currentBatch.records);
    this.batches.put(currentBatch.topicPartition, nextBatch);
```

#### 📎 All Occurrences

This issue appears in **187 files** across your codebase.

View complete list: [group-avoidreassigningparameters-medium-pmd-locations.json](attachments/group-avoidreassigningparameters-medium-pmd-locations.json)

---


### 🟡 Returning Null Instead of Empty Collection

**Severity**: MEDIUM | **Tool**: PMD | **Found in**: 126 files | **Category**: NEW | **Auto-fix**: ✅ [Available](attachments/group-returnemptycollectionratherthannull-medium-pmd-cursor-fix.json)

---

#### 📋 What is this issue?

This issue was detected by PMD as a medium severity problem.

#### 🎯 Why does it matter?

Following best practices helps maintain code quality and prevents potential bugs.

#### 🔍 Common causes:

- Code patterns that don't follow best practices
- Legacy code that needs refactoring

#### ⚠️ Impact if not fixed:

May reduce code quality and maintainability over time.

#### 📊 Risk Assessment

**Risk Level**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Reliability  
**Focus**: Preventing bugs, crashes, and unexpected behavior

#### 💼 Business Impact

Reliability issues cause system downtime, data corruption, and user frustration. Critical for SLAs and customer trust.

**Urgency**: Include in quality improvement cycle

**Key Stakeholders**: QA Team, Support Team, Product Team, End Users

#### 📋 Recommended Action Plan

**Priority**: P2 - Medium  
**Timeframe**: Plan for next sprint or two  
**Effort**: High (batch fix recommended)  

**Recommendation**: Add to backlog, batch fix in refactoring sprint, use linter rules to prevent recurrence

**📚 Resources**:
- Effective Java by Joshua Bloch
- Java Concurrency in Practice
- Error Handling Best Practices

#### 📍 Representative Example

**Location**: `/workspace/clients/src/main/java/org/apache/kafka/clients/consumer/internals/CompletedFetch.java` (Line 371)

#### 🔧 How to Fix

```java
import java.util.Collections;
import java.util.List;
import org.apache.kafka.common.record.Record;

**Recommended Code**:

```java
import java.util.Collections;
import java.util.List;
import org.apache.kafka.common.record.Record;

// ... (inside the CompletedFetch class)

public List<Record> records() {
    if (currentRecords == null) {
        return Collections.emptyList();
    }
    return currentRecords.records();
}
```

#### 📎 All Occurrences

This issue appears in **126 files** across your codebase.

View complete list: [group-returnemptycollectionratherthannull-medium-pmd-locations.json](attachments/group-returnemptycollectionratherthannull-medium-pmd-locations.json)

> 💡 **Tip**: Download the IDE fix file to resolve all 126 occurrences with one click!

---


### 🟡 Constructor Calls Overridable Method

**Severity**: MEDIUM | **Tool**: PMD | **Found in**: 58 files | **Category**: NEW

---

#### 📋 What is this issue?

This issue was detected by PMD as a medium severity problem.

#### 🎯 Why does it matter?

Following best practices helps maintain code quality and prevents potential bugs.

#### 🔍 Common causes:

- Code patterns that don't follow best practices
- Legacy code that needs refactoring

#### ⚠️ Impact if not fixed:

May reduce code quality and maintainability over time.

#### ✨ Risk Assessment

**Risk Level**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 💼 Business Impact

Code quality issues slow down development, increase bug rates, and make onboarding new developers more difficult.

**Urgency**: Continuous improvement opportunity

**Key Stakeholders**: Development Team, Code Reviewers, Tech Leads

#### 📋 Recommended Action Plan

**Priority**: P3 - Low  
**Timeframe**: Address in quality improvement cycle  
**Effort**: Low (good for new contributors)  

**Recommendation**: Good first issue for onboarding, fix during code cleanup sprints, enable automated formatting/linting

**📚 Resources**:
- Clean Code by Robert C. Martin
- Refactoring by Martin Fowler
- Team Coding Standards Document

#### 📍 Representative Example

**Location**: `/workspace/clients/src/main/java/org/apache/kafka/clients/producer/KafkaProducer.java` (Line 466)

#### 🔧 How to Fix

1. **Improvement:**
   - Introduce a private helper method `createNewSender` to encapsulate the `new Sender` instantiation.
   - Call `createNewSender` from the constructor.

**Recommended Code**:

```java
import org.apache.kafka.clients.producer.internals.Sender;
   import org.apache.kafka.common.metrics.Metrics;
   import org.apache.kafka.common.utils.Time;
   import org.apache.kafka.clients.producer.internals.BufferPool;
   import org.apache.kafka.clients.producer.internals.ProducerMetadata;
   import org.apache.kafka.clients.producer.internals.RecordAccumulator;
   import org.apache.kafka.clients.producer.internals.TransactionManager;
   import org.apache.kafka.clients.producer.internals.ProducerInterceptors;
   import org.apache.kafka.clients.producer.internals.KafkaProducerMetrics;
   import org.apache.kafka.clients.ClientDnsLookup;
   import org.apache.kafka.common.network.ChannelBuilders;
   import org.apache.kafka.common.utils.LogContext;
```

#### 📎 All Occurrences

This issue appears in **58 files** across your codebase.

View complete list: [group-constructorcallsoverridablemethod-medium-pmd-locations.json](attachments/group-constructorcallsoverridablemethod-medium-pmd-locations.json)

---


### 🟡 Throwing NullPointerException

**Severity**: MEDIUM | **Tool**: PMD | **Found in**: 19 files | **Category**: NEW

---

#### 📋 What is this issue?

This issue was detected by PMD as a medium severity problem.

#### 🎯 Why does it matter?

Following best practices helps maintain code quality and prevents potential bugs.

#### 🔍 Common causes:

- Code patterns that don't follow best practices
- Legacy code that needs refactoring

#### ⚠️ Impact if not fixed:

May reduce code quality and maintainability over time.

#### 📊 Risk Assessment

**Risk Level**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Reliability  
**Focus**: Preventing bugs, crashes, and unexpected behavior

#### 💼 Business Impact

Reliability issues cause system downtime, data corruption, and user frustration. Critical for SLAs and customer trust.

**Urgency**: Include in quality improvement cycle

**Key Stakeholders**: QA Team, Support Team, Product Team, End Users

#### 📋 Recommended Action Plan

**Priority**: P2 - Medium  
**Timeframe**: Plan for next sprint or two  
**Effort**: Low to Medium  

**Recommendation**: Fix opportunistically during related work, add code review checklist item

**📚 Resources**:
- Effective Java by Joshua Bloch
- Java Concurrency in Practice
- Error Handling Best Practices

#### 📍 Representative Example

**Location**: `/workspace/streams/src/main/java/org/apache/kafka/streams/kstream/WindowedSerdes.java` (Line 74)

#### 🔧 How to Fix

```java
import java.util.Objects;

**Recommended Code**:

```java
import java.util.Objects;

// ... other imports

public class WindowedSerdes {
    // ... other methods

    public static <T> Serde<Windowed<T>> timeWindowedSerdeFrom(final Class<T> innerClass) {
        Objects.requireNonNull(innerClass, "The inner class for the time-windowed serde cannot be null.");
        return new TimeWindowedSerde<>(Serdes.serdeFrom(innerClass));
    }

    // ... other methods
}
```

#### 📎 All Occurrences

This issue appears in **19 files** across your codebase.

View complete list: [group-avoidthrowingnullpointerexception-medium-pmd-locations.json](attachments/group-avoidthrowingnullpointerexception-medium-pmd-locations.json)

---


### 🟡 Avoid Branching Statement As Last In Loop

**Severity**: MEDIUM | **Tool**: PMD | **Found in**: 13 files | **Category**: NEW

---

#### 📋 What is this issue?

This issue was detected by PMD as a medium severity problem.

#### 🎯 Why does it matter?

Following best practices helps maintain code quality and prevents potential bugs.

#### 🔍 Common causes:

- Code patterns that don't follow best practices
- Legacy code that needs refactoring

#### ⚠️ Impact if not fixed:

May reduce code quality and maintainability over time.

#### ✨ Risk Assessment

**Risk Level**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 💼 Business Impact

Code quality issues slow down development, increase bug rates, and make onboarding new developers more difficult.

**Urgency**: Continuous improvement opportunity

**Key Stakeholders**: Development Team, Code Reviewers, Tech Leads

#### 📋 Recommended Action Plan

**Priority**: P3 - Low  
**Timeframe**: Address in quality improvement cycle  
**Effort**: Low (good for new contributors)  

**Recommendation**: Good first issue for onboarding, fix during code cleanup sprints, enable automated formatting/linting

**📚 Resources**:
- Clean Code by Robert C. Martin
- Refactoring by Martin Fowler
- Team Coding Standards Document

#### 📍 Representative Example

**Location**: `/workspace/clients/src/main/java/org/apache/kafka/clients/admin/KafkaAdminClient.java` (Line 1327)

#### 🔧 How to Fix

1. **Improvement:** Refactor the loop to avoid `break` as the last statement.
2. **Required imports:** None.
3. **Clean code example:**

**Recommended Code**:

```java
// Original code snippet (for context, not part of the fix)
// for (int i = 0; i < numNodes; i++) {
//     Node node = nodes.get(i);
//     if (node.id() == brokerId) {
//         brokerNode = node;
//         break; // Branching statement as the last in a loop
//     }
// }

// Replacement:
Node brokerNode = null;
for (Node node : nodes) {
    if (node.id() == brokerId) {
        brokerNode = node;
        break;
    }
}
```

**Best Practices to Follow**:

- all* matching nodes, then a different approach (e.g., collecting into a list) would be necessary. Assuming the goal is to find the *first* matching node, the current structure is optimal.

#### 📎 All Occurrences

This issue appears in **13 files** across your codebase.

View complete list: [group-avoidbranchingstatementaslastinloop-medium-pmd-locations.json](attachments/group-avoidbranchingstatementaslastinloop-medium-pmd-locations.json)

---


### 🟡 Using FileInputStream/FileOutputStream

**Severity**: MEDIUM | **Tool**: PMD | **Found in**: 11 files | **Category**: NEW

---

#### 📋 What is this issue?

This issue was detected by PMD as a medium severity problem.

#### 🎯 Why does it matter?

Following best practices helps maintain code quality and prevents potential bugs.

#### 🔍 Common causes:

- Code patterns that don't follow best practices
- Legacy code that needs refactoring

#### ⚠️ Impact if not fixed:

May reduce code quality and maintainability over time.

#### ✨ Risk Assessment

**Risk Level**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 💼 Business Impact

Code quality issues slow down development, increase bug rates, and make onboarding new developers more difficult.

**Urgency**: Continuous improvement opportunity

**Key Stakeholders**: Development Team, Code Reviewers, Tech Leads

#### 📋 Recommended Action Plan

**Priority**: P3 - Low  
**Timeframe**: Address in quality improvement cycle  
**Effort**: Low (good for new contributors)  

**Recommendation**: Good first issue for onboarding, fix during code cleanup sprints, enable automated formatting/linting

**📚 Resources**:
- Clean Code by Robert C. Martin
- Refactoring by Martin Fowler
- Team Coding Standards Document

#### 📍 Representative Example

**Location**: `/workspace/raft/src/main/java/org/apache/kafka/raft/FileQuorumStateStore.java` (Line 173)

#### 🔧 How to Fix

1. `Files.newInputStream`, `Files.newOutputStream`
2. `java.nio.file.Files`, `java.nio.file.Path`
3. ```java
   // Original: new FileInputStream(file)
   // Replaced with:
   Files.newInputStream(file.toPath())

**Recommended Code**:

```java
// Original: new FileInputStream(file)
   // Replaced with:
   Files.newInputStream(file.toPath())

   // Original: new FileOutputStream(file)
   // Replaced with:
   Files.newOutputStream(file.toPath())
```

#### 📎 All Occurrences

This issue appears in **11 files** across your codebase.

View complete list: [group-avoidfilestream-medium-pmd-locations.json](attachments/group-avoidfilestream-medium-pmd-locations.json)

---


### 🟡 Multiple Logger Declarations

**Severity**: MEDIUM | **Tool**: PMD | **Found in**: 6 files | **Category**: NEW

---

#### 📋 What is this issue?

This issue was detected by PMD as a medium severity problem.

#### 🎯 Why does it matter?

Following best practices helps maintain code quality and prevents potential bugs.

#### 🔍 Common causes:

- Code patterns that don't follow best practices
- Legacy code that needs refactoring

#### ⚠️ Impact if not fixed:

May reduce code quality and maintainability over time.

#### ✨ Risk Assessment

**Risk Level**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 💼 Business Impact

Code quality issues slow down development, increase bug rates, and make onboarding new developers more difficult.

**Urgency**: Continuous improvement opportunity

**Key Stakeholders**: Development Team, Code Reviewers, Tech Leads

#### 📋 Recommended Action Plan

**Priority**: P3 - Low  
**Timeframe**: Address in quality improvement cycle  
**Effort**: Low (good for new contributors)  

**Recommendation**: Good first issue for onboarding, fix during code cleanup sprints, enable automated formatting/linting

**📚 Resources**:
- Clean Code by Robert C. Martin
- Refactoring by Martin Fowler
- Team Coding Standards Document

#### 📍 Representative Example

**Location**: `/workspace/metadata/src/main/java/org/apache/kafka/metadata/authorizer/StandardAuthorizerData.java` (Line 64)

#### 🔧 How to Fix

1. **Improvement:** Consolidate to a single `LOGGER` instance.
2. **Required imports:** None (assuming `org.slf4j.Logger` and `org.slf4j.LoggerFactory` are already imported).
3. **Clean code example:**

**Recommended Code**:

```java
package org.apache.kafka.metadata.authorizer;

import org.apache.kafka.common.acl.AclBinding;
import org.apache.kafka.common.acl.AclBindingFilter;
import org.apache.kafka.common.resource.ResourcePattern;
import org.apache.kafka.server.authorizer.AuthorizerServerInfo;
import org.apache.kafka.server.authorizer.AuthorizerUtils;
import org.apache.kafka.server.authorizer.SupportedVersionRange;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

import static java.util.Objects.requireNonNull;

public class StandardAuthorizerData implements AuthorizerData {
    private static final Logger LOGGER = LoggerFactory.getLogger(StandardAuthorizerData.class);

    private final Map<ResourcePattern, Set<AclBinding>> resourceToAcls = new HashMap<>();
    private final Map<String, Set<ResourcePattern>> principalToResourcePatterns = new HashMap<>();
    private final Map<ResourcePattern, Set<AclBinding>> futureResourceToAcls = new HashMap<>();
    private final Map<String, Set<ResourcePattern>> futurePrincipalToResourcePatterns = new HashMap<>();
    private final AtomicLong lastUpdateTimestamp = new AtomicLong(0);
    private final SupportedVersionRange supportedVersionRange;

    public StandardAuthorizerData(AuthorizerServerInfo serverInfo) {
        this.supportedVersionRange = AuthorizerUtils.supportedVersionRange(serverInfo);
    }

    // ... rest of the class
}
```

#### 📎 All Occurrences

This issue appears in **6 files** across your codebase.

View complete list: [group-morethanonelogger-medium-pmd-locations.json](attachments/group-morethanonelogger-medium-pmd-locations.json)

---


### 🟡 Singleton Class Returning New Instance

**Severity**: MEDIUM | **Tool**: PMD | **Found in**: 4 files | **Category**: NEW

---

#### 📋 What is this issue?

This issue was detected by PMD as a medium severity problem.

#### 🎯 Why does it matter?

Following best practices helps maintain code quality and prevents potential bugs.

#### 🔍 Common causes:

- Code patterns that don't follow best practices
- Legacy code that needs refactoring

#### ⚠️ Impact if not fixed:

May reduce code quality and maintainability over time.

#### ✨ Risk Assessment

**Risk Level**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Architecture  
**Focus**: Improving system design, maintainability, and extensibility

#### 💼 Business Impact

Poor architecture increases development costs, slows feature delivery, and makes the system brittle and hard to change.

**Urgency**: Plan for architecture review

**Key Stakeholders**: Architecture Team, Engineering Leads, Product Team

#### 📋 Recommended Action Plan

**Priority**: P3 - Low  
**Timeframe**: Address in quality improvement cycle  
**Effort**: Low (good for new contributors)  

**Recommendation**: Good first issue for onboarding, fix during code cleanup sprints, enable automated formatting/linting

**📚 Resources**:
- Clean Architecture by Robert C. Martin
- Design Patterns by Gang of Four
- SOLID Principles

#### 📍 Representative Example

**Location**: `/workspace/share/src/main/java/org/apache/kafka/server/share/SharePartitionKey.java` (Line 68)

#### 🔧 How to Fix

```java
package org.apache.kafka.server.share;

**Recommended Code**:

```java
package org.apache.kafka.server.share;

import java.nio.ByteBuffer;
import java.util.Objects;

public class SharePartitionKey {

    private static volatile SharePartitionKey instance; // Use 'instance' for the singleton object
    private static final Object MUTEX = new Object(); // Use 'MUTEX' for synchronization lock

    private final String resource;
    private final ByteBuffer key;

    private SharePartitionKey(String resource, ByteBuffer key) {
        this.resource = resource;
        this.key = key;
    }

    public static SharePartitionKey getInstance(String resource, ByteBuffer key) {
        SharePartitionKey result = instance;
        if (result == null) {
            synchronized (MUTEX) {
                result = instance;
                if (result == null) {
                    instance = result = new SharePartitionKey(resource, key);
                }
            }
        }
        return result;
    }

    public String resource() {
        return resource;
    }

    public ByteBuffer key() {
        return key;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SharePartitionKey that = (SharePartitionKey) o;
        return Objects.equals(resource, that.resource) && Objects.equals(key, that.key);
    }

    @Override
    public int hashCode() {
        return Objects.hash(resource, key);
    }
}
```

#### 📎 All Occurrences

This issue appears in **4 files** across your codebase.

View complete list: [group-singletonclassreturningnewinstance-medium-pmd-locations.json](attachments/group-singletonclassreturningnewinstance-medium-pmd-locations.json)

---


### 🟡 Single Method Singleton

**Severity**: MEDIUM | **Tool**: PMD | **Found in**: 2 files | **Category**: NEW

---

#### 📋 What is this issue?

This issue was detected by PMD as a medium severity problem.

#### 🎯 Why does it matter?

Following best practices helps maintain code quality and prevents potential bugs.

#### 🔍 Common causes:

- Code patterns that don't follow best practices
- Legacy code that needs refactoring

#### ⚠️ Impact if not fixed:

May reduce code quality and maintainability over time.

#### ✨ Risk Assessment

**Risk Level**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 💼 Business Impact

Code quality issues slow down development, increase bug rates, and make onboarding new developers more difficult.

**Urgency**: Continuous improvement opportunity

**Key Stakeholders**: Development Team, Code Reviewers, Tech Leads

#### 📋 Recommended Action Plan

**Priority**: P3 - Low  
**Timeframe**: Address in quality improvement cycle  
**Effort**: Low (good for new contributors)  

**Recommendation**: Good first issue for onboarding, fix during code cleanup sprints, enable automated formatting/linting

**📚 Resources**:
- Clean Code by Robert C. Martin
- Refactoring by Martin Fowler
- Team Coding Standards Document

#### 📍 Representative Example

**Location**: `/workspace/share/src/main/java/org/apache/kafka/server/share/SharePartitionKey.java` (Line 30)

#### 🔧 How to Fix

1.  **Improvement with SPECIFIC method/variable names:**
    Rename `getInstance(String topic, int partition)` to `fromTopicAndPartition(String topic, int partition)`.
    Rename `getInstance(ByteBuffer buffer)` to `fromByteBuffer(ByteBuffer buffer)`.

**Recommended Code**:

```java
package org.apache.kafka.server.share;

    import java.nio.ByteBuffer;
    import java.util.Objects;

    public class SharePartitionKey {
        private final String topic;
        private final int partition;

        private SharePartitionKey(String topic, int partition) {
            this.topic = topic;
            this.partition = partition;
        }

        public static SharePartitionKey fromTopicAndPartition(String topic, int partition) {
            return new SharePartitionKey(topic, partition);
        }

        public static SharePartitionKey fromByteBuffer(ByteBuffer buffer) {
            // Assuming the buffer contains topic length (int), topic bytes, and partition (int)
            int topicLength = buffer.getInt();
            byte[] topicBytes = new byte[topicLength];
            buffer.get(topicBytes);
            String topic = new String(topicBytes, java.nio.charset.StandardCharsets.UTF_8);
            int partition = buffer.getInt();
            return new SharePartitionKey(topic, partition);
        }

        public String topic() {
            return topic;
        }

        public int partition() {
            return partition;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            SharePartitionKey that = (SharePartitionKey) o;
            return partition == that.partition && Objects.equals(topic, that.topic);
        }

        @Override
        public int hashCode() {
            return Objects.hash(topic, partition);
        }

        @Override
        public String toString() {
            return "SharePartitionKey(" +
                   "topic='" + topic + '\'' +
                   ", partition=" + partition +
                   ')';
        }
    }
```

#### 📎 All Occurrences

This issue appears in **2 files** across your codebase.

View complete list: [group-singlemethodsingleton-medium-pmd-locations.json](attachments/group-singlemethodsingleton-medium-pmd-locations.json)

---


### 🟡 Abstract Class Without Any Method

**Severity**: MEDIUM | **Tool**: PMD | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

This issue was detected by PMD as a medium severity problem.

#### 🎯 Why does it matter?

Following best practices helps maintain code quality and prevents potential bugs.

#### 🔍 Common causes:

- Code patterns that don't follow best practices
- Legacy code that needs refactoring

#### ⚠️ Impact if not fixed:

May reduce code quality and maintainability over time.

#### ✨ Risk Assessment

**Risk Level**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 💼 Business Impact

Code quality issues slow down development, increase bug rates, and make onboarding new developers more difficult.

**Urgency**: Continuous improvement opportunity

**Key Stakeholders**: Development Team, Code Reviewers, Tech Leads

#### 📋 Recommended Action Plan

**Priority**: P3 - Low  
**Timeframe**: Address in quality improvement cycle  
**Effort**: Low (good for new contributors)  

**Recommendation**: Good first issue for onboarding, fix during code cleanup sprints, enable automated formatting/linting

**📚 Resources**:
- Clean Code by Robert C. Martin
- Refactoring by Martin Fowler
- Team Coding Standards Document

#### 📍 Representative Example

**Location**: `/workspace/clients/src/main/java/org/apache/kafka/common/KafkaFuture.java` (Line 56)

#### 🔧 How to Fix

1. Improvement: Change `abstract` class to `final` with a private constructor.
2. No imports needed.
3. Clean code example:

**Recommended Code**:

```java
package org.apache.kafka.common;

public final class KafkaFuture<T> { // Changed to final
    // Private constructor to prevent instantiation
    private KafkaFuture() { 
        // This constructor will never be called
    }

    /**
     * Returns a {@code KafkaFuture} which is already completed with the given value.
     *
     * @param value The value.
     * @param <T> The type of the value.
     * @return The future.
     */
    public static <T> KafkaFuture<T> completedFuture(T value) {
        return new org.apache.kafka.common.internals.Default  KafkaFuture.completedFuture(value);
    }

    /**
     * Returns a {@code KafkaFuture} which is already completed exceptionally with the given exception.
     *
     * @param exception The exception.
     * @param <T> The type of the value.
     * @return The future.
     */
    public static <T> KafkaFuture<T> failedFuture(Throwable exception) {
        return new org.apache.kafka.common.internals.DefaultKafkaFuture.failedFuture(exception);
    }

    // ... rest of the class methods
}
```

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

View complete list: [group-abstractclasswithoutanymethod-medium-pmd-locations.json](attachments/group-abstractclasswithoutanymethod-medium-pmd-locations.json)

---



## 💼 Business Impact Analysis

### Executive Summary
This analysis evaluates the business risks and financial implications of the identified code quality issues.

### Risk Assessment
- **Immediate Risk:** High (7 blocking issues require attention before deployment)
- **Future Risk:** 15 issues could lead to increased technical debt if not addressed

### Financial Impact
| Metric | Value | Explanation |
|--------|-------|-------------|
| Fix Cost | 5 developer-days | Estimated time to resolve critical and high-severity issues |
| Potential Exploit Cost | Low | 2 critical issues could cause system instability or reliability problems |
| Return on Investment | 10-50x | Ratio of prevention cost vs potential exploit/incident cost |

### Risk Matrix by Category
| Category | Critical | High | Total Issues | Impact |
|----------|----------|------|--------------|--------|
| Security | 0 | 0 | 0 | ⚪ None |
| Performance | 0 | 0 | 0 | ⚪ None |
| Reliability | 0 | 0 | 0 | ⚪ None |

**Note:** Each issue group section above includes detailed business impact analysis specific to that issue type.

## 📚 Educational Resources

✅ **No specific educational resources needed at this time.**

Your code quality is good! Consider reviewing general best practices to maintain this standard.

## 📊 Analysis Metadata

### Performance Metrics
| Metric | Value |
|--------|-------|
| Repository Clone | 0.0s |
| Code Analysis | 0.0s |
| Report Generation | 0.0s |
| **Total Duration** | **0.0s** |

### Analysis Coverage
| Metric | Value |
|--------|-------|
| Total Repository Files | 4,509 |
| Lines of Code | 0 |
| Files Modified | 0 |
| Lines Changed | 0 (+0/-0) |

### System Information
- **Analyzer Version:** V9 Grouped Report Formatter
- **Analysis Date:** 10/13/2025, 8:00:23 PM
- **Report Format:** Grouped (Compact)

## 💬 PR Comment Template

**Ready-to-paste comment for your pull request:**

```markdown
## ⛔ Code Quality Analysis: DECLINED

Hello @developer! I've completed a comprehensive analysis of your PR.

🎉 Excellent work! You've resolved 2139 existing issues. Just 7 items to address before merge.

### Summary
- **Total Issues:** 9449 (17 unique types)
- **Blocking Issues:** 7 ⛔
- **Resolved Issues:** 2139 🎉
- **Analysis Time:** 0.0s

### ⛔ Blocking Issues
Please fix these before merge:
- **java.lang.security.audit.unsafe-reflection.unsafe-reflection** in `clients/src/main/java/org/apache/kafka/common/utils/Utils.java`:435
- **java.lang.security.audit.unsafe-reflection.unsafe-reflection** in `tools/src/main/java/org/apache/kafka/tools/OAuthCompatibilityTool.java`:372
- **java.lang.security.audit.unsafe-reflection.unsafe-reflection** in `tools/src/main/java/org/apache/kafka/tools/consumer/ConsoleConsumerOptions.java`:330
- **java.lang.security.audit.unsafe-reflection.unsafe-reflection** in `tools/src/main/java/org/apache/kafka/tools/consumer/ConsoleShareConsumerOptions.java`:199
- **java.lang.security.audit.unsafe-reflection.unsafe-reflection** in `clients/src/main/java/org/apache/kafka/common/utils/SecurityUtils.java`:87

... and 2 more

### 💡 Quick Stats
- Auto-fixable: 5/17 issue types
- Critical: 2
- High: 13
- Medium: 9434
- Low: 0

---
*Generated by V9 Code Quality Analyzer | [View Full Report](#)*
```

**📋 Instructions:**
1. Copy the markdown content above
2. Paste it as a comment on your pull request
3. Customize if needed (greeting, additional context, etc.)

## 🔗 Attachments

1. [Issue Groups Mapping](issue-groups-map.json) - Index of all 17 groups
2. [Group 1 Locations](attachments/group-java-lang-security-audit-command-injection-process-builder-command-injection-process-builder-critical-semgrep-locations.json) - java.lang.security.audit.command-injection-process-builder.command-injection-process-builder (2 files)
3. [Group 2 Locations](attachments/group-java-lang-security-audit-unsafe-reflection-unsafe-reflection-high-semgrep-locations.json) - java.lang.security.audit.unsafe-reflection.unsafe-reflection (13 files)
4. [Group 3 Locations](attachments/group-avoidthrowingrawexceptiontypes-medium-pmd-locations.json) - AvoidThrowingRawExceptionTypes (5326 files)
5. [Group 4 Locations](attachments/group-guardlogstatement-medium-pmd-locations.json) - GuardLogStatement (2369 files)
6. [Group 5 Locations](attachments/group-systemprintln-medium-pmd-locations.json) - SystemPrintln (741 files)
7. [Group 6 Locations](attachments/group-avoidusingvolatile-medium-pmd-locations.json) - AvoidUsingVolatile (361 files)
8. [Group 7 Locations](attachments/group-classwithonlyprivateconstructorsshouldbefinal-medium-pmd-locations.json) - ClassWithOnlyPrivateConstructorsShouldBeFinal (210 files)
9. [Group 8 Locations](attachments/group-avoidreassigningparameters-medium-pmd-locations.json) - AvoidReassigningParameters (187 files)
10. [Group 9 Locations](attachments/group-returnemptycollectionratherthannull-medium-pmd-locations.json) - ReturnEmptyCollectionRatherThanNull (126 files)
11. [Group 10 Locations](attachments/group-constructorcallsoverridablemethod-medium-pmd-locations.json) - ConstructorCallsOverridableMethod (58 files)
12. [Group 11 Locations](attachments/group-avoidthrowingnullpointerexception-medium-pmd-locations.json) - AvoidThrowingNullPointerException (19 files)
13. [Group 12 Locations](attachments/group-avoidbranchingstatementaslastinloop-medium-pmd-locations.json) - AvoidBranchingStatementAsLastInLoop (13 files)
14. [Group 13 Locations](attachments/group-avoidfilestream-medium-pmd-locations.json) - AvoidFileStream (11 files)
15. [Group 14 Locations](attachments/group-morethanonelogger-medium-pmd-locations.json) - MoreThanOneLogger (6 files)
16. [Group 15 Locations](attachments/group-singletonclassreturningnewinstance-medium-pmd-locations.json) - SingletonClassReturningNewInstance (4 files)
17. [Group 16 Locations](attachments/group-singlemethodsingleton-medium-pmd-locations.json) - SingleMethodSingleton (2 files)
18. [Group 17 Locations](attachments/group-abstractclasswithoutanymethod-medium-pmd-locations.json) - AbstractClassWithoutAnyMethod (1 files)

## 🔧 IDE Integration Files

**5 groups** support one-click fix in Cursor IDE:

1. [Fix Group 1](attachments/group-guardlogstatement-medium-pmd-cursor-fix.json) - GuardLogStatement
2. [Fix Group 2](attachments/group-systemprintln-medium-pmd-cursor-fix.json) - SystemPrintln
3. [Fix Group 3](attachments/group-avoidusingvolatile-medium-pmd-cursor-fix.json) - AvoidUsingVolatile
4. [Fix Group 4](attachments/group-classwithonlyprivateconstructorsshouldbefinal-medium-pmd-cursor-fix.json) - ClassWithOnlyPrivateConstructorsShouldBeFinal
5. [Fix Group 5](attachments/group-returnemptycollectionratherthannull-medium-pmd-cursor-fix.json) - ReturnEmptyCollectionRatherThanNull

**How to use**: Download the fix file and open in Cursor. Click "Apply All Fixes" to automatically fix all 3807 occurrences.

---

*Generated by CodeQual V9 - Grouped Report Format*  
*2025-10-13T20:00:23.943Z*