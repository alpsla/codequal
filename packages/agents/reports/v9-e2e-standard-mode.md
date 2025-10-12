# Code Quality Analysis Report

**Repository**: apache/kafka  
**PR**: #17620  
**Decision**: ⛔ DECLINED (7 blocking issues)

---

## 📊 Executive Summary

**Total Issues**: 9,472 (17 unique types)

**By Severity**:
- 🔴 Critical: 2 (0.0%)
- 🟠 High: 13 (0.1%)
- 🟡 Medium: 9457 (99.8%)
- 🟢 Low: 0 (0.0%)

**By Category**:
- 🆕 NEW: 1746 (introduced in this PR)
- ⚠️  EXISTING_MODIFIED: 3 (pre-existing in modified files)
- ✅ RESOLVED: 2162 (fixed by this PR)
- 📝 EXISTING_REST: 5561 (pre-existing in unchanged files)

**Blocking Decision**:
- 7 blocking issues (NEW or EXISTING_MODIFIED with critical/high severity)
- ⛔ PR requires fixes before merge

**Analysis Results**:
- **17 issue groups** analyzed with AI
- **Cost savings**: $28.37 (99.8%)
- **Coverage**: 100% of detected issues

**IDE Integration**: 5 groups support one-click fix

## 🔴 Critical Issues (Immediate Action Required)

### 🔴 java.lang.security.audit.command-injection-process-builder.command-injection-process-builder
**Severity**: CRITICAL  
**Tool**: semgrep  
**Occurrences**: 2 files  
**Category**: EXISTING_MODIFIED  

**Description**: A formatted or concatenated string was detected as input to a ProcessBuilder call. This is dangerous if a variable is controlled by user input and could result in a command injection. Ensure your variables are not controlled by users or sufficiently sanitized.

**Example**:
- File: `trogdor/src/main/java/org/apache/kafka/trogdor/workload/ExternalCommandWorker.java`
- Line: 171

**Fix Recommendation**:
Validate and sanitize the command arguments in `ExternalCommandWorker.startProcess()` by implementing a whitelist of allowed commands and rejecting any user input containing shell metacharacters or path traversal sequences.

```java
// ❌ Before
N/A

// ✅ After
import java.util.Set;
import java.util.HashSet;
import java.util.regex.Pattern;
```

**All Occurrences**: 📎 [group-java-lang-security-audit-command-injection-process-builder-command-injection-process-builder-critical-semgrep-locations.json](attachments/group-java-lang-security-audit-command-injection-process-builder-command-injection-process-builder-critical-semgrep-locations.json) (2 files)

---


## 🟠 High Priority Issues

### 🟠 java.lang.security.audit.unsafe-reflection.unsafe-reflection
**Severity**: HIGH  
**Tool**: semgrep  
**Occurrences**: 13 files  
**Category**: NEW  

**Description**: If an attacker can supply values that the application then uses to determine which class to instantiate or which method to invoke, the potential exists for the attacker to create control flow paths through the application that were not intended by the application developers. This attack vector may allow the attacker to bypass authentication or access control checks or otherwise cause the application to behave in an unexpected manner.

**Example**:
- File: `clients/src/main/java/org/apache/kafka/common/utils/Utils.java`
- Line: 435

**Fix Recommendation**:
**BUG-108 FIX:**

```java
// ❌ Before
N/A

// ✅ After
import java.util.Set;
import java.util.HashSet;
import java.util.Collections;
```

**All Occurrences**: 📎 [group-java-lang-security-audit-unsafe-reflection-unsafe-reflection-high-semgrep-locations.json](attachments/group-java-lang-security-audit-unsafe-reflection-unsafe-reflection-high-semgrep-locations.json) (13 files)

---


## 🟡 Medium Priority Issues

### 🟡 AvoidThrowingRawExceptionTypes
**Severity**: MEDIUM  
**Tool**: PMD  
**Occurrences**: 5326 files  
**Category**: NEW  

**Description**: Avoid throwing raw exception types.

**Example**:
- File: `/workspace/clients/src/main/java/org/apache/kafka/clients/admin/DescribeConfigsResult.java`
- Line: 64

**All Occurrences**: 📎 [group-avoidthrowingrawexceptiontypes-medium-pmd-locations.json](attachments/group-avoidthrowingrawexceptiontypes-medium-pmd-locations.json) (5326 files)

---

### 🟡 GuardLogStatement
**Severity**: MEDIUM  
**Tool**: PMD  
**Occurrences**: 2369 files  
**Category**: NEW  
**IDE Fix**: ✅ One-click fix available ([Download for Cursor](attachments/group-guardlogstatement-medium-pmd-cursor-fix.json))  

