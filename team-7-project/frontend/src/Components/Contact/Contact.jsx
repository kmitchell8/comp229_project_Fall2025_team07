import React, { useState } from 'react';
import './Contact.css';
import call_icon from '../../assets/call_icon.svg';
import mail_icon from '../../assets/mail_icon.svg';
import location_icon from '../../assets/location_icon.svg';

const Contact = () => {
    // Using the state pattern from CreateMedia for consistency
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        streetAddress: '',
        addressLine2: '',
        city: '',
        country: 'Canada',
        stateProvince: '',
        postalCode: '',
        message: ''
    });

    const [loading, setLoading] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState({});

    // Standard list of countries
    const countries = ["Canada", "United States", "United Kingdom", "Australia", "Other"];

    // Example state/province data logic
    const regionalOptions = {
        "United States": ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Other..."],
        "Canada": ["Alberta", "British Columbia", "Manitoba", "Ontario", "Quebec", "Other..."],
        "United Kingdom": ["England", "Scotland", "Wales", "Northern Ireland"]
    };

    const handleChange = name => event => {
        setFormData({ ...formData, [name]: event.target.value });
        // Clear specific field feedback when user types
        setFeedbackMessage(prev => ({ ...prev, [name]: undefined }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        // This is where we will eventually link to the userApi or contactApi
        console.log("Submitting Contact Data:", formData);
        
        // Simulating API call
        setTimeout(() => setLoading(false), 1000);
    };

    // Reusing your renderInput helper pattern
    const renderInput = (name, label, type = 'text', required = false, placeholder = '') => {
        const isError = feedbackMessage[name];
        return (
            <div className="form-group" key={name}>
                <label htmlFor={name}>{label}</label>
                <input
                    id={name}
                    name={name}
                    type={type}
                    value={formData[name]}
                    placeholder={placeholder}
                    onChange={handleChange(name)}
                    required={required}
                    className={isError ? 'input-error' : ''}
                />
            </div>
        );
    };

    return (
        <div className='contact'>
            <div className="contact-title">
                <h1>Contact US</h1>
                <hr />
            </div>
            <div className="contact-sections">
                <div className="contact-left">
                    <h1>Keep in Touch</h1>
                    <p>We value your feedback. Please fill out the form and our team will get back to you shortly.</p>
                    <div className="contact-details">
                        <div className="contact-detail">
                            <img src={mail_icon} width="25px" height="25px" alt="" /><p>mail@mail.com</p>
                        </div>
                        <div className="contact-detail">
                            <img src={call_icon} width="25px" height="25px" alt="" /><p>+1(999)-999-9999</p>
                        </div>
                        <div className="contact-detail">
                            <img src={location_icon} width="25px" height="25px" alt="" /><p>123 Library Lane, Tech City</p>
                        </div>
                    </div>
                </div>

                <form className="contact-right" onSubmit={handleSubmit}>
                    {renderInput('name', 'Name', 'text', true, 'Enter Name')}
                    {renderInput('email', 'E-mail Address', 'email', true)}
                    
                    <label htmlFor="phone">Phone Number</label>
                    <input 
                        id="phone" 
                        name="phone" 
                        type="tel" 
                        value={formData.phone}
                        onChange={handleChange('phone')}
                        pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}" 
                        maxLength="12" 
                        placeholder="555-555-5555"
                    />

                    {/* New Address Fields */}
                    {renderInput('streetAddress', 'Street Address', 'text', true, '123 Main St')}
                    {renderInput('addressLine2', 'Address Line 2', 'text', false, 'Apt, Suite, etc.')}
                    {renderInput('city', 'City', 'text', true)}

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="country">Country</label>
                            <select id="country" value={formData.country} onChange={handleChange('country')}>
                                {countries.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="stateProvince">State / Province</label>
                            {regionalOptions[formData.country] ? (
                                <select id="stateProvince" value={formData.stateProvince} onChange={handleChange('stateProvince')}>
                                    <option value="">Select...</option>
                                    {regionalOptions[formData.country].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            ) : (
                                <input 
                                    type="text" 
                                    id="stateProvince" 
                                    value={formData.stateProvince} 
                                    onChange={handleChange('stateProvince')} 
                                    placeholder="Enter State" 
                                />
                            )}
                        </div>
                    </div>

                    {renderInput('postalCode', 'Postal / Zip Code', 'text', true)}

                    <label htmlFor="message">Message</label>
                    <textarea 
                        id="message" 
                        name="message" 
                        rows="5" 
                        value={formData.message}
                        onChange={handleChange('message')}
                        placeholder='How can we help you?'
                    />

                    <div className="form-action-group">
                        <button type="submit" className="submit" disabled={loading}>
                            {loading ? 'Sending...' : 'Submit'}
                        </button>
                        <button 
                            type="button" 
                            className="reset-btn" 
                            onClick={() => setFormData({ country: 'United States', name: '', email: '', phone: '', streetAddress: '', addressLine2: '', city: '', stateProvince: '', postalCode: '', message: '' })}
                        >
                            Reset
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Contact;