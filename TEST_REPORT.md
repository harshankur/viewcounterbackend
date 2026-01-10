# Test Report

**Generated**: 1/10/2026, 4:45:10 PM  
**Status**: ✓ GOOD  
**Overall Coverage**: 76.07%

---

## 📊 Coverage Summary

| Metric | Coverage | Status |
|--------|----------|--------|
| **Statements** | 75.84% (292/385) | ✓ |
| **Branches** | 68.57% (168/245) | ✓ |
| **Functions** | 82.81% (53/64) | ✅ |
| **Lines** | 77.07% (279/362) | ✓ |

---

## 📁 File Coverage

| File | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| index.js | 76.1% | 57.74% | 78.94% | 77.56% |
| index.js | 83.33% | 90.62% | 100% | 83.33% |
| DatabaseManager.js | 72.82% | 72.46% | 92.85% | 72.82% |
| validation.js | 94.73% | 71.42% | 100% | 100% |
| privacyUtils.js | 85.71% | 70% | 100% | 90% |
| referrerParser.js | 65.11% | 57.14% | 57.14% | 63.88% |
| userAgentParser.js | 74.07% | 71.42% | 100% | 78.94% |

---

## 🧪 Test Suites

### Unit Tests
- ✅ **UserAgentParser**: Browser, OS, and device detection
- ✅ **ReferrerParser**: Traffic source categorization

### Integration Tests
- ✅ **Health Check**: Server status monitoring
- ✅ **IP Detection**: IP address and geolocation
- ✅ **View Registration**: Basic and enhanced tracking
- ✅ **Custom Events**: Event tracking with metadata
- ✅ **Statistics**: Aggregated analytics
- ✅ **Trends**: Time-based analytics (hourly, daily, weekly)
- ✅ **Referrers**: Traffic source analysis
- ✅ **Browsers**: Browser/OS/device breakdown
- ✅ **Pages**: Page view statistics
- ✅ **Sessions**: Session journey tracking
- ✅ **Views**: Recent views with pagination
- ✅ **Rate Limiting**: Request throttling

---

## 🎯 Test Scenarios Covered

### View Registration
- [x] Basic view registration
- [x] View with page tracking
- [x] View with referrer tracking
- [x] View with session ID
- [x] Invalid appId rejection
- [x] Invalid deviceSize rejection
- [x] Missing parameters rejection

### Custom Events
- [x] Event tracking with metadata
- [x] Invalid appId rejection
- [x] Missing eventType rejection

### Analytics Endpoints
- [x] Statistics retrieval
- [x] Daily trends
- [x] Hourly trends
- [x] Referrer statistics
- [x] Browser/OS breakdown
- [x] Page statistics
- [x] Session details
- [x] Pagination support

### Security & Validation
- [x] Input validation
- [x] Rate limiting enforcement
- [x] Invalid parameter rejection

---

## 📈 Coverage Trends

👍 **Good coverage.** Consider adding more edge case tests.

---

## 🚀 Running Tests

```bash
# Run all tests with coverage
npm test

# Run tests in watch mode
npm run test:watch

# Generate this report
npm run test:report
```

---

## 📖 Additional Reports

- **HTML Test Report**: `test-report.html`
- **Coverage Report**: `coverage/index.html`
- **Coverage Summary**: `coverage/coverage-summary.json`

---

*Report generated automatically by test suite*
