const request = require('supertest');
const app = require('../../app');

describe('GET api/', () => {
  it('responds with 200', async (done) => {
    const res = await request(app).get('/api/');
    expect(res.status).toEqual(200);
    done();
  });
});
