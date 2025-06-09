// Script to generate mock DeepWiki report data
const mockDeepWikiReport = {
  repositoryUrl: 'https://github.com/facebook/react',
  repositoryName: 'facebook/react',
  analysisDate: new Date().toISOString(),
  summary: {
    overview: 'React is a JavaScript library for building user interfaces...',
    keyTechnologies: ['JavaScript', 'TypeScript', 'JSX'],
    architecture: 'Component-based architecture with virtual DOM...',
    teamSize: 'Large',
    complexity: 'High'
  },
  sections: {
    'Security Analysis': {
      content: 'Security analysis of the React repository...',
      findings: ['XSS prevention built-in', 'Content Security Policy support'],
      score: 8.5
    },
    'Architecture Overview': {
      content: 'React uses a component-based architecture...',
      patterns: ['Component Pattern', 'Virtual DOM', 'Hooks'],
      score: 9.0
    },
    'Code Quality': {
      content: 'High code quality with comprehensive test coverage...',
      metrics: { testCoverage: 85, lintScore: 95 },
      score: 8.8
    },
    'Performance Analysis': {
      content: 'React optimization techniques include...',
      recommendations: ['Use React.memo', 'Implement lazy loading'],
      score: 8.2
    },
    'Dependency Analysis': {
      content: 'Minimal external dependencies...',
      dependencies: ['scheduler', 'loose-envify'],
      score: 9.2
    }
  }
};

console.log(JSON.stringify(mockDeepWikiReport, null, 2));
