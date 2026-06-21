import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useState } from 'react';
import { db } from '../firebase';

function Contact() {
    const [formData, setFormData] = useState({
        fullName: '', company: '', phone: '', email: '', address: '', message: ''
    });
    const [isSending, setIsSending] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSending(true);
        try {
            await addDoc(collection(db, "messages"), { 
                ...formData, 
                timestamp: serverTimestamp() 
            });
            alert("Message sent!");
            setFormData({ fullName: '', company: '', phone: '', email: '', address: '', message: '' }); 
        } catch (error) {
            console.error("Error: ", error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="contact-page">
            <div className="contact-container">
                {/* Left Side: Info */}
                <div className="contact-info">
                    <h1>Contact Us</h1>
                    <p>For reports, inquiries, or assistance with lost and found items, 
feel free to contact us. We’re happy to help..</p>
                    <div className="contact-details">
                        <p>📧 info@oyfound.com</p>
                        <p>📞 Support: (+63) 0912 107 7309</p>
                    </div>
                </div>

                {/* Right Side: Form Card */}
                <div className="form-card">
                    <div className="form-header">
                        <h2>We'd love to hear from you!</h2>
                        <p>Let's get in touch</p>
                    </div>
                    <form className="contact-form" onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Full Name</label>
                                <input type="text" placeholder="Full Name" value={formData.fullName} required
                                    onChange={(e) => setFormData({...formData, fullName: e.target.value})} />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" placeholder="" value={formData.email} required
                                    onChange={(e) => setFormData({...formData, email: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Phone number</label>
                                <input type="text" placeholder="+63 0000-000-0000" value={formData.phone}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Address</label>
                            <input type="text" value={formData.address}
                                onChange={(e) => setFormData({...formData, address: e.target.value})} />
                        </div>

                        <div className="form-group">
                            <label>Your Message</label>
                            <textarea rows="4" placeholder="Type your message here" value={formData.message} required
                                onChange={(e) => setFormData({...formData, message: e.target.value})}></textarea>
                        </div>

                        <button type="submit" className="submit-button" disabled={isSending}>
                            {isSending ? "Sending..." : "Send Message"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Contact;