import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from 'react';
import { auth, db } from '../firebase';

const DEFAULT_ICON = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
const CLOUDINARY_CLOUD_NAME = "dvfykqznw"; 
const CLOUDINARY_UPLOAD_PRESET = "messages";

function SMessages() {
    const adminProfile = {
        fullName: 'Support Admin',
        role: 'Representative',
        avatarUrl: DEFAULT_ICON, 
        greeting: "Hello! How can we help you today?"
    };

    const [selectedAdmin, setSelectedAdmin] = useState(adminProfile);
    const [studentMessage, setStudentMessage] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const [imageFile, setImageFile] = useState(null); 
    const [uploading, setUploading] = useState(false); 
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null); 
    
    const user = auth.currentUser;
    const studentDocId = useMemo(() => user ? user.uid : null, [user]);

    // Live conversation listener
    useEffect(() => {
        if (!studentDocId || !user) return;

        const q = query(
            collection(db, "messages", studentDocId, "replies"),
            orderBy("timestamp", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setChatHistory(snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })));
        });

        return () => unsubscribe();
    }, [studentDocId, user]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory]);

    const uploadToCloudinary = async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
            { method: "POST", body: formData }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || "Cloudinary Upload Failed");
        }

        const data = await response.json();
        return data.secure_url; 
    };

    const handleSendToAdmin = async () => {
        if ((!studentMessage.trim() && !imageFile) || !user || !studentDocId) {
            alert("Please type a message or select an image.");
            return;
        }

        try {
            setUploading(true);
            let imageUrl = null;

            if (imageFile) {
                imageUrl = await uploadToCloudinary(imageFile);
            }

            let activeFirstName = "";
            let activeLastName = "";
            const activeEmail = user.email || "";

            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                activeFirstName = userData.firstName || userData.firstname || "";
                activeLastName = userData.lastName || userData.lastname || "";
            }

            if (!activeFirstName && !activeLastName && user.displayName) {
                const nameParts = user.displayName.split(" ");
                activeFirstName = nameParts[0] || "";
                activeLastName = nameParts.slice(1).join(" ") || "";
            }

            const finalStudentName = `${activeFirstName} ${activeLastName}`.trim() || activeEmail.split('@')[0] || "User";
            const mainDocRef = doc(db, "messages", studentDocId);

            await setDoc(mainDocRef, {
                firstName: activeFirstName,
                lastName: activeLastName,
                fullName: finalStudentName,
                email: activeEmail,
                avatarUrl: user.photoURL || DEFAULT_ICON,
                message: imageUrl ? "📷 Sent an image" : studentMessage, 
                timestamp: serverTimestamp(),
                unread: true 
            }, { merge: true });

            await addDoc(collection(db, "messages", studentDocId, "replies"), {
                text: studentMessage || "",
                imageUrl: imageUrl, 
                sender: "student",
                senderName: finalStudentName,
                senderId: user.uid,
                role: 'student',
                timestamp: serverTimestamp(),
            });

            setStudentMessage("");
            setImageFile(null);
            if (fileInputRef.current) fileInputRef.current.value = ""; 
        } catch (error) {
            console.error(error);
            alert("Failed to send message.");
        } finally {
            setUploading(false);
        }
    };

    if (!user) {
        return (
            <div className="messages-container login-prompt">
                <div className="login-overlay">
                    <div className="login-card">
                        <h2>Login Required</h2>
                        <p>Please log in to access support chat</p>
                        <button className="login-btn" onClick={() => window.location.href = '/login'}>Go to Login</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="messages-container">
            <div className="messages-sidebar">
                <div className="sidebar-header">
                    <h2>Support</h2>
                    <small style={{color: '#666'}}>You: <b>{user.displayName || user.email}</b></small>
                </div>
                <div className="conversation-list">
                    <div className={`convo-item ${selectedAdmin ? 'active' : ''}`} onClick={() => setSelectedAdmin(adminProfile)}>
                        <img src={adminProfile.avatarUrl} alt="" className="convo-avatar" />
                        <div className="convo-info">
                            <strong>{adminProfile.fullName}</strong>
                            <p className="convo-preview">Online</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="chat-main-area">
                {selectedAdmin && (
                    <>
                        <div className="chat-header">
                            <div className="chat-header-user">
                                <img src={adminProfile.avatarUrl} alt="" className="header-avatar" />
                                <div>
                                    <h4>{adminProfile.fullName}</h4>
                                    <span>{adminProfile.role}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="chat-history">
                            {chatHistory.map((msg) => {
                                const isYourMessage = msg.role === 'student' || msg.sender === 'student' || msg.senderId === user.uid;
                                const isClaimRequest = 
                                    isYourMessage && (
                                        msg.isClaimRequest === true ||
                                        msg.type === 'claim_request' ||
                                        Boolean(msg.claimRequestId) ||
                                        Boolean(msg.itemId) ||
                                        (msg.text && msg.text.toLowerCase().includes('claim'))
                                    );

                                return (
                                    <div key={msg.id} className={`msg-row ${isYourMessage ? 'msg-sent' : 'msg-received'}`}>
                                        {!isYourMessage && <img src={adminProfile.avatarUrl} alt="" className="msg-avatar" />}
                                        <div className={isYourMessage ? 'sent-container' : 'received-container'}>
                                            <div className={`msg-bubble ${isYourMessage ? 'sent' : 'received'}`}>
                                                {msg.imageUrl && (
                                                    <img src={msg.imageUrl} alt="" style={{ maxWidth: '200px', borderRadius: '8px', display: 'block', marginBottom: msg.text ? '8px' : '0' }} />
                                                )}
                                                {msg.text && <span>{msg.text}</span>}

                                                {/* READ-ONLY CLAIM STATUS DISPLAY FOR STUDENTS */}
                                                {isClaimRequest && (
                                                    <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 'bold' }}>
                                                        STATUS: {msg.claimStatus ? (
                                                            <span style={{
                                                                marginLeft: '5px',
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                                backgroundColor: msg.claimStatus === 'approved' ? '#28a745' : msg.claimStatus === 'rejected' ? '#dc3545' : '#ffc107',
                                                                color: msg.claimStatus === 'pending' || !msg.claimStatus ? '#000' : '#fff'
                                                            }}>
                                                                {msg.claimStatus.toUpperCase()}
                                                            </span>
                                                        ) : (
                                                            <span style={{ marginLeft: '5px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#ffc107', color: '#000' }}>
                                                                PENDING
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="msg-time">
                                                {msg.timestamp?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Sending...'}
                                                {isYourMessage && <span className="sender-tag">You</span>}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {chatHistory.length === 0 && (
                                <div className="msg-row msg-received">
                                    <img src={adminProfile.avatarUrl} alt="" className="msg-avatar" />
                                    <div className="received-container">
                                        <div className="msg-bubble">{adminProfile.greeting}</div>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        <div className="chat-input-section">
                            {imageFile && (
                                <div style={{ padding: '5px 10px', display: 'flex', alignItems: 'center', background: '#f0f0f0', gap: '10px' }}>
                                    <span style={{ fontSize: '12px' }}>📷 Attachment: {imageFile.name}</span>
                                    <button style={{ border: 'none', background: 'none', color: 'red', cursor: 'pointer' }} onClick={() => { setImageFile(null); if(fileInputRef.current) fileInputRef.current.value = ""; }}>✕</button>
                                </div>
                            )}

                            <div className="input-box-container">
                                <div className="input-with-sender" style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                    <label htmlFor="file-upload" style={{ cursor: 'pointer', padding: '0 10px', fontSize: '20px' }}>📎</label>
                                    <input 
                                        id="file-upload" 
                                        type="file" 
                                        accept="image/*" 
                                        ref={fileInputRef}
                                        style={{ display: 'none' }} 
                                        onChange={(e) => setImageFile(e.target.files[0])}
                                        disabled={uploading}
                                    />
                                    <textarea 
                                        placeholder={uploading ? "Uploading..." : "Type your message..."} 
                                        value={studentMessage}
                                        disabled={uploading}
                                        onChange={(e) => setStudentMessage(e.target.value)}
                                        onKeyDown={(e) => { 
                                            if(e.key === 'Enter' && !e.shiftKey) { 
                                                e.preventDefault(); 
                                                handleSendToAdmin(); 
                                            } 
                                        }}
                                    />
                                    <span className="sender-tag-right">{user.displayName || user.email?.split('@')[0] || 'User'}</span>
                                </div>
                                <button className="send-btn" onClick={handleSendToAdmin} disabled={uploading || (!studentMessage.trim() && !imageFile)}>
                                    {uploading ? "..." : "Send"}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default SMessages;