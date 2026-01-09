#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const dbInfoPath = path.join(__dirname, '..', 'dbInfo.json');
const allowedPath = path.join(__dirname, '..', 'allowed.json');
const envPath = path.join(__dirname, '..', '.env');

async function setup() {
    console.log('\n🚀 View Counter Backend Setup\n');

    // Check for existing configuration
    const hasDbInfo = fs.existsSync(dbInfoPath);
    const hasAllowed = fs.existsSync(allowedPath);
    const hasEnv = fs.existsSync(envPath);

    if (hasDbInfo || hasAllowed || hasEnv) {
        console.log('⚠️  Existing configuration detected:');
        if (hasDbInfo) console.log('   - dbInfo.json');
        if (hasAllowed) console.log('   - allowed.json');
        if (hasEnv) console.log('   - .env');
        console.log('');

        const action = await question('What would you like to do?\n  1) Overwrite existing config\n  2) Keep existing and exit\n  3) Edit specific files\nChoice (1-3): ');

        if (action === '2') {
            console.log('✓ Keeping existing configuration. Exiting...');
            rl.close();
            return;
        }

        if (action === '3') {
            await editSpecificFiles(hasDbInfo, hasAllowed, hasEnv);
            rl.close();
            return;
        }

        // action === '1' continues to full setup
        console.log('\n⚠️  This will overwrite your existing configuration!\n');
    }

    // Database Configuration
    console.log('--- Database Configuration ---\n');

    const mode = await question('Database mode?\n  1) Connect to existing database\n  2) Auto-create database and tables\nChoice (1-2): ');
    const dbMode = mode === '2' ? 'create' : 'connect';

    const host = await question('Database host (default: 127.0.0.1): ') || '127.0.0.1';
    const port = await question('Database port (default: 3306): ') || '3306';
    const database = await question('Database name (default: viewcounterdb): ') || 'viewcounterdb';
    const user = await question('Database user (default: root): ') || 'root';
    const password = await question('Database password: ');

    const dbConfig = {
        mode: dbMode,
        host,
        port: parseInt(port, 10),
        database,
        user,
        password
    };

    fs.writeFileSync(dbInfoPath, JSON.stringify(dbConfig, null, 4));
    console.log('✓ Created dbInfo.json\n');

    // Allowed Values Configuration
    console.log('--- Allowed Values Configuration ---\n');

    const appIds = await question('Enter allowed app IDs (comma-separated, e.g., blog,portfolio): ');
    const deviceSizes = await question('Enter allowed device sizes (comma-separated, default: small,medium,large): ') || 'small,medium,large';

    const allowedConfig = {
        appId: appIds.split(',').map(s => s.trim()).filter(Boolean),
        deviceSize: deviceSizes.split(',').map(s => s.trim()).filter(Boolean)
    };

    fs.writeFileSync(allowedPath, JSON.stringify(allowedConfig, null, 4));
    console.log('✓ Created allowed.json\n');

    // Optional .env file
    const createEnv = await question('Create .env file for additional config? (y/n, default: n): ');
    if (createEnv.toLowerCase() === 'y') {
        const serverPort = await question('Server port (default: 3030): ') || '3030';
        const rateLimitMax = await question('Rate limit max requests per minute (default: 100): ') || '100';
        const uniqueWindow = await question('Unique visitor window in hours (default: 24, 0 to disable): ') || '24';

        const envContent = `# Database Mode
DB_MODE=${dbMode}

# Database Connection
DB_HOST=${host}
DB_PORT=${port}
DB_NAME=${database}
DB_USER=${user}
DB_PASSWORD=${password}

# Server Configuration
PORT=${serverPort}
NODE_ENV=development

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=${rateLimitMax}

# Unique Visitor Tracking (hours)
UNIQUE_VISITOR_WINDOW_HOURS=${uniqueWindow}
`;

        fs.writeFileSync(envPath, envContent);
        console.log('✓ Created .env\n');
    }

    console.log('✅ Setup complete!\n');
    console.log('Next steps:');
    console.log('  1. Install dependencies: npm install');
    console.log('  2. Start the server: npm start');
    console.log('');

    rl.close();
}

async function editSpecificFiles(hasDbInfo, hasAllowed, hasEnv) {
    console.log('\nWhich files would you like to reconfigure?');

    if (hasDbInfo) {
        const editDb = await question('  - Reconfigure dbInfo.json? (y/n): ');
        if (editDb.toLowerCase() === 'y') {
            // Simplified re-config for dbInfo
            const mode = await question('Database mode (connect/create): ') || 'connect';
            const host = await question('Database host: ') || '127.0.0.1';
            const port = await question('Database port: ') || '3306';
            const database = await question('Database name: ') || 'viewcounterdb';
            const user = await question('Database user: ') || 'root';
            const password = await question('Database password: ');

            fs.writeFileSync(dbInfoPath, JSON.stringify({ mode, host, port: parseInt(port), database, user, password }, null, 4));
            console.log('✓ Updated dbInfo.json');
        }
    }

    if (hasAllowed) {
        const editAllowed = await question('  - Reconfigure allowed.json? (y/n): ');
        if (editAllowed.toLowerCase() === 'y') {
            const appIds = await question('Allowed app IDs (comma-separated): ');
            const deviceSizes = await question('Allowed device sizes (comma-separated): ');

            fs.writeFileSync(allowedPath, JSON.stringify({
                appId: appIds.split(',').map(s => s.trim()).filter(Boolean),
                deviceSize: deviceSizes.split(',').map(s => s.trim()).filter(Boolean)
            }, null, 4));
            console.log('✓ Updated allowed.json');
        }
    }

    console.log('\n✅ Configuration updated!');
}

setup().catch(error => {
    console.error('Setup failed:', error);
    rl.close();
    process.exit(1);
});
