import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import quizzesRouter from './routes/quizzes.js';
import { setupSockets } from './sockets/index.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: ['http://localhost:5173', 'http://localhost:4173'], methods: ['GET', 'POST'] },
});

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }));
app.use(express.json());
app.use('/api/quizzes', quizzesRouter);

setupSockets(io);

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