**Description**: Logger calls should be surrounded by log level guards.

**Example**:
- File: `/workspace/clients/src/main/java/org/apache/kafka/clients/NetworkClient.java`
- Line: 364

**All Occurrences**: 📎 [group-guardlogstatement-medium-pmd-locations.json](attachments/group-guardlogstatement-medium-pmd-locations.json) (2369 files)

---

### 🟡 SystemPrintln
**Severity**: MEDIUM  
**Tool**: PMD  
**Occurrences**: 741 files  
**Category**: NEW  
**IDE Fix**: ✅ One-click fix available ([Download for Cursor](attachments/group-systemprintln-medium-pmd-cursor-fix.json))  

**Description**: System.out.println is used

**Example**:
- File: `/workspace/clients/src/main/java/org/apache/kafka/clients/admin/AdminClientConfig.java`
- Line: 300

**All Occurrences**: 📎 [group-systemprintln-medium-pmd-locations.json](attachments/group-systemprintln-medium-pmd-locations.json) (741 files)

---

### 🟡 AvoidUsingVolatile
**Severity**: MEDIUM  
**Tool**: PMD  
**Occurrences**: 361 files  
**Category**: NEW  
**IDE Fix**: ✅ One-click fix available ([Download for Cursor](attachments/group-avoidusingvolatile-medium-pmd-cursor-fix.json))  

**Description**: Use of modifier volatile is not recommended.

**Example**:
- File: `/workspace/clients/src/main/java/org/apache/kafka/clients/admin/KafkaAdminClient.java`
- Line: 1143

**All Occurrences**: 📎 [group-avoidusingvolatile-medium-pmd-locations.json](attachments/group-avoidusingvolatile-medium-pmd-locations.json) (361 files)

---

### 🟡 ClassWithOnlyPrivateConstructorsShouldBeFinal
**Severity**: MEDIUM  
**Tool**: PMD  
**Occurrences**: 210 files  
**Category**: NEW  
**IDE Fix**: ✅ One-click fix available ([Download for Cursor](attachments/group-classwithonlyprivateconstructorsshouldbefinal-medium-pmd-cursor-fix.json))  

**Description**: A class which only has private constructors should be final

**Example**:
- File: `/workspace/clients/src/main/java/org/apache/kafka/clients/admin/NewPartitions.java`
- Line: 31

**All Occurrences**: 📎 [group-classwithonlyprivateconstructorsshouldbefinal-medium-pmd-locations.json](attachments/group-classwithonlyprivateconstructorsshouldbefinal-medium-pmd-locations.json) (210 files)

---

### 🟡 AvoidReassigningParameters
**Severity**: MEDIUM  
**Tool**: PMD  
**Occurrences**: 187 files  
**Category**: NEW  

**Description**: Avoid reassigning parameters such as 'currentBatch'

**Example**:
- File: `/workspace/clients/src/main/java/org/apache/kafka/clients/consumer/internals/Acknowledgements.java`
- Line: 211

**All Occurrences**: 📎 [group-avoidreassigningparameters-medium-pmd-locations.json](attachments/group-avoidreassigningparameters-medium-pmd-locations.json) (187 files)

---

### 🟡 ReturnEmptyCollectionRatherThanNull
**Severity**: MEDIUM  
**Tool**: PMD  
**Occurrences**: 126 files  
**Category**: NEW  
**IDE Fix**: ✅ One-click fix available ([Download for Cursor](attachments/group-returnemptycollectionratherthannull-medium-pmd-cursor-fix.json))  

**Description**: Return an empty collection rather than null.

**Example**:
- File: `/workspace/clients/src/main/java/org/apache/kafka/clients/consumer/internals/CompletedFetch.java`
- Line: 371

**All Occurrences**: 📎 [group-returnemptycollectionratherthannull-medium-pmd-locations.json](attachments/group-returnemptycollectionratherthannull-medium-pmd-locations.json) (126 files)

---

### 🟡 ConstructorCallsOverridableMethod
**Severity**: MEDIUM  
**Tool**: PMD  
**Occurrences**: 58 files  
**Category**: NEW  

**Description**: Overridable method 'newSender' called during object construction

**Example**:
- File: `/workspace/clients/src/main/java/org/apache/kafka/clients/producer/KafkaProducer.java`
- Line: 466

