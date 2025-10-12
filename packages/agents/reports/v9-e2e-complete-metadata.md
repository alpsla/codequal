# Code Quality Analysis Report

**Repository**: apache/kafka  
**PR**: #17620  
**Decision**: ⛔ DECLINED (7 blocking issues)

---

## 📊 Executive Summary

**Total Issues**: 9,453 (17 unique types)

**By Severity**:
- 🔴 Critical: 2 (0.0%)
- 🟠 High: 13 (0.1%)
- 🟡 Medium: 9438 (99.8%)
- 🟢 Low: 0 (0.0%)

**By Category**:
- 🆕 NEW: 1746 (introduced in this PR)
- ⚠️  EXISTING_MODIFIED: 3 (pre-existing in modified files)
- ✅ RESOLVED: 2143 (fixed by this PR)
- 📝 EXISTING_REST: 5561 (pre-existing in unchanged files)

**Blocking Decision**:
- 7 blocking issues (NEW or EXISTING_MODIFIED with critical/high severity)
- ⛔ PR requires fixes before merge

**Analysis Results**:
- **17 issue groups** analyzed with AI
- **Cost savings**: $28.31 (99.8%)
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
Validate and sanitize the command arguments in `ExternalCommandWorker.startProcess()` by implementing a whitelist of allowed commands and rejecting any user-controlled input containing shell metacharacters or path traversal sequences.

```java
// Recommended fix:
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


```java
// Recommended fix:
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

**Fix Recommendation**:
```java
package org.apache.kafka.clients.admin;

```java
// Recommended fix:
package org.apache.kafka.clients.admin;

import java.util.concurrent.ExecutionException; // Required import for specific exception

public class DescribeConfigsResult {
    // ... (other methods and fields)

    public Config findConfig(String name) throws InterruptedException, ExecutionException {
        // Original: return all().get().get(name);
        // Improved:
        return all.get().get(name);
    }

    // ... (other methods and fields)
}
```

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

**Fix Recommendation**:
1.  Improvement: Surround `log.debug` call with `log.isDebugEnabled()` guard.

```java
// Recommended fix:
if (log.isDebugEnabled()) {
        log.debug("Completed connection to node {}. Ready to send requests.", node.id());
    }
```

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

**Fix Recommendation**:
1.  **Improvement:** Replace `System.out.println` with a structured logging framework. Use `log.debug()` or `log.info()`.

```java
// Recommended fix:
import org.slf4j.Logger;
    import org.slf4j.LoggerFactory;
```

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

**Fix Recommendation**:
1. **Improvement:** Replace `volatile` with `AtomicBoolean` for `running` flag.

```java
// Recommended fix:
import java.util.concurrent.atomic.AtomicBoolean;
```

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

**Fix Recommendation**:
1.  Improvement: Declare `NewPartitions` class as `final`.

```java
// Recommended fix:
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

**Fix Recommendation**:
1.  **Improvement:** Introduce a new local variable `nextBatch` to hold the updated value instead of reassigning `currentBatch`.

```java
// Recommended fix:
// Original line: currentBatch = new Batch(currentBatch.topicPartition, currentBatch.baseOffset, currentBatch.lastOffset, currentBatch.sizeInBytes + sizeInBytes, currentBatch.records);
    Batch nextBatch = new Batch(currentBatch.topicPartition, currentBatch.baseOffset, currentBatch.lastOffset, currentBatch.sizeInBytes + sizeInBytes, currentBatch.records);
    this.batches.put(currentBatch.topicPartition, nextBatch);
```

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

**Fix Recommendation**:
```java
import java.util.Collections;
import java.util.List;
import org.apache.kafka.common.record.RecordBatch;

```java
// Recommended fix:
import java.util.Collections;
import java.util.List;
import org.apache.kafka.common.record.RecordBatch;

// ... other imports

public class CompletedFetch {

    // ... existing code

    /**
     * Get the record batches from the completed fetch.
     *
     * @return The record batches, or an empty list if there are no batches.
     */
    public List<RecordBatch> getRecordBatches() {
        if (batches == null) {
            return Collections.emptyList();
        }
        return batches;
    }

