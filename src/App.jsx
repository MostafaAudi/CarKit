import { useState, useEffect } from 'react';
import './App.css';
import Home from './components/Home';
import Navbar from './components/Navbar';
import Signup from './components/Signup';
import Login from './components/Login';
import About from './components/About';
import Contact from './components/Contact';
import Adminpanel from './components/Adminpanel';
import ManagerPanel from './components/ManagerPanel';
import Cart from './components/Cart';
import Orders from './components/Orders';
import Deals from './components/Deals';
import Installation from './components/Installation';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const renderPage = () => {
    switch (currentPath) {
      case '/signup':
        return <Signup />;
      case '/login':
        return <Login />;
      case '/about':
        return <About />;
      case '/contact':
        return <Contact />;
      case '/admin':
        return <Adminpanel />;
      case '/manager':
        return <ManagerPanel />;
      case '/cart':
        return <Cart />;
      case '/orders':
        return <Orders />;
      case '/deals':
        return <Deals />;
      case '/installation':
        return <Installation />;
      case '/':
      default:
        return <Home />;
    }
  };

  return (
    <div className="App">
      <Navbar />
      {renderPage()}
    </div>
  );
 
}

export default App;
