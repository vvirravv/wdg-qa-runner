// Custom summary reporter — short output at the end of test run
class SummaryReporter {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.flaky = 0;
    this.failures = [];
    this.startTime = Date.now();
  }

  onTestEnd(test, result) {
    if (result.status === 'passed') this.passed++;
    else if (result.status === 'skipped') this.skipped++;
    else if (result.status === 'failed') {
      this.failed++;
      // Collect failure reason — first line of error message
      const error = result.error?.message?.split('\n')[0] || 'Unknown error';
      const title = test.titlePath().slice(1).join(' › ');
      this.failures.push({ title, error });
    }
    if (result.status === 'passed' && result.retry > 0) this.flaky++;
  }

  onEnd(result) {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const total = this.passed + this.failed + this.skipped;

    console.log('\n' + '═'.repeat(60));
    console.log('  TEST RUN SUMMARY');
    console.log('═'.repeat(60));
    console.log(`  ✅  Passed:  ${this.passed}`);
    if (this.flaky > 0)
    console.log(`  ⚠️   Flaky:   ${this.flaky} (passed on retry)`);
    if (this.failed > 0)
    console.log(`  ❌  Failed:  ${this.failed}`);
    if (this.skipped > 0)
    console.log(`  ⏭   Skipped: ${this.skipped}`);
    console.log(`  📊  Total:   ${total}  |  ⏱ ${duration}s`);

    if (this.failures.length > 0) {
      console.log('\n  FAILED TESTS:');
      console.log('  ' + '─'.repeat(56));
      this.failures.forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.title}`);
        console.log(`     → ${f.error.substring(0, 80)}`);
      });
    }

    console.log('═'.repeat(60));
    console.log(`  Report: npx playwright show-report`);
    console.log('═'.repeat(60) + '\n');
  }
}

module.exports = SummaryReporter;