    // ... existing code
}
```

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

**Fix Recommendation**:
1. **Improvement:**
   - Introduce a private helper method `createNewSender` to encapsulate the `new Sender` instantiation.
   - Call `createNewSender` from the constructor instead of directly `new Sender`.

```java
// Recommended fix:
// Existing class and constructor
   public class KafkaProducer<K, V> implements Producer<K, V> {
       private final Sender newSender; // Renamed from 'sender' for clarity if it's the result of 'newSender' method

       public KafkaProducer(Map<String, Object> configs, Serializer<K> keySerializer, Serializer<V> valueSerializer) {
           // ... other constructor logic ...
           this.newSender = createNewSender(logContext, metrics, time, metadata, recordAccumulator, client, metricsRegistry,
                                            transactionManager, apiVersions, senderMetricsRegistry);
           // ... rest of constructor ...
       }

       // Private helper method
       private Sender createNewSender(LogContext logContext, Metrics metrics, Time time, Metadata metadata,
                                      RecordAccumulator recordAccumulator, KafkaClient client, SenderMetricsRegistry metricsRegistry,
                                      TransactionManager transactionManager, ApiVersions apiVersions, SenderMetricsRegistry senderMetricsRegistry) {
           return new Sender(logContext, client, metadata, recordAccumulator, metrics, time,
                             "KafkaProducer", metricsRegistry, transactionManager, apiVersions);
       }

       // Original overridable method (if it exists and is intended for external override, otherwise consider making it private or removing)
       // If 'newSender' was intended as a factory method for subclasses, it should be called *after* construction is complete,
       // or the constructor should take a Sender instance.
       // For this specific bug, the issue is calling an overridable method *during* construction.
       // If the original 'newSender' method was meant to be overridable, this fix prevents the constructor from calling it.
       // If it was just a poorly named private helper, then the above refactoring is sufficient.
       // Assuming the original 'newSender' was the overridable method that was being called.
       // If this method is still needed for external overriding, it should not be called by the constructor.
       // If it's not needed for external overriding, it should be private.
       // For the purpose of fixing the "overridable method called during construction" bug:
       // The constructor now calls the private `createNewSender` instead of the potentially overridable `newSender`.
       // The original `newSender` method (if it exists) is no longer called by the constructor.
       // If the original `newSender` method was intended as a factory for subclasses, it would look like this:
       // protected Sender newSender(LogContext logContext, KafkaClient client, Metadata metadata,
       //                            RecordAccumulator recordAccumulator, Metrics metrics, Time time,
       //                            String clientId, SenderMetricsRegistry metricsRegistry,
       //                            TransactionManager transactionManager, ApiVersions apiVersions) {
       //     return new Sender(logContext, client, metadata, recordAccumulator, metrics, time,
       //                       clientId, metricsRegistry, transactionManager, apiVersions);
       // }
       // This protected method would *not* be called by the constructor in the fix.
   }
```

**All Occurrences**: 📎 [group-constructorcallsoverridablemethod-medium-pmd-locations.json](attachments/group-constructorcallsoverridablemethod-medium-pmd-locations.json) (58 files)

---

### 🟡 AvoidThrowingNullPointerException
**Severity**: MEDIUM  
**Tool**: PMD  
**Occurrences**: 23 files  
**Category**: NEW  

**Description**: Avoid throwing null pointer exceptions.

**Example**:
- File: `/workspace/streams/src/main/java/org/apache/kafka/streams/kstream/WindowedSerdes.java`
- Line: 74

**Fix Recommendation**:
```java
import java.util.Objects;

```java
// Recommended fix:
import java.util.Objects;

// ... other imports

public class WindowedSerdes {
    // ... other methods

    static public final class SessionWindowedSerde<T> extends WrapperSerde<Windowed<T>> {
        public SessionWindowedSerde(final Serde<T> inner) {
            super(new SessionWindowedSerializer<>(Objects.requireNonNull(inner.serializer(), "Inner serializer cannot be null.")),
                  new SessionWindowedDeserializer<>(Objects.requireNonNull(inner.deserializer(), "Inner deserializer cannot be null.")));
        }
    }

    // ... other methods
}
```

**All Occurrences**: 📎 [group-avoidthrowingnullpointerexception-medium-pmd-locations.json](attachments/group-avoidthrowingnullpointerexception-medium-pmd-locations.json) (23 files)

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

**Fix Recommendation**:
1. **Improvement:** Refactor the loop to avoid `break` as the last statement.
2. **Required imports:** None
3. **Clean code example:**

```java
// Recommended fix:
// Original code snippet (for context, not part of the solution)
// for (int i = 0; i < numNodes; i++) {
//     Node node = nodes.get(i);
//     if (node.id() == brokerId) {
//         brokerNode = node;
//         break; // Branching statement as the last in a loop
//     }
// }

// Replacement
Node brokerNode = nodes.stream()
                     .filter(node -> node.id() == brokerId)
                     .findFirst()
                     .orElse(null); // Or throw an exception if brokerId must exist
```

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

**Fix Recommendation**:
1. **Improvement:** Use `Files.newInputStream`, `Files.newOutputStream`, `Files.newBufferedReader`, or `Files.newBufferedWriter` with `Path`.

```java
// Recommended fix:
import java.nio.file.Files;
   import java.nio.file.Path;
   import java.io.IOException;
   import java.io.InputStream;
   import java.io.OutputStream;
   import java.io.BufferedReader;
   import java.io.BufferedWriter;
   import java.nio.charset.StandardCharsets; // For readers/writers
```

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

