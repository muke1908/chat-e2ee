require('dotenv').config();
const app = require('./app');
const { connectDb } = require('./backend/db');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`server running at ${PORT}`);
  connectDb();
});
