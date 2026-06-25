const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../variables.env') });

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  const Service = require('../models/serviceModel');
  const counts = await Service.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
  console.log('Category counts:', JSON.stringify(counts, null, 2));
  const total = await Service.countDocuments();
  console.log('Total services:', total);
  mongoose.disconnect();
}).catch(e => { console.error(e.message); process.exit(1); });
