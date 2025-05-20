// Run calibration if called directly
if (require.main === module) {
  runCalibration().catch(error => {
    console.error('Calibration failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runCalibration,
  generateReport
};