import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import quizzesRouter from './routes/quizzes.js';
import { setupSockets } from './sockets/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/api/quizzes', quizzesRouter);

// Servir el build del cliente en producción
const clientDist = join(__dirname, '../../client/dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(join(clientDist, 'index.html')));
}

setupSockets(io);

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server on http://localhost:${PORT}`);
  if (!existsSync(clientDist)) console.log('(client/dist not found — run npm run build --prefix client)');
});
