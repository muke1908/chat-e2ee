const fs = require('fs');

// Read the package.json file
fs.readFile('package.json', 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading package.json:', err);
    return;
  }

  // Parse the JSON data
  let packageJson;
  try {
    packageJson = JSON.parse(data);
  } catch (error) {
    console.error('Error parsing package.json:', error);
    return;
  }

  // Increment the minor version
  const versionParts = packageJson.version.split('.');
  versionParts[1] = String(parseInt(versionParts[1], 10) + 1);
  packageJson.version = versionParts.join('.');

  // Write the updated package.json file
  const updatedPackageJson = JSON.stringify(packageJson, null, 2);
  fs.writeFile('package.json', updatedPackageJson, 'utf8', (err) => {
    if (err) {
      console.error('Error writing package.json:', err);
      return;
    }
    console.log('Package minor version updated successfully!');
  });
});
