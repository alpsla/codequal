# Oracle A1.Flex PMD Test Instructions

## Quick Deploy & Run

### Option 1: Direct SSH and Run
```bash
# Connect to Oracle instance
ssh -i /Users/alpinro/Code\ Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key opc@129.213.49.128

# Once connected, create and run the test script
cat > /tmp/run-pmd-test.sh << 'EOF'
[Paste the content of oracle-pmd-test.sh here]
EOF

chmod +x /tmp/run-pmd-test.sh
/tmp/run-pmd-test.sh
```

### Option 2: SCP and Execute
```bash
# Copy the test script
scp -i /Users/alpinro/Code\ Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key \
    oracle-pmd-test.sh opc@129.213.49.128:/tmp/

# Connect and run
ssh -i /Users/alpinro/Code\ Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key \
    opc@129.213.49.128 "chmod +x /tmp/oracle-pmd-test.sh && /tmp/oracle-pmd-test.sh"
```

### Option 3: One-Line Remote Execution
```bash
# Run test directly (may timeout for long tests)
ssh -i /Users/alpinro/Code\ Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key \
    opc@129.213.49.128 'bash -s' < oracle-pmd-test.sh
```

## Monitor Progress

### Watch in Real-Time
```bash
ssh -i /Users/alpinro/Code\ Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key \
    opc@129.213.49.128 "tail -f /tmp/oracle-pmd-test-results.txt"
```

### Check Docker Status
```bash
ssh -i /Users/alpinro/Code\ Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key \
    opc@129.213.49.128 "docker ps"
```

### Monitor System Resources
```bash
ssh -i /Users/alpinro/Code\ Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key \
    opc@129.213.49.128 "htop"
```

## Expected Results

### Configuration
- **Strategy:** Balanced (4 parallel batches)
- **Files per batch:** 300
- **PMD threads:** 3 per batch
- **Total files:** ~3,488

### Performance Targets
- **Simulated:** 17.4 seconds
- **Expected:** 20-30 seconds
- **Acceptable:** < 60 seconds

### Success Criteria
- ✅ Sub-30 second analysis
- ✅ All files processed
- ✅ No OOM errors
- ✅ Stable throughput

## Troubleshooting

### If Docker Image Not Found
```bash
# Login to Oracle registry
docker login iad.ocir.io

# Pull manually
docker pull iad.ocir.io/idzaw9ddo1h5/codequal-analyzers/analyzer:lang-java-v5.1-arm
```

### If Repository Clone Fails
```bash
# Check disk space
df -h

# Clean up old files
rm -rf /tmp/kafka-repo
rm -rf /tmp/pmd-*
```

### If Performance is Slow
1. Check CPU usage: `top`
2. Check memory: `free -h`
3. Check Docker: `docker stats`
4. Reduce parallel batches to 2
5. Increase PMD threads to 4

## Results Location

After the test completes, results will be in:
- `/tmp/oracle-pmd-test-results.txt` - Summary
- `/tmp/pmd-output-*.txt` - Individual batch outputs (cleaned up after test)

## Quick Copy Results Back
```bash
# Copy results to local machine
scp -i /Users/alpinro/Code\ Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key \
    opc@129.213.49.128:/tmp/oracle-pmd-test-results.txt \
    ./oracle-results-$(date +%Y%m%d-%H%M%S).txt
```

---

**Ready to test!** Use Option 2 (SCP and Execute) for best results.