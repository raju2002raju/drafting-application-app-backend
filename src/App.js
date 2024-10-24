import logo from './logo.svg';
import './App.css';
import {BrowserRouter, Route, Routes} from 'react-router-dom'
import GenerateDocument from './Components/GenerateDocument/GenerateDocument';
import LoginPage from './Components/LoginPage/LoginPage';

function App() {
  return (
    <>
    <BrowserRouter>
    
      <Routes>
        <Route path='/' element={<GenerateDocument/>} />
        <Route path='/login' element={<LoginPage/>} />
      </Routes>
    </BrowserRouter>

    </>
  );
}

export default App;
