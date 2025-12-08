import React, { useState, useEffect } from 'react';
import { useAuth } from '../authState/useAuth.jsx';
import { signUp } from '../Api/authApi.jsx';
import {getPage} from '../Api/getPage.jsx'
import './Register.css'




const Register = () => {
  //state to hold form data
  //const { register} = useAuth();
  const { isAuthenticated } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
 
  //getting a usable string from the function
  const getPageString = getPage();
  //Logic to ensure user does not get to the login/regster pages if logged in
  useEffect(() => {
    if (isAuthenticated && (getPageString === 'login' || getPageString === 'register')) {
      console.log(`User is Logged in. Redirecting from ${getPageString} page to homepage.`);
      window.location.replace('./');
    }
  }, [isAuthenticated, getPageString]);
   if (getPageString === 'register' && isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);


    try {
      await signUp(name, email, password);
      window.location.href = './login.html';

    } catch (err) {
      console.error('Registration error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='register'>
      <div className="register-card">

        <h1 className="register-header">
          Sign Up
        </h1>

        {error && (
          <div className="register-error" role="alert">
            <span className="error-message">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="register-form">

          {/*input fields laid out for ease of view and debugging / do not change*/}
          {/*name/username input field*/}
          <div className="input-group">
            <label htmlFor="name" className="input-label">Username</label>
            <input
              type="text"
              id="name"
              placeholder="Type your username"
              className="input-field"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}//updates the 'value" as the user enters
              //details in the input field in a synchronised way
              disabled={loading}
            />
          </div>

          {/* email input field*/}
          <div className="input-group">
            <label htmlFor="email" className="input-label">Email</label>
            <input
              type="email"
              id="email"
              placeholder="Type your email"
              className="input-field"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* password input field*/}
          <div className="input-group">
            <label htmlFor="password" className="input-label">Password</label>
            <input
              type="password"
              id="password"
              placeholder="Type your password"
              className="input-field"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* switch to login link*/}
          <p className="switch-text">
            Already have an account? <span>
              <a href="./login.html">Log In</a></span>
          </p>

          {/*Signup Button*/}
          <button type="submit" className="register-button" disabled={loading}>
            {loading ? 'Registering...' : 'Sign Up'}
          </button>

        </form>
      </div>

    </div>)
}

export default Register