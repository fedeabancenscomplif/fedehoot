import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import QuizList from './pages/QuizList';
import QuizEditor from './pages/QuizEditor';
import HostGame from './pages/HostGame';
import JoinGame from './pages/JoinGame';
import PlayGame from './pages/PlayGame';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/quizzes" element={<QuizList />} />
        <Route path="/quizzes/new" element={<QuizEditor />} />
        <Route path="/quizzes/:id/edit" element={<QuizEditor />} />
        <Route path="/host/:quizId" element={<HostGame />} />
        <Route path="/join" element={<JoinGame />} />
        <Route path="/play" element={<PlayGame />} />
      </Routes>
    </BrowserRouter>
  );
}
