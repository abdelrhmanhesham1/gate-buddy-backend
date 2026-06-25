const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../variables.env') });

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  const db = mongoose.connection.db;
  const col = db.collection('devices');
  const indexes = await col.indexes();
  console.log('Current indexes:', JSON.stringify(indexes, null, 2));

  // Drop stale deviceToken index if it exists
  for (const idx of indexes) {
    if (idx.key && idx.key.deviceToken !== undefined) {
      console.log('Dropping stale index:', idx.name);
      await col.dropIndex(idx.name);
    }
  }

  // Drop all docs to avoid stale data
  const deleted = await col.deleteMany({});
  console.log('Cleared devices collection:', deleted.deletedCount, 'docs removed');

  const after = await col.indexes();
  console.log('Indexes after cleanup:', after.map(i => i.name));
  mongoose.disconnect();
}).catch(e => { console.error(e.message); process.exit(1); });
