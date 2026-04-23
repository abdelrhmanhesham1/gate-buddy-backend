const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  const col = mongoose.connection.collection('services');
  const count = await col.countDocuments();
  console.log('Total services:', count);
  process.exit(0);
});
