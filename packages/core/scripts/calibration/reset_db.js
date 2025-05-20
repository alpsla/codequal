// Reset database
const fs = require('fs');
const path = require('path');

// Function to recursively delete a directory
function deleteFolderRecursive(directoryPath) {
  if (fs.existsSync(directoryPath)) {
    fs.readdirSync(directoryPath).forEach((file) => {
      const curPath = path.join(directoryPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // Recurse
        deleteFolderRecursive(curPath);
      } else {
        // Delete file
        fs.unlinkSync(curPath);
        console.log(`Deleted file: ${curPath}`);
      }
    });
    
    // Now folder should be empty
    console.log(`Cleared directory: ${directoryPath}`);
  } else {
    console.log(`Directory does not exist: ${directoryPath}`);
  }
}

// Try to delete database files in several possible locations
const dbPaths = [
  '/app/api/db',
  '/app/db',
  '/app/data',
  '/app/api/data'
];

dbPaths.forEach(dbPath => {
  if (fs.existsSync(dbPath)) {
    console.log(`Found database directory: ${dbPath}`);
    
    // Get all files in the directory
    const files = fs.readdirSync(dbPath);
    
    // Delete all database files
    let deletedFiles = 0;
    for (const file of files) {
      // Only delete database files
      if (file.endsWith('.sqlite') || file.endsWith('.db') || file.endsWith('.sqlite3') || 
          file.endsWith('.vector') || file.endsWith('.index')) {
        const filePath = path.join(dbPath, file);
        try {
          fs.unlinkSync(filePath);
          console.log(`Deleted database file: ${file}`);
          deletedFiles++;
        } catch (error) {
          console.error(`Failed to delete ${file}: ${error.message}`);
        }
      }
    }
    
    if (deletedFiles === 0) {
      console.log('No database files found to delete');
    } else {
      console.log(`Successfully deleted ${deletedFiles} database files`);
    }
  }
});

// Also check for collections directory which is often used in vector databases
const collectionsPaths = [
  '/app/api/collections',
  '/app/collections',
  '/app/data/collections',
  '/app/api/data/collections'
];

collectionsPaths.forEach(collPath => {
  if (fs.existsSync(collPath)) {
    console.log(`Found collections directory: ${collPath}`);
    deleteFolderRecursive(collPath);
  }
});

console.log('Database reset complete');
