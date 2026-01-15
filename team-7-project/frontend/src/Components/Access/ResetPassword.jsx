import React, { useState } from 'react';
import { useAuth } from '../StateProvider/authState/useAuth.jsx';

const ResetPassword = () => {
    // Reverted: Using your original destructured functions from useAuth
    const { handleForgotPassword, handleResetPassword, setView } = useAuth();
    
    // UI State
    const [step, setStep] = useState(1); // 1: Request Token, 2: Submit New Password
    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const onRequestToken = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const response = await handleForgotPassword(email);
            setMessage("If an account exists, a reset token has been generated.");
            // In a development environment, log the token or move to step 2 automatically
           // console.log("Dev Token:", response.token); 
            setToken(response.token); // Pre-filling for testing purposes
            setStep(2);
        } catch (err) {
            setError(err.message);
        }
    };

    const onResetSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await handleResetPassword(token, newPassword);
            setMessage("Password reset successfully! You can now log in.");
            
            // Reverted logic for the "Back" behavior after success
            setTimeout(() => setView('login'), 3000); 
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="reset-password">
            <div className="reset-card">
                <h1 className="reset-header">{step === 1 ? "Forgot Password" : "Reset Password"}</h1>

                {/* Status Messages */}
                {message && <div className="reset-success">{message}</div>}
                {error && <div className="reset-error">{error}</div>}

                {step === 1 ? (
                    <form onSubmit={onRequestToken} className="form-layout">
                        <div className="input-group">
                            <label className="input-label" htmlFor="email">Enter your registration email</label>
                            <input 
                                className="input-field"
                                type="email" 
                                id="email"
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                required 
                            />
                        </div>
                        <div className="form-action-group">
                            <button type="submit" className="reset-submit-btn">Reset</button>
                            {/* Logic to go back to previous screen (Login) */}
                            <button type="button" className="back-link-btn" onClick={() => setView('login')}>Back</button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={onResetSubmit} className="form-layout">
                        <div className="input-group">
                            <label className="input-label" htmlFor="token">Reset Token</label>
                            <input 
                                className="input-field"
                                type="text" 
                                id="token"
                                value={token} 
                                onChange={(e) => setToken(e.target.value)} 
                                required 
                            />
                        </div>
                        
                        <div className="input-group">
                            <label className="input-label" htmlFor="newPassword">New Password</label>
                            <input 
                                className="input-field"
                                type="password" 
                                id="newPassword"
                                value={newPassword} 
                                onChange={(e) => setNewPassword(e.target.value)} 
                                required 
                            />
                        </div>
                        
                        <div className="form-action-group">
                            <button type="submit" className="reset-submit-btn">Update Password</button>
                            {/* Logic to go back to the previous Step (Step 1) */}
                            <button type="button" className="back-link-btn" onClick={() => setStep(1)}>Back</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;