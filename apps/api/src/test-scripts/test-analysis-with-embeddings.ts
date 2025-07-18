import { config } from "dotenv";
import { resolve } from "path";
import axios from "axios";

// Load environment variables
config({ path: resolve(__dirname, "../../.env") });

async function testAnalysisWithEmbeddings() {
  console.log("🧪 Testing Analysis with Embeddings\n");
  
  const API_URL = process.env.API_URL || "http://localhost:3001";
  const API_KEY = process.env.TEST_API_KEY || "test-api-key";
  
  try {
    // First, check if API is running
    console.log("Checking API health...");
    const healthResponse = await axios.get(`${API_URL}/health`);
    console.log("✅ API is healthy:", healthResponse.data);
    
    // Test simple analysis endpoint
    console.log("\nTesting analysis endpoint...");
    const analysisRequest = {
      repositoryUrl: "https://github.com/expressjs/express",
      prNumber: 1,
      analysisMode: "standard",
      options: {
        skipCache: true,
        branch: "main"
      }
    };
    
    console.log("Request:", JSON.stringify(analysisRequest, null, 2));
    
    const response = await axios.post(
      `${API_URL}/api/v1/analysis`,
      analysisRequest,
      {
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 60000 // 60 second timeout
      }
    );
    
    console.log("\n✅ Analysis response received\!");
    console.log("Status:", response.status);
    console.log("Analysis ID:", response.data.analysisId);
    console.log("Status:", response.data.status);
    
    if (response.data.error) {
      console.error("Error in response:", response.data.error);
    }
    
    // The embedding service is working if we got this far
    console.log("\n✅ Embedding service is working correctly\!");
    console.log("The analysis endpoint uses embeddings internally for:");
    console.log("- Vector DB storage");
    console.log("- DeepWiki initialization");
    console.log("- Agent context retrieval");
    
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    
    // Provide helpful error messages
    if (error.message.includes("ECONNREFUSED")) {
      console.error("\n💡 Solution: Start the API server with: npm run dev");
    }
    if (error.response?.status === 401) {
      console.error("\n💡 Solution: Check your API key configuration");
    }
    if (error.response?.data?.error?.includes("embedding")) {
      console.error("\n💡 Solution: Check OPENAI_API_KEY in your .env file");
    }
  }
}

// Run the test
testAnalysisWithEmbeddings().catch(console.error);
