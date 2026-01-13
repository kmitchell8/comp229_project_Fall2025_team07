import React, { useState, useEffect } from 'react'
//import './LogOrReg.css'
import './Access.css';
import { signIn, signUp } from '../Api/authApi.jsx';
import { useAuth } from '../StateProvider/authState/useAuth.jsx';
import { getPage, getHash } from '../Api/getPage.jsx'


const LogOrReg = () => {
  //state to hold form data
  const { isAuthenticated, login } = useAuth();
  //const { register } = useAuth();


  // Added mode state for button toggle logic
  const [mode, setMode] = useState('signin');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  //getting a usable string from the function
  const getPageString = getPage();
  const getHashString = getHash();
  //logic to ensure user does not get to the login/regster pages if logged in
  useEffect(() => {
    if (isAuthenticated && (getPageString === 'login' || getPageString === 'register')) {
      console.log(`User is Logged in. Redirecting from ${getPageString} page to homepage.`);
      window.location.replace('./');
    }
    if (isAuthenticated && (getHashString === 'login' || getHashString === 'register')) {
      console.log(`User is Logged in. Redirecting from ${getHashString} page to homepage.`);
      window.location.replace('./');
    }
  }, [isAuthenticated, getPageString, getHashString]);
  //If statement to ensure the form does not render if on the 
  // home page and logged in (can be any page)
  //needs to be updated to coincide with the page the component is on
  if (getPageString === 'index' && isAuthenticated) {
    return null;
  }

  {/*
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();
    */}
  const handleSubmit = async (e/*submitAction*/) => {
    e.preventDefault();
    const submitAction = e.nativeEvent.submitter.value;
    /*if (e && e.preventDefault) {
      e.preventDefault();
      //for a different solution
    }*/
    setError(null);
    setLoading(true); //sets loading state to true

    try {
      if (submitAction === 'register') {
        await signUp(name, email, password);
        window.location.replace('./login.html');

      }
      if (submitAction == 'signin') {

        const data = await signIn(email, password);
        // Save the token (jwt) and user info to localStorage
        localStorage.setItem('jwt', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        // call the universal login function forom useAuth.jsx instead of the prop
        //sets isAuthenticated to true, updates user and role
        login(data.user);


      }
    } catch (err) {
      const action = submitAction === 'Registration' ? 'Registration' : 'Login';
      console.error(`${action} error:`, err.message);
      setError(err.message || `${action} failed.`);

    } finally {
      setLoading(false);
    }
  };
  const handleButtonClick = (e, targetMode) => {
    // If the user clicks the button that ISN'T active, 
    // we switch the mode and prevent the form from submitting.
    if (mode !== targetMode) {
      e.preventDefault();
      setMode(targetMode);
      setError(null); // Clear errors when switching modes for a clean start
    }
    // If mode === targetMode, we do nothing and let the 'type="submit"' 
    // trigger the handleSubmit normally.
  };


  /*
  //This is for another solution for future reference
  // called by the onSubmit (Sign In button, type="submit")
  //  'e' event is passed automatically by the form.
  const handleFormSubmit = (e) => handleSubmit(e, 'signin');

  // called by the Sign Up button (type="button")
  // It passes null for the event since the button doesn't submit the form directly.
  const handleRegisterClick = () => handleSubmit(null, 'register');
  */
  return (
    <div className='form-container'>
      <div className="form-card">

        {error && (
          <div className="form-error" role="alert">
            <span className="error-message">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="form">

          {/*name/username input field - Visible only in register mode*/}
          {mode === 'register' && (
            <div className="input-group">
              <label htmlFor="name" className="input-label">Username</label>
              <input
                type="text"
                id="name"
                placeholder="Type your username"
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          )}

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

          <div className='button-container'>
            {/*Login Button*/}
            <button
              type="submit"
              className={`login-button split-left ${mode === 'signin' ? 'active' : ''}`}
              disabled={loading}
              name="action"
              value="signin"
              onClick={(e) => handleButtonClick(e, 'signin')}
            >
              {loading && mode === 'signin' ? 'Signing In...' : 'Sign In'}
            </button>

            {/*Signup Button*/}
            <button
              type="submit"
              className={`register-button split-right ${mode === 'register' ? 'active' : ''}`}
              disabled={loading}
              name="action"
              value="register"
              onClick={(e) => handleButtonClick(e, 'register')}
            >
              {loading && mode === 'register' ? 'Registering...' : 'Sign Up'}
            </button>
          </div>
          <>
            <p className="switch-text">
              Forgot Password? <span>
                <a href="./access.html#reset">Reset Password</a></span>
            </p>
          </>

        </form>
      </div>
    </div>
  )
}

export default LogOrReg;