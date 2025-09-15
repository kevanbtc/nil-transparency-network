import request from 'supertest';
import express from 'express';

// Mock API for testing
const app = express();
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'NIL Transparency API is running' });
});

describe('NIL Transparency API', () => {
  it('should return health status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      message: 'NIL Transparency API is running'
    });
  });
});