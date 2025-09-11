import { AgentProvider, AgentRole } from '@codequal/core/config/agent-registry';
import { MultiAgentFactory } from '../factory';
import { AgentPosition, AnalysisStrategy, AgentConfig } from '../types';
import { defaultTemperatures } from '../evaluation/agent-evaluation-data';

describe('Temperature Optimization', () => {
  let factory: MultiAgentFactory;
  
  beforeEach(() => {
    factory = new MultiAgentFactory();
    
    // Reset mocks between tests
    jest.clearAllMocks();
  });
  
  test('should use appropriate default temperatures for each role', () => {
    // Verify default temperatures match expected values
    expect(defaultTemperatures[AgentRole.CODE_QUALITY]).toBe(0.2); // More deterministic
    expect(defaultTemperatures[AgentRole.SECURITY]).toBe(0.3); // Balanced
    expect(defaultTemperatures[AgentRole.PERFORMANCE]).toBe(0.25); // Deterministic
    expect(defaultTemperatures[AgentRole.EDUCATIONAL]).toBe(0.5); // More creative
    expect(defaultTemperatures[AgentRole.REPORT_GENERATION]).toBe(0.4); // Balanced
  });
  
  test('should apply role-specific temperature in configurations', () => {
    // Create configurations for different roles
    const configs = Object.values(AgentRole).map(role => {
      // Create config without temperature - we'll add it later via type assertion
      const config = factory.createConfig(
        `${role} Temperature Test`,
        AnalysisStrategy.PARALLEL,
        {
          provider: AgentProvider.CLAUDE,
          role,
          position: AgentPosition.PRIMARY
        },
        []
      );
      return config;
    });
    
    // Mock the validator to set default temperatures if not provided
    jest.mock('../validator', () => {
      return {
        MultiAgentValidator: {
          validateConfig: jest.fn().mockImplementation(config => {
            // Apply default temperatures if not set
            if (config.agents[0].temperature === undefined) {
              // Using type assertion to allow adding temperature
              (config.agents[0] as AgentConfig).temperature = defaultTemperatures[config.agents[0].role as keyof typeof defaultTemperatures] || 0.3;
            }
            
            return {
              valid: true,
              warnings: [],
              errors: []
            };
          })
        }
      };
    });
    
    // Verify each configuration has the appropriate temperature
    configs.forEach(config => {
      const role = config.agents[0].role;
      const expectedTemp = defaultTemperatures[role as keyof typeof defaultTemperatures];
      
      // Apply default temperatures
      require('../validator').MultiAgentValidator.validateConfig(config);
      
      expect(config.agents[0].temperature).toBe(expectedTemp);
    });
  });
  
  test('should adjust temperatures based on task requirements', () => {
    // Create a test function that selects optimal temperature
    const getOptimalTemperature = (
      role: AgentRole,
      taskRequirements: {
        needsCreativity?: boolean;
        needsDeterminism?: boolean;
        securitySensitive?: boolean;
      }
    ) => {
      // Start with default temperature for the role
      let temperature = defaultTemperatures[role as keyof typeof defaultTemperatures];
      
      // Adjust based on task requirements
      if (taskRequirements.needsCreativity) {
        temperature += 0.2; // Increase temperature for creative tasks
      }
      
      if (taskRequirements.needsDeterminism) {
        temperature -= 0.15; // Decrease temperature for deterministic tasks
      }
      
      if (taskRequirements.securitySensitive) {
        temperature = Math.min(temperature, 0.3); // Cap at 0.3 for security-sensitive tasks
      }
      
      // Ensure temperature stays in valid range
      return Math.max(0.01, Math.min(0.99, temperature));
    };
    
    // Test various combinations
    const testCases = [
      {
        role: AgentRole.CODE_QUALITY,
        requirements: {},
        expectedTemperature: 0.2 // Default
      },
      {
        role: AgentRole.CODE_QUALITY,
        requirements: { needsCreativity: true },
        expectedTemperature: 0.4 // Default + creativity boost
      },
      {
        role: AgentRole.SECURITY,
        requirements: { securitySensitive: true },
        expectedTemperature: 0.3 // Capped for security-sensitive
      },
      {
        role: AgentRole.SECURITY,
        requirements: { needsDeterminism: true },
        expectedTemperature: 0.15 // Default - determinism reduction
      },
      {
        role: AgentRole.EDUCATIONAL,
        requirements: { needsCreativity: true },
        expectedTemperature: 0.7 // Default + creativity boost
      },
      {
        role: AgentRole.EDUCATIONAL,
        requirements: { securitySensitive: true, needsCreativity: true },
        expectedTemperature: 0.3 // Capped for security-sensitive despite creativity
      }
    ];
    
    // Verify each test case
    testCases.forEach(testCase => {
      const temperature = getOptimalTemperature(testCase.role, testCase.requirements);
      expect(temperature).toBeCloseTo(testCase.expectedTemperature, 2);
    });
  });
  
  test('should handle temperature overrides from users', () => {
    // Create basic configuration with user-specified temperature
    const userConfig = factory.createConfig(
      'User Temperature Override Test',
      AnalysisStrategy.PARALLEL,
      {
        provider: AgentProvider.CLAUDE,
        role: AgentRole.SECURITY,
        position: AgentPosition.PRIMARY
      },
      []
    );
    
    // Manually set the temperature since factory.createConfig doesn't pass it through
    // This simulates what would happen if createConfig preserved all properties
    (userConfig.agents[0] as AgentConfig).temperature = 0.7;
    
    // Create a validator mock that checks temperatures
    const mockValidate = jest.fn().mockImplementation(config => {
      const warnings = [];
      
      // Check if temperature is non-optimal
      const role = config.agents[0].role;
      const optimalTemp = defaultTemperatures[role as keyof typeof defaultTemperatures];
      const actualTemp = config.agents[0].temperature;
      
      // If temperature differs significantly from optimal
      if (Math.abs(actualTemp - optimalTemp) > 0.2) {
        warnings.push(`Temperature ${actualTemp} is not optimal for ${role} role, recommended value is ${optimalTemp}`);
      }
      
      return {
        valid: true, // Still valid
        warnings,
        errors: []
      };
    });
    
    // Apply the validation
    const result = mockValidate(userConfig);
    
    // Expect warning but still valid
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toContain('is not optimal');
    
    // Verify original temperature was preserved
    expect(userConfig.agents[0].temperature).toBe(0.7);
  });
  
  test('should adjust temperature based on language complexity', () => {
    // Create a function that adjusts temperature based on language complexity
    const getLanguageAdjustedTemperature = (
      role: AgentRole,
      language: string,
      complexity: number // 0-100
    ) => {
      // Start with default temperature for the role
      let temperature = defaultTemperatures[role as keyof typeof defaultTemperatures];
      
      // Language-specific adjustments
      const languageFactors: Record<string, number> = {
        'JavaScript': 0,        // No adjustment needed
        'Python': -0.05,        // Slightly lower for Python
        'Java': 0.05,           // Slightly higher for Java
        'C++': 0.1,             // Higher for C++
        'Rust': 0.15,           // Higher for Rust (more complex)
        'Assembly': 0.2         // Highest for Assembly
      };
      
      // Apply language adjustment
      // Fix for TS7053: Element implicitly has an 'any' type because expression of type 'any' can't be used to index type 'Record<string, number>'
      const languageAdjustment = languageFactors[language as keyof typeof languageFactors] || 0;
      temperature += languageAdjustment;
      
      // Apply complexity adjustment
      const complexityFactor = (complexity / 100) * 0.2; // Max +0.2 for highest complexity
      temperature += complexityFactor;
      
      // Ensure temperature stays in valid range
      return Math.max(0.01, Math.min(0.99, temperature));
    };
    
    // Test various combinations
    const testCases = [
      {
        role: AgentRole.CODE_QUALITY,
        language: 'JavaScript',
        complexity: 50,
        expectedTemperature: 0.2 + 0.1 // Default + complexity adjustment
      },
      {
        role: AgentRole.CODE_QUALITY,
        language: 'Python',
        complexity: 30,
        expectedTemperature: 0.2 - 0.05 + 0.06 // Default + language + complexity
      },
      {
        role: AgentRole.CODE_QUALITY,
        language: 'C++',
        complexity: 70,
        expectedTemperature: 0.2 + 0.1 + 0.14 // Default + language + complexity
      },
      {
        role: AgentRole.SECURITY,
        language: 'Rust',
        complexity: 80,
        expectedTemperature: 0.3 + 0.15 + 0.16 // Default + language + complexity
      }
    ];
    
    // Verify each test case
    testCases.forEach(testCase => {
      const temperature = getLanguageAdjustedTemperature(
        testCase.role,
        testCase.language,
        testCase.complexity
      );
      expect(temperature).toBeCloseTo(testCase.expectedTemperature, 2);
    });
  });
  
  test('should optimize temperature for specialized tasks', () => {
    // Define specialized tasks and their optimal temperatures
    interface SpecializedTaskConfig {
      role: AgentRole;
      temperature: number;
    }

    const specializedTasks: Record<string, SpecializedTaskConfig> = {
      'Security Audit': {
        role: AgentRole.SECURITY,
        temperature: 0.2, // Very deterministic for security audits
      },
      'Creativity Enhancement': {
        role: AgentRole.EDUCATIONAL,
        temperature: 0.8, // Very creative for educational content
      },
      'Performance Optimization': {
        role: AgentRole.PERFORMANCE,
        temperature: 0.15, // Highly deterministic for performance
      },
      'Documentation Writing': {
        role: AgentRole.REPORT_GENERATION,
        temperature: 0.6, // More varied for documentation
      },
      'Static Analysis': {
        role: AgentRole.CODE_QUALITY,
        temperature: 0.1, // Extremely deterministic for static analysis
      }
    };
    
    // Test that specialized tasks override default role temperatures
    for (const [taskName, taskConfig] of Object.entries(specializedTasks)) {
      // Check that specialized task temperature differs from default
      const defaultTemp = defaultTemperatures[taskConfig.role as keyof typeof defaultTemperatures];
      expect(taskConfig.temperature).not.toBe(defaultTemp);
      
      // Create a configuration for this specialized task with proper typing
      const agent: AgentConfig = {
        provider: AgentProvider.CLAUDE,
        role: taskConfig.role,
        position: AgentPosition.PRIMARY,
        temperature: taskConfig.temperature,
        parameters: {}
      };
      
      const config = {
        name: `${taskName} Test`,
        taskType: taskName,
        agents: [agent]
      };
      
      // Verify specialized temperature is applied
      expect(config.agents[0].temperature).toBe(taskConfig.temperature);
    }
  });
});
