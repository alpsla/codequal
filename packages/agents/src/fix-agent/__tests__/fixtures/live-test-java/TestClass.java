/**
 * Live Test Java File for Tier 2 Native Fixer Validation
 *
 * This file contains INTENTIONAL issues that should be fixed by various tiers:
 *
 * Tier 1 (google-java-format):
 * - Inconsistent indentation
 * - Missing/extra whitespace
 * - Brace placement
 * - Import formatting
 *
 * Tier 2 (Sorald):
 * - S1155: Use isEmpty() instead of size() == 0
 * - S2095: Resources should be closed (try-with-resources)
 * - S1132: String literals should be on the left side of equals()
 *
 * Tier 3 (AI Required - PMD rules):
 * - UselessParentheses: Remove unnecessary parentheses
 * - AvoidDollarSigns: Identifier names should not contain dollar signs
 * - CloseResource: Ensure resources are properly closed
 * - EmptyCatchBlock: Empty catch blocks should have comment or handling
 *
 * DO NOT manually fix these issues - they are test fixtures.
 */
package com.codequal.fixtures;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class TestClass {

    // Tier 3 (PMD): AvoidDollarSigns - identifier contains $
    private String $internalValue;
    private int item$Count;

    // Tier 1: Bad formatting - inconsistent spacing and indentation
    public TestClass(String value,int count){
        this.$internalValue=value;
        this.item$Count=count;
    }

    // Tier 2 (Sorald S1155): Use isEmpty() instead of size() == 0
    public boolean isListEmpty(List<String> items) {
        // S1155: should use items.isEmpty() instead
        if (items.size() == 0) {
            return true;
        }
        return false;
    }

    // Tier 2 (Sorald S1155): Another isEmpty pattern
    public boolean hasNoElements(ArrayList<Integer> numbers) {
        // S1155: should use numbers.isEmpty()
        return numbers.size() == 0;
    }

    // Tier 2 (Sorald S1155): Map isEmpty check
    public boolean isMapPopulated(Map<String, Object> data) {
        // S1155: should use !data.isEmpty()
        if (data.size() != 0) {
            return true;
        }
        return false;
    }

    // Tier 2 (Sorald S1132): String literals should be on left of equals
    public boolean checkStatus(String status) {
        // S1132: "active" should be on the left side
        if (status.equals("active")) {
            return true;
        }
        // S1132: "pending" should be on the left side
        if (status.equals("pending")) {
            return true;
        }
        return false;
    }

    // Tier 3 (PMD): UselessParentheses - unnecessary parentheses
    public int calculate(int a, int b) {
        // PMD UselessParentheses: extra parentheses around expressions
        int result = ((a + b));
        int multiplied = ((result) * 2);
        int divided = (((a + b) / 2));
        return ((result + multiplied + divided));
    }

    // Tier 3 (PMD): EmptyCatchBlock - catch block is empty
    public String readFileContent(String path) {
        String content = "";
        try {
            // Tier 2 (Sorald S2095): Resource should be in try-with-resources
            BufferedReader reader = new BufferedReader(new FileReader(path));
            String line;
            while ((line = reader.readLine()) != null) {
                content += line;
            }
            reader.close();
        } catch (IOException e) {
            // PMD EmptyCatchBlock: empty catch block - should log or rethrow
        }
        return content;
    }

    // Tier 3 (PMD): CloseResource - resource not properly closed
    public byte[] readBytes(String filePath) {
        byte[] data = null;
        try {
            // PMD CloseResource: FileInputStream not closed properly
            FileInputStream fis = new FileInputStream(filePath);
            data = new byte[fis.available()];
            fis.read(data);
            // Missing: fis.close() or should use try-with-resources
        } catch (IOException e) {
            System.err.println("Error reading file: " + e.getMessage());
        }
        return data;
    }

    // Tier 1: Bad formatting - poor brace placement and spacing
    public void badlyFormattedMethod(String input,int count,boolean flag){
        if(flag){
            for(int i=0;i<count;i++){
                System.out.println(input+":"+i);
            }
        }else{
            System.out.println("Flag is false");
        }
    }

    // Tier 3 (PMD): Multiple UselessParentheses
    public boolean complexCondition(int x, int y, int z) {
        // PMD UselessParentheses: unnecessary parentheses in boolean expression
        if (((x > 0)) && ((y > 0)) || ((z < 0))) {
            return ((true));
        }
        return ((false));
    }

    // Tier 2 (Sorald S2095): InputStream resource leak
    public int countLines(File file) {
        int lineCount = 0;
        try {
            // S2095: Should use try-with-resources
            InputStream is = new FileInputStream(file);
            BufferedReader reader = new BufferedReader(new java.io.InputStreamReader(is));
            while (reader.readLine() != null) {
                lineCount++;
            }
            // Resources not properly closed
        } catch (IOException e) {
            // PMD EmptyCatchBlock
        }
        return lineCount;
    }

    // Tier 3 (PMD): AvoidDollarSigns in method parameters
    public void processData(String $data, int $count) {
        // PMD AvoidDollarSigns: parameter names contain $
        for (int $i = 0; $i < $count; $i++) {
            System.out.println($data);
        }
    }

    // Tier 2 (Sorald S1132): Multiple equals comparisons with string literals
    public String categorize(String input) {
        // S1132: All string comparisons have literal on wrong side
        if (input.equals("category_a")) {
            return "A";
        } else if (input.equals("category_b")) {
            return "B";
        } else if (input.equals("category_c")) {
            return "C";
        }
        return "Unknown";
    }

    // Tier 1: Bad formatting - inconsistent indentation and spacing
    public List<String> filterList(List<String>items,String prefix){
        List<String>result=new ArrayList<>();
        for(String item:items){
            if(item.startsWith(prefix)){
                result.add(item);
            }
        }
        return result;
    }

    // Tier 2 (Sorald S1155): Collection size check in loop condition
    public void processItems(List<String> items) {
        // S1155: should use !items.isEmpty() instead of items.size() > 0
        while (items.size() > 0) {
            String item = items.remove(0);
            System.out.println("Processing: " + item);
        }
    }

    // Tier 3 (PMD): Combined issues - UselessParentheses and poor formatting
    public int computeScore(int base,int bonus,int penalty){
        int score=((base+bonus)-penalty);
        if(((score)<0)){
            score=((0));
        }
        return ((score));
    }

    // Tier 3 (PMD): Empty catch block with resource issues
    public Map<String, String> loadProperties(String path) {
        Map<String, String> props = new HashMap<>();
        try {
            // PMD CloseResource + S2095: FileInputStream not in try-with-resources
            FileInputStream fis = new FileInputStream(path);
            java.util.Properties p = new java.util.Properties();
            p.load(fis);
            for (String name : p.stringPropertyNames()) {
                props.put(name, p.getProperty(name));
            }
        } catch (IOException e) {
            // PMD EmptyCatchBlock: should handle or log exception
        }
        return props;
    }

    // Getter with bad formatting
    public String get$InternalValue(){return this.$internalValue;}

    // Setter with bad formatting
    public void set$InternalValue(String value){this.$internalValue=value;}

    // Getter for item count with dollar sign
    public int getItem$Count(){return this.item$Count;}
}