**All Occurrences**: 📎 [group-constructorcallsoverridablemethod-medium-pmd-locations.json](attachments/group-constructorcallsoverridablemethod-medium-pmd-locations.json) (58 files)

---

### 🟡 AvoidThrowingNullPointerException
**Severity**: MEDIUM  
**Tool**: PMD  
**Occurrences**: 42 files  
**Category**: NEW  

**Description**: Avoid throwing null pointer exceptions.

**Example**:
- File: `/workspace/streams/src/main/java/org/apache/kafka/streams/kstream/WindowedSerdes.java`
- Line: 74

**All Occurrences**: 📎 [group-avoidthrowingnullpointerexception-medium-pmd-locations.json](attachments/group-avoidthrowingnullpointerexception-medium-pmd-locations.json) (42 files)

---

### 🟡 AvoidBranchingStatementAsLastInLoop
**Severity**: MEDIUM  
**Tool**: PMD  
**Occurrences**: 13 files  
**Category**: NEW  

**Description**: Avoid using a branching statement as the last in a loop.

**Example**:
- File: `/workspace/clients/src/main/java/org/apache/kafka/clients/admin/KafkaAdminClient.java`
- Line: 1327

**All Occurrences**: 📎 [group-avoidbranchingstatementaslastinloop-medium-pmd-locations.json](attachments/group-avoidbranchingstatementaslastinloop-medium-pmd-locations.json) (13 files)

---

### 🟡 AvoidFileStream
**Severity**: MEDIUM  
**Tool**: PMD  
**Occurrences**: 11 files  
**Category**: NEW  

**Description**: Avoid instantiating FileInputStream, FileOutputStream, FileReader, or FileWriter

**Example**:
- File: `/workspace/raft/src/main/java/org/apache/kafka/raft/FileQuorumStateStore.java`
- Line: 173

**All Occurrences**: 📎 [group-avoidfilestream-medium-pmd-locations.json](attachments/group-avoidfilestream-medium-pmd-locations.json) (11 files)

---

### 🟡 MoreThanOneLogger
**Severity**: MEDIUM  
**Tool**: PMD  
**Occurrences**: 6 files  
**Category**: NEW  

**Description**: Class contains more than one logger.

**Example**:
- File: `/workspace/metadata/src/main/java/org/apache/kafka/metadata/authorizer/StandardAuthorizerData.java`
- Line: 64

**All Occurrences**: 📎 [group-morethanonelogger-medium-pmd-locations.json](attachments/group-morethanonelogger-medium-pmd-locations.json) (6 files)

---

### 🟡 SingletonClassReturningNewInstance
**Severity**: MEDIUM  
**Tool**: PMD  
**Occurrences**: 4 files  
**Category**: NEW  

**Description**: getInstance method always creates a new object and hence does not comply to Singleton Design Pattern behaviour. Please review

**Example**:
- File: `/workspace/share/src/main/java/org/apache/kafka/server/share/SharePartitionKey.java`
- Line: 68

**All Occurrences**: 📎 [group-singletonclassreturningnewinstance-medium-pmd-locations.json](attachments/group-singletonclassreturningnewinstance-medium-pmd-locations.json) (4 files)

---

### 🟡 SingleMethodSingleton
**Severity**: MEDIUM  
**Tool**: PMD  
**Occurrences**: 2 files  
**Category**: NEW  

**Description**: Class contains multiple getInstance methods. Please review.

**Example**:
- File: `/workspace/share/src/main/java/org/apache/kafka/server/share/SharePartitionKey.java`
- Line: 30

**All Occurrences**: 📎 [group-singlemethodsingleton-medium-pmd-locations.json](attachments/group-singlemethodsingleton-medium-pmd-locations.json) (2 files)

---

### 🟡 AbstractClassWithoutAnyMethod
**Severity**: MEDIUM  
**Tool**: PMD  
**Occurrences**: 1 files  
**Category**: NEW  

**Description**: No abstract method which means that the keyword is most likely used to prevent instantiation. Use a private or protected constructor instead.

**Example**:
- File: `/workspace/clients/src/main/java/org/apache/kafka/common/KafkaFuture.java`
- Line: 56

**All Occurrences**: 📎 [group-abstractclasswithoutanymethod-medium-pmd-locations.json](attachments/group-abstractclasswithoutanymethod-medium-pmd-locations.json) (1 files)

---


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
12. [Group 11 Locations](attachments/group-avoidthrowingnullpointerexception-medium-pmd-locations.json) - AvoidThrowingNullPointerException (42 files)
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
*2025-10-12T15:44:59.142Z*