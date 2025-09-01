/**
 * Export all security agents for two-branch analysis
 */

// JavaScript/TypeScript
export { JavaScriptSecurityAgent } from './JavaScriptSecurityAgent';

// Python
export { PythonSecurityAgent } from './PythonSecurityAgent';

// Java
export { JavaSecurityAgent } from './JavaSecurityAgent';

// Go
export { GoSecurityAgent } from './GoSecurityAgent';

// Ruby
export { RubySecurityAgent } from './RubySecurityAgent';

// C/C++
export { CppSecurityAgent } from './CppSecurityAgent';

// PHP (NEW)
export { PHPSecurityAgent } from './PHPSecurityAgent';

// Rust (NEW)
export { RustSecurityAgent } from './RustSecurityAgent';

// Multi-language agents
export { OWASPDependencyCheckAgent } from './OWASPDependencyCheckAgent';
export { MultiToolArchitectureAgent } from './MultiToolArchitectureAgent';

// Paid tool agents (placeholders for beta)
export { SonarQubeAgent } from './SonarQubeAgent';
// export { SnykAgent } from './SnykAgent'; // To be implemented before beta

// Base classes
export { BaseSecurityAgent, BaseMultiToolAgent } from './BaseSecurityAgent';
export { BaseMultiToolAgent as OriginalBaseMultiToolAgent } from './BaseMultiToolAgent';
// export { MonitoredMultiToolAgent } from './MonitoredMultiToolAgent'; // Temporarily disabled due to monitoring interface issues

// Types and interfaces
export type { FileInfo, SecurityIssue } from '../interfaces/agent-interfaces';