/Users/alpinro/Code Prjects/codequal/node_modules/ts-node/src/index.ts:859
    return new TSError(diagnosticText, diagnosticCodes, diagnostics);
           ^
TSError: ⨯ Unable to compile TypeScript:
src/two-branch/utils/optimized-repo-manager.ts(145,68): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'LoggableData'.
src/two-branch/utils/optimized-repo-manager.ts(229,87): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'LoggableData'.
src/two-branch/utils/optimized-repo-manager.ts(284,58): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'LoggableData'.
src/two-branch/utils/optimized-repo-manager.ts(332,51): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'LoggableData'.
src/two-branch/utils/optimized-repo-manager.ts(352,52): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'LoggableData'.

    at createTSError (/Users/alpinro/Code Prjects/codequal/node_modules/ts-node/src/index.ts:859:12)
    at reportTSError (/Users/alpinro/Code Prjects/codequal/node_modules/ts-node/src/index.ts:863:19)
    at getOutput (/Users/alpinro/Code Prjects/codequal/node_modules/ts-node/src/index.ts:1077:36)
    at Object.compile (/Users/alpinro/Code Prjects/codequal/node_modules/ts-node/src/index.ts:1433:41)
    at Module.m._compile (/Users/alpinro/Code Prjects/codequal/node_modules/ts-node/src/index.ts:1617:30)
    at loadTS (node:internal/modules/cjs/loader:1826:10)
    at Object.require.extensions.<computed> [as .ts] (/Users/alpinro/Code Prjects/codequal/node_modules/ts-node/src/index.ts:1621:12)
    at Module.load (node:internal/modules/cjs/loader:1469:32)
    at Function._load (node:internal/modules/cjs/loader:1286:12)
    at TracingChannel.traceSync (node:diagnostics_channel:322:14) {
  diagnosticCodes: [ 2345, 2345, 2345, 2345, 2345 ]
}
