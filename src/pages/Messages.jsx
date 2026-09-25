import {
    addDoc,
    collection,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc
} from "firebase/firestore";
import { useEffect, useRef, useState } from 'react';
import { auth, db } from '../firebase';

const DEFAULT_ICON = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
const CLOUDINARY_CLOUD_NAME = "dvfykqznw"; 
const CLOUDINARY_UPLOAD_PRESET = "messages";

function Messages() {
    const [conversations, setConversations] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [chatHistory, setChatHistory] = useState([]);
    const [replyMessage, setReplyMessage] = useState("");
    const [imageFile, setImageFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const user = auth.currentUser;

    // 1. Listen for all active conversations
    useEffect(() => {
        const q = query(collection(db, "messages"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setConversations(list);
            
            // Retain active chat reference when data updates
            if (selectedChat) {
                const updatedCurrent = list.find(c => c.id === selectedChat.id);
                if (updatedCurrent) setSelectedChat(updatedCurrent);
            }
        });

        return () => unsubscribe();
    }, [selectedChat?.id]);

    // 2. Listen for messages inside selected conversation thread
    useEffect(() => {
        if (!selectedChat) return;

        const q = query(
            collection(db, "messages", selectedChat.id, "replies"),
            orderBy("timestamp", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setChatHistory(snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })));
        });

        // Clear unread flag when admin opens chat
        if (selectedChat.unread) {
            updateDoc(doc(db, "messages", selectedChat.id), { unread: false }).catch(console.error);
        }

        return () => unsubscribe();
    }, [selectedChat]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory]);

    // Cloudinary Helper
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

    // Admin Reply Handler
    const handleSendReply = async () => {
        if ((!replyMessage.trim() && !imageFile) || !selectedChat) return;

        try {
            setUploading(true);
            let imageUrl = null;

            if (imageFile) {
                imageUrl = await uploadToCloudinary(imageFile);
            }

            // Update main conversation document
            await setDoc(doc(db, "messages", selectedChat.id), {
                message: imageUrl ? "📷 Sent an image" : replyMessage,
                timestamp: serverTimestamp(),
                unread: false
            }, { merge: true });

            // Add new reply to subcollection
            await addDoc(collection(db, "messages", selectedChat.id, "replies"), {
                text: replyMessage || "",
                imageUrl: imageUrl,
                sender: "admin",
                senderName: user?.displayName || "Support Admin",
                senderId: user?.uid || "admin",
                role: 'admin',
                timestamp: serverTimestamp()
            });

            setReplyMessage("");
            setImageFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (error) {
            console.error("Error sending reply:", error);
            alert("Failed to send reply.");
        } finally {
            setUploading(false);
        }
    };

    // ADMIN-ONLY: Handle Claim Approval or Rejection
    const handleClaimStatus = async (msg, status) => {
        if (!selectedChat?.id) {
            alert("Error: No active chat selected.");
            return;
        }

        if (!msg?.id) {
            console.error("Missing message ID for claim update:", msg);
            alert("Error: Invalid message target.");
            return;
        }

        try {
            // Reference to the specific message inside the subcollection
            const replyDocRef = doc(db, "messages", selectedChat.id, "replies", msg.id);

            // 1. Update status on the target message
            await updateDoc(replyDocRef, {
                claimStatus: status,
                updatedAt: serverTimestamp()
            });

            const statusText = status === "approved" ? "Approved" : "Rejected";

            // 2. Post automated response to the chat thread
            await addDoc(collection(db, "messages", selectedChat.id, "replies"), {
                text: `Claim request has been ${statusText.toUpperCase()} by Support Admin.`,
                sender: "admin",
                senderName: "Support Admin",
                role: "admin",
                timestamp: serverTimestamp()
            });

            // 3. Send direct notification to student's notifications collection
            const recipientUserId = selectedChat.userId || selectedChat.senderId || selectedChat.id;

            if (recipientUserId) {
                await addDoc(collection(db, "notifications"), {
                    userId: recipientUserId,
                    itemName: msg.itemName || msg.text || "Claimed Item",
                    status: status, // "approved" or "rejected"
                    isRead: false,
                    timestamp: serverTimestamp()
                });
            }

        } catch (error) {
            console.error("Firestore Update Error Detailed:", error);
            alert(`Failed to update status: ${error.message || "Permission denied or network issue"}`);
        }
    };

    return (
        <div className="messages-container">
            {/* Sidebar Conversation List */}
            <div className="messages-sidebar">
                <div className="sidebar-header">
                    <h2>Conversations</h2>
                </div>
                <div className="conversation-list">
                    {conversations.map((convo) => (
                        <div 
                            key={convo.id} 
                            className={`convo-item ${selectedChat?.id === convo.id ? 'active' : ''} ${convo.unread ? 'unread' : ''}`}
                            onClick={() => setSelectedChat(convo)}
                        >
                            <img src={convo.avatarUrl || DEFAULT_ICON} alt="" className="convo-avatar" />
                            <div className="convo-info">
                                <strong>{convo.fullName || convo.email || "Student"}</strong>
                                <p className="convo-preview">{convo.message || "No messages yet"}</p>
                            </div>
                        </div>
                    ))}
                    {conversations.length === 0 && (
                        <p style={{ padding: '15px', color: '#888', textAlign: 'center' }}>No active conversations</p>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="chat-main-area">
                {selectedChat ? (
                    <>
                        <div className="chat-header">
                            <div className="chat-header-user">
                                <img src={selectedChat.avatarUrl || DEFAULT_ICON} alt="" className="header-avatar" />
                                <div>
                                    <h4>{selectedChat.fullName || "Student"}</h4>
                                    <span>{selectedChat.email}</span>
                                </div>
                            </div>
                        </div>

                        <div className="chat-history">
                            {chatHistory.map((msg) => {
                                const isAdminMessage = msg.role === 'admin' || msg.sender === 'admin';
                                const isClaimRequest = 
                                    !isAdminMessage && (
                                        msg.isClaimRequest === true ||
                                        msg.type === 'claim_request' ||
                                        Boolean(msg.claimRequestId) ||
                                        Boolean(msg.itemId) ||
                                        (msg.text && msg.text.toLowerCase().includes('claim'))
                                    );

                                return (
                                    <div key={msg.id} className={`msg-row ${isAdminMessage ? 'msg-sent' : 'msg-received'}`}>
                                        {!isAdminMessage && (
                                            <img src={selectedChat.avatarUrl || DEFAULT_ICON} alt="" className="msg-avatar" />
                                        )}
                                        <div className={isAdminMessage ? 'sent-container' : 'received-container'}>
                                            <div className={`msg-bubble ${isAdminMessage ? 'sent' : 'received'}`}>
                                                {msg.imageUrl && (
                                                    <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                                                        <img src={msg.imageUrl} alt="" style={{ maxWidth: '200px', borderRadius: '8px', display: 'block', marginBottom: msg.text ? '8px' : '0' }} />
                                                    </a>
                                                )}
                                                {msg.text && <span>{msg.text}</span>}

                                                {/* ADMIN APPROVE / REJECT ACTIONS */}
                                                {isClaimRequest && (
                                                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.3)' }}>
                                                        <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '6px' }}>
                                                            CLAIM STATUS: {msg.claimStatus ? msg.claimStatus.toUpperCase() : "PENDING"}
                                                        </div>

                                                        {!msg.claimStatus || msg.claimStatus === "pending" ? (
                                                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                                                <button 
                                                                    style={{ background: '#28a745', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                                                                    onClick={() => handleClaimStatus(msg, "approved")}
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button 
                                                                    style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                                                                    onClick={() => handleClaimStatus(msg, "rejected")}
                                                                >
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span style={{
                                                                display: 'inline-block',
                                                                padding: '2px 8px',
                                                                borderRadius: '4px',
                                                                fontSize: '11px',
                                                                fontWeight: 'bold',
                                                                color: '#fff',
                                                                backgroundColor: msg.claimStatus === 'approved' ? '#28a745' : '#dc3545'
                                                            }}>
                                                                {msg.claimStatus === 'approved' ? 'Approved' : 'Rejected'}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="msg-time">
                                                {msg.timestamp?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Sending...'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Controls */}
                        <div className="chat-input-section">
                            {imageFile && (
                                <div style={{ padding: '5px 10px', display: 'flex', alignItems: 'center', background: '#f0f0f0', gap: '10px' }}>
                                    <span style={{ fontSize: '12px' }}>📷 Attachment: {imageFile.name}</span>
                                    <button style={{ border: 'none', background: 'none', color: 'red', cursor: 'pointer' }} onClick={() => { setImageFile(null); if(fileInputRef.current) fileInputRef.current.value = ""; }}>✕</button>
                                </div>
                            )}

                            <div className="input-box-container">
                                <div className="input-with-sender" style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                    <label htmlFor="admin-file-upload" style={{ cursor: 'pointer', padding: '0 10px', fontSize: '20px' }}>📎</label>
                                    <input 
                                        id="admin-file-upload" 
                                        type="file" 
                                        accept="image/*" 
                                        ref={fileInputRef}
                                        style={{ display: 'none' }} 
                                        onChange={(e) => setImageFile(e.target.files[0])}
                                        disabled={uploading}
                                    />
                                    <textarea 
                                        placeholder={uploading ? "Uploading..." : "Type reply..."} 
                                        value={replyMessage}
                                        disabled={uploading}
                                        onChange={(e) => setReplyMessage(e.target.value)}
                                        onKeyDown={(e) => { 
                                            if(e.key === 'Enter' && !e.shiftKey) { 
                                                e.preventDefault(); 
                                                handleSendReply(); 
                                            } 
                                        }}
                                    />
                                </div>
                                <button className="send-btn" onClick={handleSendReply} disabled={uploading || (!replyMessage.trim() && !imageFile)}>
                                    {uploading ? "..." : "Reply"}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                        Select a conversation to start chatting
                    </div>
                )}
            </div>
        </div>
    );
}

export default Messages;