**Fix Recommendation**:
1. **Improvement:** Consolidate to a single `LOGGER` instance.
2. **Required imports:** None (assuming `org.slf4j.Logger` and `org.slf4j.LoggerFactory` are already imported).
3. **Clean code example:**

```java
// Recommended fix:
public final class StandardAuthorizerData {
       private static final Logger LOGGER = LoggerFactory.getLogger(StandardAuthorizerData.class);

       private final Map<String, AclData> resourceToAcls;
       private final Map<String, Set<String>> resourceNameToResourceTypes;
       private final Map<String, Set<String>> resourceTypeToResourceNames;
       private final Map<String, Set<String>> principalToResourceNames;
       private final Map<String, Set<String>> hostToResourceNames;

       // ... rest of the class
   }
```

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

**Fix Recommendation**:
```java
package org.apache.kafka.server.share;

```java
// Recommended fix:
package org.apache.kafka.server.share;

import java.nio.ByteBuffer;
import java.util.Objects;

public class SharePartitionKey {

    private static volatile SharePartitionKey instance; // Use 'instance' for the singleton object
    private final String resourceName;
    private final ByteBuffer key;

    private SharePartitionKey(String resourceName, ByteBuffer key) {
        this.resourceName = resourceName;
        this.key = key;
    }

    public static SharePartitionKey getInstance(String resourceName, ByteBuffer key) {
        if (instance == null) {
            synchronized (SharePartitionKey.class) {
                if (instance == null) {
                    instance = new SharePartitionKey(resourceName, key);
                }
            }
        }
        return instance;
    }

    public String resourceName() {
        return resourceName;
    }

    public ByteBuffer key() {
        return key;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SharePartitionKey that = (SharePartitionKey) o;
        return Objects.equals(resourceName, that.resourceName) && Objects.equals(key, that.key);
    }

    @Override
    public int hashCode() {
        return Objects.hash(resourceName, key);
    }

    @Override
    public String toString() {
        return "SharePartitionKey(" +
               "resourceName='" + resourceName + '\'' +
               ", key=" + key +
               ')';
    }
}
```

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

**Fix Recommendation**:
1.  **Improvement:** Rename `getInstance` methods to reflect their specific creation purpose.

```java
// Recommended fix:
package org.apache.kafka.server.share;

    import org.apache.kafka.common.TopicPartition;

    public class SharePartitionKey {

        private final String shareSessionId;
        private final TopicPartition topicPartition;

        private SharePartitionKey(String shareSessionId, TopicPartition topicPartition) {
            this.shareSessionId = shareSessionId;
            this.topicPartition = topicPartition;
        }

        public static SharePartitionKey fromSessionIdAndTopicPartition(String shareSessionId, TopicPartition topicPartition) {
            return new SharePartitionKey(shareSessionId, topicPartition);
        }

        public static SharePartitionKey fromString(String keyString) {
            // Assuming keyString is in a format like "sessionId:topic:partition"
            String[] parts = keyString.split(":");
            if (parts.length != 3) {
                throw new IllegalArgumentException("Invalid SharePartitionKey string format: " + keyString);
            }
            String sessionId = parts[0];
            String topic = parts[1];
            int partition = Integer.parseInt(parts[2]);
            return new SharePartitionKey(sessionId, new TopicPartition(topic, partition));
        }

        public String shareSessionId() {
            return shareSessionId;
        }

        public TopicPartition topicPartition() {
            return topicPartition;
        }

        @Override
        public String toString() {
            return shareSessionId + ":" + topicPartition.topic() + ":" + topicPartition.partition();
        }

        // hashCode and equals methods should also be implemented
        @Override
        public int hashCode() {
            int result = shareSessionId.hashCode();
            result = 31 * result + topicPartition.hashCode();
            return result;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            SharePartitionKey that = (SharePartitionKey) o;
            return shareSessionId.equals(that.shareSessionId) &&
                   topicPartition.equals(that.topicPartition);
        }
    }
```

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

**Fix Recommendation**:
1. Improvement: Change `private KafkaFuture()` to `protected KafkaFuture()`.
2. No imports needed.
3. Clean code example:

```java
// Recommended fix:
package org.apache.kafka.common;

public abstract class KafkaFuture<T> {

    protected KafkaFuture() {
    }

    public static <T> KafkaFuture<T> completedFuture(T value) {
        return new CompletedFuture<>(value);
    }

    public static <T> KafkaFuture<T> failedFuture(Throwable exception) {
        return new FailedFuture<>(exception);
    }

    // ... rest of the class
}
```

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
12. [Group 11 Locations](attachments/group-avoidthrowingnullpointerexception-medium-pmd-locations.json) - AvoidThrowingNullPointerException (23 files)
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
*2025-10-12T16:47:57.404Z*