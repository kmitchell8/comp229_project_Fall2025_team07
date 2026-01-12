//import { useForm } from 'react-hook-form';
import React, { useState, /*useEffect */} from 'react';
import { useAuth } from '../StateProvider/authState/useAuth.jsx';
import { signIn } from '../Api/authApi.jsx';
//import { getPage, getHash } from '../Api/getPage.jsx';
//import './Login.css';
import './Access.css';
import { ROUTES } from '../Api/routingConfig.js';


function Login() {
    //state to hold form data
    //const { isAuthenticated } = useAuth();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    {/*
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();
    */}
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true); //sets loading state to true


        try {

            const data = await signIn(email, password);
            // Save the token (jwt) and user info to localStorage
            localStorage.setItem('jwt', JSON.stringify({ token: data.token }));
            localStorage.setItem('user', JSON.stringify(data.user));
            // call the universal login function forom useAuth.jsx instead of the prop
            //sets isAuthenticated to true, updates user and role
            login(data.user);


        } catch (err) {
            // Handle error thrown by the service
            console.error('Login error:', err.message);
            setError(err.message);
        } finally {
            setLoading(false);
        }

    };


    return (
        <div className='login'>

            <div className="login-card">
                <h1 className="login-header">Sign In</h1>


                {error && (
                    <div className="login-error" role="alert">
                        <span className="error-message">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="form-layout">

                    {/*input fields laid out for ease of view and debugging / do not change*/}
                    {/*email input field*/}
                    <div className="input-group">
                        <label htmlFor="email" className="input-label">Email</label>
                        <input
                            type="email"
                            id="email" // Added ID for htmlFor association
                            placeholder="Type your email"
                            className="input-field"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}//updates the 'value" as the user enters
                            //details in the input field in a synchronised way
                            disabled={loading}
                        />
                    </div>

                    {/*password input*/}
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

                    <p className="switch-text">
                        Don't have an account? <span>
                            <a href={`./access.html#${ROUTES.REGISTER}`}>Signup</a></span>
                    </p>
                    {/*Login Button*/}
                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>

                    <p className="switch-text">
                        Forgot Password? <span>
                            <a href="./access.html#reset">Reset Password</a></span>
                    </p>
                </form>


            </div>

            {/*
        <form onSubmit={handleSubmit} className="hook">
            <label className="hook__text">Email</label>
            <input
                type="email"
                className="hook__input"
                {...register("email", { required: true, pattern: /^\S+@\S+$/i })}
            />

            {errors.email && (
                <p className="hook__error">Email is required and must be valid</p>
            )}

            <label className="hook__text">Password</label>

            <input
                type="password"
                className="hook__input"
                {...register("password", { required: true })}
            />

            {errors.password && <p className="hook__error">Password is required</p>}

            <button className="hook__button" type="submit">
                Submit
            </button>
        </form>*/}
        </div>
    );
}

export default Login;