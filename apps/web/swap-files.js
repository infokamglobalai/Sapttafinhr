const fs = require('fs');
const path = require('path');

const footerPath = path.join(__dirname, 'src/components/layout/Footer.tsx');
const footerNewPath = path.join(__dirname, 'src/components/layout/Footer_new.tsx');
const footerBakPath = path.join(__dirname, 'src/components/layout/Footer.tsx.bak');

try {
  // Backup old file
  fs.copyFileSync(footerPath, footerBakPath);
  console.log('✓ Backed up original Footer.tsx');
  
  // Replace with new file
  fs.copyFileSync(footerNewPath, footerPath);
  console.log('✓ Replaced Footer.tsx with new version');
  
  // Remove temporary file
  fs.unlinkSync(footerNewPath);
  console.log('✓ Removed temporary Footer_new.tsx');
  
  console.log('\n✓ File swap completed successfully!');
} catch (error) {
  console.error('✗ Error during file swap:', error.message);
  process.exit(1);
}
