# Debugging & Troubleshooting

This guide provides tips and tricks for debugging the View Counter Backend.

## Common Issues

### 1. Server Returns 503 Service Unavailable
This usually means the server is running but cannot connect to the MySQL database.
- **Check logs**: Look for `[Database] ❌ Connection error` in the console.
- **Verify credentials**: Ensure `dbInfo.json` or your environment variables are correct.
- **Database Status**: Use the `/health` endpoint to see the specific error.

### 2. 400 Bad Request on /registerView
This usually means validation failed.
- **Invalid appId**: Make sure the `appId` is listed in `allowed.json`.
- **Invalid deviceSize**: Must be one of `small`, `medium`, or `large`.
- **Missing Parameters**: `appId` and `deviceSize` are required.

### 3. Missing Stats or Trends
If you see 0 views despite registering them:
- **Duplicate Prevention**: The server prevents duplicate views from the same IP within a 24-hour window (configurable via `UNIQUE_VISITOR_WINDOW_HOURS`).
- **App ID Mismatch**: Ensure the appId used for registration matches the one used for the stats query.

## Development Debugging

### Using Mocks
You can run the entire system without a database by running:
```bash
npm test
```
The mocks in `tests/dbMock.js` simulate all analytics data.

### Inspecting the Test Database
To see the exact SQL queries and data state during tests:
1. Run `PERSIST_TEST_DB=true npm test`.
2. Connect to your MySQL server: `mysql -u root`.
3. Switch to the test DB: `USE viewcounterdb_test;`.
4. Inspect the tables: `SHOW TABLES;`.

### Verbose Logging
The server uses structured logging. You can see detailed request information in the console:
`[Timestamp] [INFO/WARN/ERROR] Message | IP: 123.123.123.123`

## Reporting Issues
If you find a bug that isn't covered here, please [open an issue](https://github.com/your-username/viewcounterbackend/issues).
