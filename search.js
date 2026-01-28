const readline = require('readline');
const { exec } = require('child_process');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║        🔍 Process Checker - Interactive Search            ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

function askForProcess() {
  rl.question('📝 Enter process name (or "exit" to quit): ', (processName) => {
    processName = processName.trim();
    
    if (!processName) {
      console.log('❌ Please enter a valid process name!\n');
      askForProcess();
      return;
    }
    
    if (processName.toLowerCase() === 'exit' || processName.toLowerCase() === 'quit') {
      console.log('\n👋 Goodbye!\n');
      rl.close();
      process.exit(0);
      return;
    }
    
    console.log(`\n🚀 Starting search for: "${processName}"\n`);
    console.log('═'.repeat(60));
    
    // Run the automation script
    const command = `node automate-search.js "${processName}"`;
    
    const child = exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`\n❌ Error: ${error.message}\n`);
      }
      if (stderr) {
        console.error(`\n⚠️ Warning: ${stderr}\n`);
      }
      
      console.log('\n' + '═'.repeat(60));
      console.log('✅ Search completed!\n');
      
      // Ask for next process
      askForProcess();
    });
    
    // Show output in real-time
    child.stdout.on('data', (data) => {
      process.stdout.write(data);
    });
    
    child.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}

// Start the interactive session
askForProcess();
