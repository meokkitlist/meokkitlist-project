import { Home } from '@/pages/Home'
import { Route, Routes } from 'react-router-dom'
import Login from '@/pages/Auth/Login'
import Signup from '@/pages/Auth/Signup'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
    </Routes>
  )
}

export default App
