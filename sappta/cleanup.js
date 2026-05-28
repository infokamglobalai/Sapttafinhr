const fs = require('fs');
const path = require('path');

// Clean up temporary files
const filesToRemove = [
  'c:/Users/Kam01/Desktop/sappta/swap-files.js',
  'c:/Users/Kam01/Desktop/sappta/src/components/layout/Footer_new.tsx',
  'c:/Users/Kam01/Desktop/sappta/src/components/layout/Footer.tsx.bak'
];

filesToRemove.forEach(file => {
  try {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`✓ Removed: ${path.basename(file)}`);
    }
  } catch (error) {
    console.log(`✗ Could not remove ${path.basename(file)}: ${error.message}`);
  }
});

console.log('\n✓ Cleanup complete!');
