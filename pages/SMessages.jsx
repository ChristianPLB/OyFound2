import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from 'react';
import { auth, db } from '../firebase';

const DEFAULT_ICON = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

function SMessages() {
    const [selectedAdmin, setSelectedAdmin] = useState(null);
    const [studentMessage, setStudentMessage] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const chatEndRef = useRef(null);
    
    const user = auth.currentUser;
    const studentDocId = useMemo(() => user ? user.uid : null, [user]);

    const adminProfile = {
        fullName: 'Support Admin',
        role: 'Representative',
        avatarUrl: DEFAULT_ICON, 
        greeting: "Hello! How can we help you today?"
    };

    // Chat history listener
    useEffect(() => {
        if (!selectedAdmin || !studentDocId || !user) return;

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
    }, [selectedAdmin, studentDocId, user]);

    // Auto-scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory]);

    const handleSendToAdmin = async () => {
        if (!studentMessage.trim() || !user || !studentDocId) {
            alert("Please log in to send messages");
            return;
        }

        try {
            const mainDocRef = doc(db, "messages", studentDocId);

            await setDoc(mainDocRef, {
                fullName: user.displayName || user.email?.split('@')[0] || "User",
                email: user.email,
                avatarUrl: user.photoURL || DEFAULT_ICON,
                message: studentMessage,
                timestamp: serverTimestamp(),
                unread: true 
            }, { merge: true });

            await addDoc(collection(db, "messages", studentDocId, "replies"), {
                text: studentMessage,
                sender: "student",
                senderName: user.displayName || user.email?.split('@')[0] || "User",
                senderId: user.uid,
                role: 'student',
                timestamp: serverTimestamp(),
            });

            setStudentMessage("");
        } catch (error) {
            console.error("Error sending message: ", error);
            alert("Failed to send message. Please try again.");
        }
    };

    if (!user) {
        return (
            <div className="messages-container login-prompt">
                <div className="login-overlay">
                    <div className="login-card">
                        <h2>Login Required</h2>
                        <p>Please log in to access support chat</p>
                        <button className="login-btn" onClick={() => {
                            window.location.href = '/login';
                        }}>
                            Go to Login
                        </button>
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
                    <small style={{color: '#666'}}>
                        You: <b>{user.displayName || user.email}</b>
                    </small>
                </div>
                <div className="conversation-list">
                    <div className={`convo-item ${selectedAdmin ? 'active' : ''}`} 
                         onClick={() => setSelectedAdmin(adminProfile)}>
                        <img src={adminProfile.avatarUrl} alt="" className="convo-avatar" />
                        <div className="convo-info">
                            <strong>{adminProfile.fullName}</strong>
                            <p className="convo-preview">Online</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="chat-main-area">
                {selectedAdmin ? (
                    <>
                        {/* ✅ SAME HEADER as Admin */}
                        <div className="chat-header">
                            <div className="chat-header-user">
                                <img src={adminProfile.avatarUrl} alt="" className="header-avatar" />
                                <div>
                                    <h4>{adminProfile.fullName}</h4>
                                    <span>{adminProfile.role}</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* ✅ SAME CHAT HISTORY as Admin - Your messages LEFT, Admin RIGHT */}
                      <div className="chat-history">
  {chatHistory.map((msg) => {
    const isYourMessage = msg.role === 'student' || 
                         msg.sender === 'student' || 
                         msg.senderId === user.uid;
    
    return (
        <div key={msg.id} className={`msg-row ${isYourMessage ? 'msg-sent' : 'msg-received'}`}>
            {/* Avatar ONLY for Admin (received - LEFT) */}
            {!isYourMessage && (
                <img src={adminProfile.avatarUrl} alt="" className="msg-avatar" />
            )}
            <div className={isYourMessage ? 'sent-container' : 'received-container'}>
                <div className={`msg-bubble ${isYourMessage ? 'sent' : 'received'}`}>
                    {msg.text}
                </div>
                <span className="msg-time">
                    {msg.timestamp?.toDate()?.toLocaleTimeString([], { 
                        hour: '2-digit', minute: '2-digit' 
                    }) || 'Sending...'}
                    {isYourMessage ? <span className="sender-tag">You</span> : ''}
                </span>
            </div>
        </div>
    );
})}
    
    {/* Greeting - Admin (received style) */}
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
                        {/* ✅ SAME INPUT DESIGN as Admin */}
                        <div className="chat-input-section">
                            <div className="input-box-container">
                                <div className="input-with-sender">
                                    <textarea 
                                        placeholder="Type your message..." 
                                        value={studentMessage}
                                        onChange={(e) => setStudentMessage(e.target.value)}
                                        onKeyDown={(e) => { 
                                            if(e.key === 'Enter' && !e.shiftKey) { 
                                                e.preventDefault(); 
                                                handleSendToAdmin(); 
                                            } 
                                        }}
                                    />
                                    {/* ✅ Sender tag on RIGHT - IDENTICAL to Admin */}
                                    <span className="sender-tag-right">
                                        {user.displayName || user.email?.split('@')[0] || 'User'}
                                    </span>
                                </div>
                                <button 
                                    className="send-btn" 
                                    onClick={handleSendToAdmin}
                                    disabled={!studentMessage.trim()}
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="empty-chat-state">
                        <p>Select Support to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default SMessages;