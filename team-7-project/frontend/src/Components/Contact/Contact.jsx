import React, { useState, useEffect } from 'react';
import './Contact.css';
import call_icon from '../../assets/call_icon.svg';
import mail_icon from '../../assets/mail_icon.svg';
import location_icon from '../../assets/location_icon.svg';
import { useUser } from '../StateProvider/userState/useUser.jsx';

/**
 * CONFIGURATION: Single Source of Truth for Contact Fields
 * To handle schema changes, update the 'id' here.
 * This array controls the automated rendering of standard text inputs.
 */
const CONTACT_FIELD_CONFIG = [
    { id: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Enter Name' },
    { id: 'email', label: 'E-mail Address', type: 'email', required: true, placeholder: '' },
    { id: 'street', label: 'Street Address', type: 'text', required: true, placeholder: '123 Main St' },
    { id: 'addressLineTwo', label: 'Address Line 2', type: 'text', required: false, placeholder: 'Apt, Suite, etc.' },
    { id: 'city', label: 'City', type: 'text', required: true, placeholder: '' },
    { id: 'postalCode', label: 'Postal / Zip Code', type: 'text', required: true, placeholder: '' },
];

const Contact = () => {
    // Consume dynamic data from UserProvider (consistent with Profile.jsx)
    const { userData: userProfile, countryData, loading: userProviderLoading } = useUser();
    
    const [showSuccess, setShowSuccess] = useState(false); 
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState({}); // Stores validation errors for the UI

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        street: '',           
        addressLineTwo: '',   
        city: '',             
        Country: 'Canada',    
        province: '',         
        postalCode: '',       
        message: ''
    });

    // Effect: Pre-fill form if user is logged in
    useEffect(() => {
        if (!userProviderLoading && userProfile?.email) {
            setFormData(prev => ({
                ...prev,
                name: userProfile.name || '',
                email: userProfile.email || '',
                phone: userProfile.phone || '',
                street: userProfile.address?.street || '',
                addressLineTwo: userProfile.address?.addressLineTwo || '',
                city: userProfile.address?.city || '',
                Country: userProfile.address?.Country || 'Canada',
                province: userProfile.address?.province || '',
                postalCode: userProfile.address?.postalCode || '',
            }));
        }
    }, [userProfile,userProviderLoading]);

    // Source countries/regions from API context (matching Profile.jsx cleanup)
    const countries = countryData?.countries || [];
    const regionalOptions = countryData?.regionalOptions || {};

    const handleChange = name => event => {
        const value = event.target.value;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Clear feedback message when user starts typing again
        if (feedbackMessage[name]) {
            setFeedbackMessage(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.name.trim()) errors.name = "Name is required";
        if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errors.email = "Invalid email";
        if (!formData.street.trim()) errors.street = "Required";
        if (!formData.city.trim()) errors.city = "Required";
        if (!formData.postalCode.trim()) errors.postalCode = "Required";
        if (formData.message.length < 10) errors.message = "Message too short";
        
        setFeedbackMessage(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);
        // Link to submission API logic here (e.g., contactApi.send(formData))
        
        setTimeout(() => {
            setIsSubmitting(false);
            setShowSuccess(true); 
        }, 1200);
    };

    // Reset Function: Restores defaults and clears errors
    const handleReset = () => {
        setFormData({ 
            name: '', email: '', phone: '', street: '', 
            addressLineTwo: '', city: '', Country: 'Canada', 
            province: '', postalCode: '', message: '' 
        });
        setFeedbackMessage({});
    };

    // Helper to render inputs with integrated feedback hints
    const renderInput = (name, label, type = 'text', required = false, placeholder = '') => {
        const error = feedbackMessage[name];
        return (
            <div className="form-group" key={name}>
                <div className="label-row">
                    <label htmlFor={name}>{label}</label>
                    {error && <span className="error-hint">{error}</span>}
                </div>
                <input
                    id={name}
                    type={type}
                    value={formData[name]}
                    placeholder={placeholder}
                    onChange={handleChange(name)}
                    required={required}
                    className={error ? 'input-error' : ''}
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
                            <img src={mail_icon} width="20px" alt="" /><p>mail@mail.com</p>
                        </div>
                        <div className="contact-detail">
                            <img src={call_icon} width="20px" alt="" /><p>+1(999)-999-9999</p>
                        </div>
                        <div className="contact-detail">
                            <img src={location_icon} width="20px" alt="" /><p>123 Library Lane, Tech City</p>
                        </div>
                    </div>
                </div>

                <form className="contact-right" onSubmit={handleSubmit}>
                    {/* STANDARD FIELDS: Dynamically mapped from config */}
                    {CONTACT_FIELD_CONFIG.slice(0, 2).map(f => renderInput(f.id, f.label, f.type, f.required, f.placeholder))}
                    
                    {/* Phone field handled separately as it doesn't use renderInput's error logic in original code */}
                    <div className="form-group">
                        <label>Phone Number</label>
                        <input type="tel" value={formData.phone} onChange={handleChange('phone')} placeholder="555-555-5555" />
                    </div>

                    {/* ADDRESS FIELDS: Dynamically mapped from config */}
                    {CONTACT_FIELD_CONFIG.slice(2).map(f => renderInput(f.id, f.label, f.type, f.required, f.placeholder))}
                    
                    <div className="form-row">
                        <div className="form-group">
                            <label>Country</label>
                            <select value={formData.Country} onChange={handleChange('Country')}>
                                {countries.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Province / State</label>
                            {regionalOptions[formData.Country] ? (
                                <select value={formData.province} onChange={handleChange('province')}>
                                    <option value="">Select...</option>
                                    {regionalOptions[formData.Country].map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            ) : (
                                <input type="text" value={formData.province} onChange={handleChange('province')} placeholder="Enter Province" />
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <div className="label-row">
                            <label>Message</label>
                            {feedbackMessage.message && <span className="error-hint">{feedbackMessage.message}</span>}
                        </div>
                        <textarea 
                            rows="4" 
                            value={formData.message} 
                            onChange={handleChange('message')} 
                            placeholder="How can we help you?"
                            className={feedbackMessage.message ? 'input-error' : ''}
                        />
                    </div>

                    <div className="form-action-group">
                        <button type="submit" className="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Sending...' : 'Submit'}
                        </button>
                        <button type="button" className="reset-btn" onClick={handleReset}>
                            Reset
                        </button>
                    </div>
                </form>
            </div>

            {/* Success Modal */}
            {showSuccess && (
                <div className="modal-overlay" onClick={() => setShowSuccess(false)}>
                    <div className="modal-content success-modal" onClick={e => e.stopPropagation()}>
                        <button className="close-button" onClick={() => setShowSuccess(false)}>&times;</button>
                        <div className="modal-info">
                            <h1 className="success-title">Message Sent!</h1>
                            <hr />
                            <p className="modal-description">
                                Thank you, <strong>{formData.name}</strong>. We've received your inquiry and will contact you at <strong>{formData.email}</strong>.
                            </p>
                            <button className="modal-read-more" onClick={() => setShowSuccess(false)}>Return</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Contact;